#Requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$runnerPath = Join-Path $projectRoot 'Infra\run-native-windows.ps1'
$fixtureRoot = Join-Path $env:TEMP ('seongon-native-runner-test-' + [guid]::NewGuid().ToString('N'))

function Get-TestPort {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
    try {
        $listener.Start()
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    }
    finally {
        $listener.Stop()
    }
}

$backendPort = Get-TestPort
$frontendPort = Get-TestPort

function Assert-True {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not $Condition) {
        throw "ASSERTION FAILED: $Message"
    }
}

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $parent = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    [System.IO.File]::WriteAllText($Path, $Content, (New-Object System.Text.UTF8Encoding($false)))
}

function Invoke-Runner {
    param([hashtable]$RunnerParameters)

    try {
        $output = & $runnerPath @RunnerParameters 2>&1
    }
    catch {
        throw "Runner threw: $($_.Exception.Message)"
    }
    $exitCode = $LASTEXITCODE
    if ($null -ne $exitCode -and $exitCode -ne 0) {
        throw "Runner failed with exit code ${exitCode}:`n$($output -join [Environment]::NewLine)"
    }

    return ($output -join [Environment]::NewLine)
}

function Invoke-RunnerFailure {
    param(
        [Parameter(Mandatory = $true)][hashtable]$RunnerParameters,
        [Parameter(Mandatory = $true)][string]$ExpectedMessage
    )

    try {
        & $runnerPath @RunnerParameters | Out-Null
        throw "Runner unexpectedly succeeded; expected: $ExpectedMessage"
    }
    catch {
        Assert-True ($_.Exception.Message -match [regex]::Escape($ExpectedMessage)) "runner failure must explain: $ExpectedMessage"
    }
}

function Get-ProcessIdFromRecord {
    param([string]$Path)
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json).pid
}

try {
    Assert-True (Test-Path -LiteralPath $runnerPath) 'runner file must exist before behavioral tests run'
    [scriptblock]::Create((Get-Content -LiteralPath $runnerPath -Raw)) | Out-Null
    [scriptblock]::Create((Get-Content -LiteralPath $PSCommandPath -Raw)) | Out-Null

    $runnerText = Get-Content -LiteralPath $runnerPath -Raw
    Assert-True ($runnerText -notmatch 'taskkill\s+/IM') 'runner must not terminate processes by image name'
    Assert-True ($runnerText -notmatch 'Stop-Process\s+-Name') 'runner must not stop processes by name'
    Assert-True ($runnerText -notmatch 'migrate:fresh') 'runner must not reset databases'
    Assert-True ($runnerText -notmatch 'composer\s+update') 'runner must not update Composer dependencies'
    Assert-True ($runnerText -notmatch 'npm\s+audit\s+fix') 'runner must not mutate npm dependencies through audit fixes'

    New-Item -ItemType Directory -Path $fixtureRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $fixtureRoot 'Infra') -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot 'Infra\run-native-windows.ps1') -Destination (Join-Path $fixtureRoot 'Infra\run-native-windows.ps1') -Force

    Write-Utf8File -Path (Join-Path $fixtureRoot 'BE\.env') -Content @'
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=seongon_lms
DB_USERNAME=seongon
DB_PASSWORD=seongon_test_password
'@
    Write-Utf8File -Path (Join-Path $fixtureRoot 'BE\composer.lock') -Content '{"packages":[]}'
    Write-Utf8File -Path (Join-Path $fixtureRoot 'BE\vendor\autoload.php') -Content '<?php'
    Write-Utf8File -Path (Join-Path $fixtureRoot 'BE\router.php') -Content @'
<?php
if ($_SERVER['REQUEST_URI'] === '/up') { http_response_code(200); echo 'up'; return true; }
echo 'backend';
'@
    Write-Utf8File -Path (Join-Path $fixtureRoot 'BE\artisan') -Content @'
<?php
if (!in_array('serve', $argv, true)) { exit(0); }
$host = '127.0.0.1';
$port = 8000;
foreach ($argv as $argument) {
    if (strpos($argument, '--host=') === 0) { $host = substr($argument, 7); }
    if (strpos($argument, '--port=') === 0) { $port = (int)substr($argument, 7); }
}
$server = stream_socket_server('tcp://' . $host . ':' . $port, $errno, $error);
if ($server === false) { fwrite(STDERR, $error); exit(1); }
while (true) {
    $client = @stream_socket_accept($server, 1);
    if ($client === false) { continue; }
    $request = fread($client, 4096);
    $body = (strpos($request, 'GET /up ') !== false) ? 'up' : 'backend';
    fwrite($client, "HTTP/1.1 200 OK\r\nContent-Length: " . strlen($body) . "\r\nConnection: close\r\n\r\n" . $body);
    fclose($client);
}
'@
    Write-Utf8File -Path (Join-Path $fixtureRoot 'FE\DEMO\package-lock.json') -Content '{"lockfileVersion":3}'
    Write-Utf8File -Path (Join-Path $fixtureRoot 'FE\DEMO\package.json') -Content '{"scripts":{"build":"node build.js"}}'
    Write-Utf8File -Path (Join-Path $fixtureRoot 'FE\DEMO\index.html') -Content '<!doctype html><title>fixture</title>'
    Write-Utf8File -Path (Join-Path $fixtureRoot 'FE\DEMO\src\main.js') -Content 'console.log("fixture")'
    Write-Utf8File -Path (Join-Path $fixtureRoot 'FE\DEMO\vite-fixture.js') -Content @'
