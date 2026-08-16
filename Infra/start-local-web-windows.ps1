#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$CheckMySqlServiceOnly,
    [switch]$CheckPhpMyAdminOnly,
    [switch]$SkipPhpMyAdmin,
    [switch]$NoBrowser,
    [string]$RuntimeRoot,
    [ValidateRange(1, 65535)][int]$PhpMyAdminPort = 8081,
    [ValidateRange(1, 120)][int]$PhpMyAdminReadyTimeoutSeconds = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($RuntimeRoot)) {
    $RuntimeRoot = Join-Path $PSScriptRoot '.native-runtime'
}

function Resolve-RequiredFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Description was not found: $Path"
    }

    return (Resolve-Path -LiteralPath $Path).Path
}

function Resolve-CommandPath {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "$Name was not found in PATH. Install the required runtime and reopen PowerShell."
    }

    foreach ($propertyName in @('Source', 'Path', 'Definition')) {
        $property = $command.PSObject.Properties[$propertyName]
        if ($property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
            $candidate = [string]$property.Value
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                return (Resolve-Path -LiteralPath $candidate).Path
            }
        }
    }

    throw "Could not resolve the executable path for $Name."
}

function Find-MySqlService {
    $services = @(Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^MySQL\d+$' })

    return $services |
        Sort-Object @{ Expression = { if ($_.Status -eq 'Running') { 0 } else { 1 } } },
                    @{ Expression = { if ($_.Name -eq 'MySQL80') { 0 } else { 1 } } },
                    Name |
        Select-Object -First 1
}

function Test-LocalPortOpen {
    param([Parameter(Mandatory = $true)][int]$Port)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $asyncResult = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $asyncResult.AsyncWaitHandle.WaitOne(500)) {
            return $false
        }

        $client.EndConnect($asyncResult)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Test-HttpReady {
    param([Parameter(Mandatory = $true)][string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    }
    catch {
        return $false
    }
}

function ConvertTo-EncodedPowerShellCommand {
    param([Parameter(Mandatory = $true)][string]$Command)

    return [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Command))
}

function Get-ChildFailureMessage {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)]$Process,
        [Parameter(Mandatory = $true)][string]$StandardOutputLog,
        [Parameter(Mandatory = $true)][string]$StandardErrorLog
    )

    $details = @()
    foreach ($logPath in @($StandardErrorLog, $StandardOutputLog)) {
        $tail = @(Get-Content -LiteralPath $logPath -Tail 20 -ErrorAction SilentlyContinue)
        if ($tail.Count -gt 0) {
            $details += "${logPath}:`n$($tail -join "`n")"
        }
    }

    $message = "$Label exited before it became ready. Exit code $($Process.ExitCode). Logs: $StandardOutputLog ; $StandardErrorLog"
    if ($details.Count -gt 0) {
        $message += "`n$($details -join "`n")"
    }

    return $message
}

function Test-PhpMyAdminReady {
    param([Parameter(Mandatory = $true)][string]$Url)

    try {
        $response = Invoke-WebRequest -Uri "$Url/" -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match '(?i)phpmyadmin'
    }
    catch {
        return $false
    }
}

