#Requires -Version 5.1

[CmdletBinding()]
param(
    [string]$RuntimeRoot = (Join-Path $PSScriptRoot '.native-runtime'),
    [string]$PhpExecutable,
    [ValidateRange(1, 65535)][int]$Port = 8081,
    [ValidateRange(1, 120)][int]$ReadyTimeoutSeconds = 20,
    [switch]$NoBrowser,
    [switch]$CheckOnly,
    [switch]$SkipSetupCheck,
    [switch]$SkipMySqlCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$documentRoot = Join-Path $RuntimeRoot 'phpmyadmin-5.2.3'
$url = "http://127.0.0.1:$Port"
$pidPath = Join-Path $RuntimeRoot 'phpmyadmin.pid'
$logRoot = Join-Path $RuntimeRoot 'logs'
$stdoutLog = Join-Path $logRoot 'phpmyadmin.out.log'
$stderrLog = Join-Path $logRoot 'phpmyadmin.err.log'

function Resolve-PhpExecutable {
    if ($PhpExecutable) {
        if (-not (Test-Path -LiteralPath $PhpExecutable -PathType Leaf)) {
            throw "PHP executable was not found: $PhpExecutable"
        }
        return (Resolve-Path -LiteralPath $PhpExecutable).Path
    }

    $command = Get-Command php -ErrorAction SilentlyContinue
    if (-not $command) {
        throw 'PHP was not found in PATH. Run setup-phpmyadmin-windows.bat first.'
    }
    return $command.Source
}

function Test-TcpPortOpen {
    $client = New-Object Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(400)) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Test-PhpMyAdminEndpoint {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "$url/" -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match '(?i)phpmyadmin'
    }
    catch {
        return $false
    }
}

function Ensure-MySqlRunning {
    $services = @(Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^MySQL\d+$' })
    if ($services.Count -eq 0) {
        throw 'No MySQL Windows service was found. Install MySQL Server first.'
    }
    $service = $services |
        Sort-Object @{ Expression = { if ($_.Status -eq 'Running') { 0 } else { 1 } } },
                    @{ Expression = { if ($_.Name -eq 'MySQL80') { 0 } else { 1 } } },
                    Name |
        Select-Object -First 1
    if ($service.Status -ne 'Running') {
        Write-Host "Starting MySQL service $($service.Name)..."
        Start-Service -Name $service.Name
        $service.WaitForStatus('Running', [TimeSpan]::FromSeconds(20))
    }
    Write-Host "MySQL ready: $($service.Name)"
}

$php = Resolve-PhpExecutable
if (-not $SkipSetupCheck) {
    $setupScript = Join-Path $PSScriptRoot 'setup-phpmyadmin-windows.ps1'
    if (-not (Test-Path -LiteralPath $setupScript -PathType Leaf)) {
        throw "phpMyAdmin setup script is missing: $setupScript"
    }

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setupScript `
        -RuntimeRoot $RuntimeRoot `
        -PhpExecutable $php `
        -CheckOnly *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'phpMyAdmin is not installed; running one-time setup...'
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setupScript `
            -RuntimeRoot $RuntimeRoot `
            -PhpExecutable $php
        if ($LASTEXITCODE -ne 0) {
            throw "phpMyAdmin setup failed with exit code $LASTEXITCODE."
        }
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $documentRoot 'index.php') -PathType Leaf)) {
    throw "phpMyAdmin application root is missing: $documentRoot"
}
if (-not $SkipMySqlCheck) {
    Ensure-MySqlRunning
}

if (Test-TcpPortOpen) {
    if (Test-PhpMyAdminEndpoint) {
        Write-Output "phpMyAdmin already running: $url"
        if (-not $NoBrowser -and -not $CheckOnly) {
            Start-Process $url
        }
        exit 0
    }
    throw "Port $Port is already used by another application. Close it or pass a different -Port value."
}

if ($CheckOnly) {
    Write-Output "phpMyAdmin installation is ready and port $Port is available."
    exit 0
}

New-Item -ItemType Directory -Path $RuntimeRoot,$logRoot -Force | Out-Null
if (Test-Path -LiteralPath $stdoutLog) { Remove-Item -LiteralPath $stdoutLog -Force }
if (Test-Path -LiteralPath $stderrLog) { Remove-Item -LiteralPath $stderrLog -Force }

$process = Start-Process -FilePath $php `
    -ArgumentList @('-S', "127.0.0.1:$Port", '-t', "`"$documentRoot`"") `
    -WorkingDirectory $documentRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru
Set-Content -LiteralPath $pidPath -Value $process.Id -Encoding ASCII

$deadline = [DateTime]::UtcNow.AddSeconds($ReadyTimeoutSeconds)
while ([DateTime]::UtcNow -lt $deadline) {
    if ($process.HasExited) {
        $detail = if (Test-Path -LiteralPath $stderrLog) { (Get-Content -Raw -LiteralPath $stderrLog).Trim() } else { '' }
        throw "phpMyAdmin process exited with code $($process.ExitCode). $detail"
    }
    if (Test-PhpMyAdminEndpoint) {
        Write-Output "phpMyAdmin ready: $url"
        if (-not $NoBrowser) {
            Start-Process $url
        }
        exit 0
    }
    Start-Sleep -Milliseconds 200
}

Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
throw "phpMyAdmin did not become ready within $ReadyTimeoutSeconds seconds. See $stderrLog"