const http = require('http');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
const host = args[args.indexOf('--host') + 1];
http.createServer((request, response) => { response.writeHead(200, {'Content-Type':'text/plain'}); response.end('frontend'); }).listen(port, host);
'@
    $fixtureTools = Join-Path $fixtureRoot 'tools'
    Write-Utf8File -Path (Join-Path $fixtureTools 'composer.cmd') -Content "@echo off`r`nexit /b 0"
    Write-Utf8File -Path (Join-Path $fixtureTools 'npm.cmd') -Content @'
@echo off
if /I "%1"=="ci" (
  if not exist "node_modules\vite\bin" mkdir "node_modules\vite\bin"
  copy /Y "%~dp0..\FE\DEMO\vite-fixture.js" "node_modules\vite\bin\vite.js" >nul
)
if /I "%1"=="run" if /I "%2"=="build" (
  if not exist "dist" mkdir "dist"
  >"dist\index.html" echo fixture build
)
exit /b 0
'@
    $originalPath = $env:PATH
    $env:PATH = "$fixtureTools;$env:PATH"

    $runtimeRoot = Join-Path $fixtureRoot 'Infra\.native-runtime'
    $commonParameters = @{
        NoBrowser = $true
        ProjectRoot = $fixtureRoot
        BackendPort = $backendPort
        FrontendPort = $frontendPort
        SkipMySqlCheck = $true
    }

    $statusParameters = $commonParameters.Clone()
    $statusParameters.Action = 'status'
    $statusParameters.Remove('SkipMySqlCheck')
    $stoppedOutput = Invoke-Runner -RunnerParameters $statusParameters
    Assert-True ($stoppedOutput -match 'stopped') 'stopped status must be successful and report stopped'
    Assert-True (-not (Test-Path -LiteralPath $runtimeRoot)) 'status must remain read-only when runtime metadata does not exist'

    $manualVitePath = Join-Path $fixtureRoot 'FE\DEMO\node_modules\vite\bin\vite.js'
    New-Item -ItemType Directory -Path (Split-Path -Parent $manualVitePath) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $fixtureRoot 'FE\DEMO\vite-fixture.js') -Destination $manualVitePath -Force
    $skipParameters = $commonParameters.Clone()
    $skipParameters.Action = 'start'
    $skipParameters.SkipPreparationCommands = $true
    Invoke-RunnerFailure -RunnerParameters $skipParameters -ExpectedMessage 'only permitted for the explicit native runner test fixture'
    [ordered]@{ kind = 'native-runner-test-fixture'; projectRoot = $fixtureRoot } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $fixtureRoot 'Infra\.native-runtime-test-fixture.json') -Encoding UTF8
    Invoke-Runner -RunnerParameters $skipParameters | Out-Null
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot 'composer-lock.sha256'))) 'skipped preparation must not write a Composer success stamp'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot 'frontend-fingerprint.sha256'))) 'skipped preparation must not write a frontend success stamp'
    $stopParameters = $commonParameters.Clone()
    $stopParameters.Action = 'stop'
    Invoke-Runner -RunnerParameters $stopParameters | Out-Null
    Remove-Item -LiteralPath (Join-Path $fixtureRoot 'FE\DEMO\node_modules') -Recurse -Force

    $startParameters = $commonParameters.Clone()
    $startParameters.Action = 'start'
    Invoke-Runner -RunnerParameters $startParameters | Out-Null
    Assert-True (Test-Path -LiteralPath $manualVitePath) 'fresh checkout start must let npm ci create the Vite entrypoint before resolving it'
    $backendPidPath = Join-Path $runtimeRoot 'backend.pid.json'
    $frontendPidPath = Join-Path $runtimeRoot 'frontend.pid.json'
    $verifiedPath = Join-Path $runtimeRoot 'native-verified.json'
    Assert-True (Test-Path -LiteralPath $backendPidPath) 'start must write backend PID JSON'
    Assert-True (Test-Path -LiteralPath $frontendPidPath) 'start must write frontend PID JSON'
    Assert-True (Test-Path -LiteralPath $verifiedPath) 'start must write readiness verification marker'
    Assert-True ((Invoke-Runner -RunnerParameters $statusParameters) -match 'healthy') 'status must report healthy owned processes'

    $firstBackendPid = Get-ProcessIdFromRecord -Path $backendPidPath
    $firstFrontendPid = Get-ProcessIdFromRecord -Path $frontendPidPath
    $firstComposerFingerprint = Get-Content -LiteralPath (Join-Path $runtimeRoot 'composer-lock.sha256') -Raw
    $firstFingerprint = Get-Content -LiteralPath (Join-Path $runtimeRoot 'frontend-fingerprint.sha256') -Raw
    Invoke-Runner -RunnerParameters $startParameters | Out-Null
    Assert-True ($firstBackendPid -eq (Get-ProcessIdFromRecord -Path $backendPidPath)) 'healthy start must not create a duplicate backend process'
    Assert-True ($firstFrontendPid -eq (Get-ProcessIdFromRecord -Path $frontendPidPath)) 'healthy start must not create a duplicate frontend process'
    Assert-True ($firstFingerprint -eq (Get-Content -LiteralPath (Join-Path $runtimeRoot 'frontend-fingerprint.sha256') -Raw)) 'unchanged frontend inputs must keep the fingerprint deterministic'
    Start-Sleep -Milliseconds 250
    Add-Content -LiteralPath (Join-Path $fixtureRoot 'BE\composer.lock') -Value ' '
    Add-Content -LiteralPath (Join-Path $fixtureRoot 'FE\DEMO\src\main.js') -Value "`nconsole.log('changed')"
    Invoke-Runner -RunnerParameters $commonParameters | Out-Null
    $secondBackendPid = Get-ProcessIdFromRecord -Path $backendPidPath
    $secondFrontendPid = Get-ProcessIdFromRecord -Path $frontendPidPath
    $secondComposerFingerprint = Get-Content -LiteralPath (Join-Path $runtimeRoot 'composer-lock.sha256') -Raw
    $secondFingerprint = Get-Content -LiteralPath (Join-Path $runtimeRoot 'frontend-fingerprint.sha256') -Raw
    Assert-True ($firstBackendPid -ne $secondBackendPid) 'default restart must replace the backend process'
    Assert-True ($firstFrontendPid -ne $secondFrontendPid) 'default restart must replace the frontend process'
    Assert-True ($firstComposerFingerprint -ne $secondComposerFingerprint) 'Composer lock edits must change the lock fingerprint'
    Assert-True ($firstFingerprint -ne $secondFingerprint) 'frontend source edits must change the deterministic frontend fingerprint'

    $unrelated = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile', '-Command', 'Start-Sleep -Seconds 30' -PassThru
    try {
        $originalBackendRecord = Get-Content -LiteralPath $backendPidPath -Raw
        @{ pid = $unrelated.Id; commandLine = 'unrelated-process' } | ConvertTo-Json | Set-Content -LiteralPath $backendPidPath -Encoding UTF8
        $stopParameters = $commonParameters.Clone()
        $stopParameters.Action = 'stop'
        Invoke-Runner -RunnerParameters $stopParameters | Out-Null
        Assert-True (-not (Test-Path -LiteralPath $backendPidPath)) 'mismatched PID record must be removed'
        Assert-True ($null -ne (Get-Process -Id $unrelated.Id -ErrorAction SilentlyContinue)) 'mismatched PID record must not terminate an unrelated process'
        Set-Content -LiteralPath $backendPidPath -Value $originalBackendRecord -Encoding UTF8
    }
    finally {
        Stop-Process -Id $unrelated.Id -Force -ErrorAction SilentlyContinue
    }

    Invoke-Runner -RunnerParameters $stopParameters | Out-Null
    Assert-True ($null -eq (Get-Process -Id $secondBackendPid -ErrorAction SilentlyContinue)) 'restored backend PID metadata must allow final cleanup to terminate the fixture backend'
    Assert-True (-not (Test-Path -LiteralPath $frontendPidPath)) 'stop must remove frontend PID metadata'
    Assert-True (-not (Test-Path -LiteralPath $verifiedPath)) 'stop must remove readiness verification marker'
    Assert-True (Test-Path -LiteralPath (Join-Path $runtimeRoot 'frontend-fingerprint.sha256')) 'stop must preserve preparation stamps'

    Write-Host 'PASS: native runner behavioral checks passed.'
}
finally {
    if ($null -ne $originalPath) {
        $env:PATH = $originalPath
    }
    if (Test-Path -LiteralPath $fixtureRoot) {
        $fixtureRuntime = Join-Path $fixtureRoot 'Infra\.native-runtime'
        foreach ($pidFile in @('backend.pid.json', 'frontend.pid.json')) {
            $path = Join-Path $fixtureRuntime $pidFile
            if (Test-Path -LiteralPath $path) {
                $recordPid = Get-ProcessIdFromRecord -Path $path
                Stop-Process -Id $recordPid -Force -ErrorAction SilentlyContinue
            }
        }
        Remove-Item -LiteralPath $fixtureRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