function Invoke-PhpMyAdminService {
    if ($SkipPhpMyAdmin) {
        Write-Output 'phpMyAdmin startup skipped.'
        return
    }

    $documentRoot = Join-Path $RuntimeRoot 'phpmyadmin-5.2.3'
    [void](Resolve-RequiredFile -Path (Join-Path $documentRoot 'index.php') -Description 'phpMyAdmin installation')
    $url = "http://127.0.0.1:$PhpMyAdminPort"
    if (Test-LocalPortOpen -Port $PhpMyAdminPort) {
        if (Test-PhpMyAdminReady -Url $url) {
            Write-Output "phpMyAdmin already running: $url"
            return
        }
        throw "Port $PhpMyAdminPort is already used by another application. Close it before running this script."
    }

    $php = Resolve-CommandPath -Name 'php.exe'
    $logRoot = Join-Path $RuntimeRoot 'logs'
    [void](New-Item -ItemType Directory -Path $logRoot -Force)
    $standardOutputLog = Join-Path $logRoot 'phpmyadmin.out.log'
    $standardErrorLog = Join-Path $logRoot 'phpmyadmin.err.log'
    $process = Start-Process -FilePath $php `
        -ArgumentList @('-S', "127.0.0.1:$PhpMyAdminPort", '-t', "`"$documentRoot`"") `
        -WorkingDirectory $documentRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $standardOutputLog `
        -RedirectStandardError $standardErrorLog `
        -PassThru
    Set-Content -LiteralPath (Join-Path $RuntimeRoot 'phpmyadmin.pid') -Value $process.Id -Encoding ASCII

    $deadline = [DateTime]::UtcNow.AddSeconds($PhpMyAdminReadyTimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (Test-PhpMyAdminReady -Url $url) {
            Write-Output "phpMyAdmin ready: $url"
            return
        }
        if ($process.HasExited) {
            $detail = if (Test-Path -LiteralPath $standardErrorLog) { (Get-Content -LiteralPath $standardErrorLog -Raw).Trim() } else { '' }
            throw "phpMyAdmin exited before becoming ready. $detail Logs: $standardOutputLog ; $standardErrorLog"
        }
        Start-Sleep -Milliseconds 250
    }

    throw "phpMyAdmin did not become ready within $PhpMyAdminReadyTimeoutSeconds seconds. Logs: $standardOutputLog ; $standardErrorLog"
}

if ($CheckPhpMyAdminOnly) {
    Invoke-PhpMyAdminService
    return
}

$mysqlService = Find-MySqlService
if (-not $mysqlService) {
    throw 'No MySQL Server Windows service was found. Install MySQL Server first.'
}

if ($CheckMySqlServiceOnly) {
    Write-Output "MySQL service selected: $($mysqlService.Name) ($($mysqlService.Status))"
    return
}

$infraRoot = Split-Path -Parent $PSCommandPath
$projectRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $infraRoot)).Path
$backendRoot = Join-Path $projectRoot 'BE'
$frontendRoot = Join-Path $projectRoot 'FE\DEMO'

$artisan = Resolve-RequiredFile -Path (Join-Path $backendRoot 'artisan') -Description 'Laravel Artisan'
[void](Resolve-RequiredFile -Path (Join-Path $backendRoot '.env') -Description 'Backend .env')
[void](Resolve-RequiredFile -Path (Join-Path $frontendRoot 'package.json') -Description 'Frontend package.json')
[void](Resolve-RequiredFile -Path (Join-Path $frontendRoot '.env') -Description 'Frontend .env')
[void](Resolve-RequiredFile -Path (Join-Path $frontendRoot 'node_modules\vite\bin\vite.js') -Description 'Installed Vite dependency')

$phpExecutable = Resolve-CommandPath -Name 'php.exe'
$npmExecutable = Resolve-CommandPath -Name 'npm.cmd'

if ($mysqlService.Status -ne 'Running') {
    Write-Host "Starting $($mysqlService.Name)..." -ForegroundColor Yellow
    try {
        Start-Service -Name $mysqlService.Name
        (Get-Service -Name $mysqlService.Name).WaitForStatus('Running', [TimeSpan]::FromSeconds(20))
    }
    catch {
        throw "Could not start $($mysqlService.Name). Open PowerShell as Administrator once and start the service."
    }
}

Invoke-PhpMyAdminService

$backendUrl = 'http://127.0.0.1:8000/up'
$frontendUrl = 'http://127.0.0.1:5173/'
$backendReady = Test-HttpReady -Url $backendUrl
$frontendReady = Test-HttpReady -Url $frontendUrl

if (-not $backendReady -and (Test-LocalPortOpen -Port 8000)) {
    throw 'Port 8000 is already used by another application. Close it before running this script.'
}
if (-not $frontendReady -and (Test-LocalPortOpen -Port 5173)) {
    throw 'Port 5173 is already used by another application. Close it before running this script.'
}

