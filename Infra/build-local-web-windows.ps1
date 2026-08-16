#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [switch]$SkipTests,
    [switch]$SkipDependencies,
    [switch]$SkipMigrations
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RequiredCommand {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "$Name was not found in PATH."
    }
    return $command.Source
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

function Invoke-BuildStep {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    Write-Host "`n== $Label ==" -ForegroundColor Cyan
    Push-Location -LiteralPath $WorkingDirectory
    try {
        & $Executable @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Stop-FrontendDevServerForDependencyRepair {
    param([Parameter(Mandatory = $true)][string]$FrontendRoot)

    $listener = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $listener) {
        return
    }

    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    $normalizedFrontendRoot = [IO.Path]::GetFullPath($FrontendRoot).TrimEnd('\')
    if (-not $process -or [string]$process.CommandLine -notmatch [regex]::Escape($normalizedFrontendRoot)) {
        throw 'Port 5173 is occupied by an application outside this frontend workspace. Stop it before repairing dependencies.'
    }

    Write-Host "Stopping workspace Vite process $($process.ProcessId) to repair locked dependencies..." -ForegroundColor Yellow
    Stop-Process -Id $process.ProcessId -Force
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        Start-Sleep -Milliseconds 250
        $stillListening = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
    } while ($stillListening -and [DateTime]::UtcNow -lt $deadline)
    if ($stillListening) {
        throw 'The workspace Vite server did not release port 5173 within 10 seconds.'
    }
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$backendRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'BE')).Path
$frontendRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'FE\DEMO')).Path
$artisan = Resolve-RequiredFile -Path (Join-Path $backendRoot 'artisan') -Description 'Laravel Artisan'
[void](Resolve-RequiredFile -Path (Join-Path $backendRoot 'composer.json') -Description 'Backend composer.json')
[void](Resolve-RequiredFile -Path (Join-Path $frontendRoot 'package.json') -Description 'Frontend package.json')
[void](Resolve-RequiredFile -Path (Join-Path $frontendRoot 'package-lock.json') -Description 'Frontend package-lock.json')

$php = Resolve-RequiredCommand -Name 'php.exe'
$composer = Resolve-RequiredCommand -Name 'composer.bat'
$npm = Resolve-RequiredCommand -Name 'npm.cmd'

Write-Output "Backend: $backendRoot"
Write-Output "Frontend: $frontendRoot"

if ($CheckOnly) {
    [void](Resolve-RequiredFile -Path (Join-Path $backendRoot 'vendor\autoload.php') -Description 'Composer dependencies')
    [void](Resolve-RequiredFile -Path (Join-Path $frontendRoot 'node_modules\vite\bin\vite.js') -Description 'Frontend dependencies')
    Write-Output 'Dependencies: ready'
    return
}

if (-not $SkipDependencies) {
    if (-not (Test-Path -LiteralPath (Join-Path $backendRoot 'vendor\autoload.php') -PathType Leaf)) {
        Invoke-BuildStep -Label 'Install backend dependencies' -WorkingDirectory $backendRoot -Executable $composer -Arguments @('install', '--no-interaction', '--prefer-dist')
    }
    else {
        Write-Host 'Backend dependencies: ready' -ForegroundColor DarkGreen
    }

    if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot 'node_modules\vite\bin\vite.js') -PathType Leaf)) {
        Stop-FrontendDevServerForDependencyRepair -FrontendRoot $frontendRoot
        Invoke-BuildStep -Label 'Install frontend dependencies' -WorkingDirectory $frontendRoot -Executable $npm -Arguments @('ci', '--no-audit', '--no-fund')
    }
    else {
        Write-Host 'Frontend dependencies: ready' -ForegroundColor DarkGreen
    }
}

if (-not $SkipMigrations) {
    Invoke-BuildStep -Label 'Run database migrations' -WorkingDirectory $backendRoot -Executable $php -Arguments @($artisan, 'migrate', '--force')
}

if (-not $SkipTests) {
    Invoke-BuildStep -Label 'Run backend tests' -WorkingDirectory $backendRoot -Executable $php -Arguments @($artisan, 'test')
    Invoke-BuildStep -Label 'Run frontend tests' -WorkingDirectory $frontendRoot -Executable $npm -Arguments @('test')
}

Invoke-BuildStep -Label 'Build frontend production assets' -WorkingDirectory $frontendRoot -Executable $npm -Arguments @('run', 'build')
Write-Host "`nLocal web build completed." -ForegroundColor Green