$backendProcess = $null
$frontendProcess = $null
$logRoot = Join-Path ([IO.Path]::GetTempPath()) 'seongon-lms-local-web'
[void](New-Item -ItemType Directory -Path $logRoot -Force)
$runId = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), $PID
$backendStandardOutputLog = Join-Path $logRoot "backend-$runId.out.log"
$backendStandardErrorLog = Join-Path $logRoot "backend-$runId.err.log"
$frontendStandardOutputLog = Join-Path $logRoot "frontend-$runId.out.log"
$frontendStandardErrorLog = Join-Path $logRoot "frontend-$runId.err.log"

if (-not $backendReady) {
    $escapedBackendRoot = $backendRoot.Replace("'", "''")
    $escapedPhp = $phpExecutable.Replace("'", "''")
    $backendCommand = "Set-Location -LiteralPath '$escapedBackendRoot'; & '$escapedPhp' artisan serve --host=127.0.0.1 --port=8000; exit `$LASTEXITCODE"
    $backendEncoded = ConvertTo-EncodedPowerShellCommand -Command $backendCommand
    $backendProcess = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $backendEncoded
    ) -WindowStyle Hidden -RedirectStandardOutput $backendStandardOutputLog -RedirectStandardError $backendStandardErrorLog -PassThru
    Write-Host "Backend process started (PID $($backendProcess.Id)). Logs: $backendStandardOutputLog ; $backendStandardErrorLog" -ForegroundColor Cyan
}

if (-not $frontendReady) {
    $escapedFrontendRoot = $frontendRoot.Replace("'", "''")
    $escapedNpm = $npmExecutable.Replace("'", "''")
    $frontendCommand = "Set-Location -LiteralPath '$escapedFrontendRoot'; & '$escapedNpm' run dev -- --host 127.0.0.1 --port 5173; exit `$LASTEXITCODE"
    $frontendEncoded = ConvertTo-EncodedPowerShellCommand -Command $frontendCommand
    $frontendProcess = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $frontendEncoded
    ) -WindowStyle Hidden -RedirectStandardOutput $frontendStandardOutputLog -RedirectStandardError $frontendStandardErrorLog -PassThru
    Write-Host "Frontend process started (PID $($frontendProcess.Id)). Logs: $frontendStandardOutputLog ; $frontendStandardErrorLog" -ForegroundColor Cyan
}

$deadline = [DateTime]::UtcNow.AddSeconds(60)
do {
    $backendReady = Test-HttpReady -Url $backendUrl
    $frontendReady = Test-HttpReady -Url $frontendUrl

    if ($backendReady -and $frontendReady) {
        break
    }

    if ($backendProcess -and $backendProcess.HasExited) {
        throw (Get-ChildFailureMessage -Label 'Backend' -Process $backendProcess -StandardOutputLog $backendStandardOutputLog -StandardErrorLog $backendStandardErrorLog)
    }
    if ($frontendProcess -and $frontendProcess.HasExited) {
        throw (Get-ChildFailureMessage -Label 'Frontend' -Process $frontendProcess -StandardOutputLog $frontendStandardOutputLog -StandardErrorLog $frontendStandardErrorLog)
    }

    Start-Sleep -Seconds 1
} while ([DateTime]::UtcNow -lt $deadline)

if (-not $backendReady -or -not $frontendReady) {
    throw "Local web did not become ready within 60 seconds. Logs: $backendStandardOutputLog ; $backendStandardErrorLog ; $frontendStandardOutputLog ; $frontendStandardErrorLog"
}

Write-Host 'Backend ready: http://127.0.0.1:8000' -ForegroundColor Green
Write-Host 'Frontend ready: http://localhost:5173' -ForegroundColor Green
if (-not $SkipPhpMyAdmin) {
    Write-Host 'phpMyAdmin ready: http://127.0.0.1:8081' -ForegroundColor Green
}
if (-not $NoBrowser) {
    Start-Process 'http://localhost:5173'
}

Write-Host 'Local services run as hidden background processes. Stop only the PIDs printed above when you want to stop the local web.' -ForegroundColor Yellow
