#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [switch]$SkipTests,
    [switch]$SkipDependencies,
    [switch]$SkipMigrations,
    [switch]$PreparePhpMyAdminOnly,
    [switch]$ForcePhpMyAdmin,
    [string]$RuntimeRoot,
    [string]$PhpExecutable,
    [string]$PhpMyAdminArchiveSource = 'https://files.phpmyadmin.net/phpMyAdmin/5.2.3/phpMyAdmin-5.2.3-all-languages.zip',
    [string]$PhpMyAdminChecksumSource = 'https://files.phpmyadmin.net/phpMyAdmin/5.2.3/phpMyAdmin-5.2.3-all-languages.zip.sha256'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($RuntimeRoot)) {
    $RuntimeRoot = Join-Path $PSScriptRoot '.native-runtime'
}

$phpMyAdminVersion = '5.2.3'
$phpMyAdminInstallRoot = Join-Path $RuntimeRoot "phpmyadmin-$phpMyAdminVersion"

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

function Resolve-PhpExecutable {
    if (-not [string]::IsNullOrWhiteSpace($PhpExecutable)) {
        if (-not (Test-Path -LiteralPath $PhpExecutable -PathType Leaf)) {
            throw "PHP executable was not found: $PhpExecutable"
        }
        return (Resolve-Path -LiteralPath $PhpExecutable).Path
    }

    return Resolve-RequiredCommand -Name 'php.exe'
}

function Test-PhpModule {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string]$Module
    )

    $modules = @(& $Executable -m 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect PHP modules with $Executable."
    }
    return [bool]($modules | Where-Object { $_.Trim() -ieq $Module })
}

function Assert-PhpMyAdminRequirements {
    param([Parameter(Mandatory = $true)][string]$Executable)

    $versionText = (& $Executable -r 'echo PHP_VERSION;' 2>&1 | Out-String).Trim()
    $parsedVersion = New-Object Version
    if ($LASTEXITCODE -ne 0 -or -not [Version]::TryParse($versionText, [ref]$parsedVersion)) {
        throw "Unable to read the PHP version from $Executable."
    }
    if ($parsedVersion -lt [Version]'8.2.0') {
        throw "The local LMS requires PHP 8.2 or newer; found $versionText."
    }
    if (-not (Test-PhpModule -Executable $Executable -Module 'mysqli')) {
        throw 'The PHP mysqli extension is disabled. Enable extension=mysqli in php.ini before building the local web.'
    }
}

function Copy-PhpMyAdminPackageSource {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    if ([Uri]::IsWellFormedUriString($Source, [UriKind]::Absolute) -and $Source -match '^https://') {
        Invoke-WebRequest -UseBasicParsing -Uri $Source -OutFile $Destination
        return
    }
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "phpMyAdmin package source was not found: $Source"
    }
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Assert-PhpMyAdminInstallTargetIsSafe {
    $resolvedRuntime = [IO.Path]::GetFullPath($RuntimeRoot).TrimEnd('\') + '\'
    $resolvedInstall = [IO.Path]::GetFullPath($phpMyAdminInstallRoot)
    if (-not $resolvedInstall.StartsWith($resolvedRuntime, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe phpMyAdmin install target: $resolvedInstall"
    }
}

function Write-PhpMyAdminConfig {
    param([Parameter(Mandatory = $true)][string]$DestinationRoot)

    $randomBytes = New-Object byte[] 24
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $randomGenerator.GetBytes($randomBytes)
    }
    finally {
        $randomGenerator.Dispose()
    }
    $blowfishSecret = [Convert]::ToBase64String($randomBytes)
    $tempDirectory = (Join-Path $RuntimeRoot 'phpmyadmin-tmp').Replace('\', '/')
    New-Item -ItemType Directory -Path $tempDirectory -Force | Out-Null

    $config = @"
<?php
`$cfg['blowfish_secret'] = '$blowfishSecret';
`$i = 0;
++`$i;
`$cfg['Servers'][`$i]['auth_type'] = 'cookie';
`$cfg['Servers'][`$i]['host'] = '127.0.0.1';
`$cfg['Servers'][`$i]['port'] = '3306';
`$cfg['Servers'][`$i]['compress'] = false;
`$cfg['Servers'][`$i]['AllowNoPassword'] = true;
`$cfg['DefaultLang'] = 'vi';
`$cfg['TempDir'] = '$tempDirectory';
"@
    Set-Content -LiteralPath (Join-Path $DestinationRoot 'config.inc.php') -Value $config -Encoding UTF8
}

function Assert-PhpMyAdminReady {
    [void](Resolve-RequiredFile -Path (Join-Path $phpMyAdminInstallRoot 'index.php') -Description 'phpMyAdmin installation')
    [void](Resolve-RequiredFile -Path (Join-Path $phpMyAdminInstallRoot 'vendor\autoload.php') -Description 'phpMyAdmin Composer autoloader')
    [void](Resolve-RequiredFile -Path (Join-Path $phpMyAdminInstallRoot 'vendor\symfony\polyfill-php80\bootstrap.php') -Description 'phpMyAdmin Symfony polyfill')
    [void](Resolve-RequiredFile -Path (Join-Path $phpMyAdminInstallRoot 'config.inc.php') -Description 'phpMyAdmin configuration')
}

function Test-PhpMyAdminCoreReady {
    $requiredFiles = @(
        'index.php',
        'vendor\autoload.php',
        'vendor\symfony\polyfill-php80\bootstrap.php'
    )
    foreach ($relativePath in $requiredFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $phpMyAdminInstallRoot $relativePath) -PathType Leaf)) {
            return $false
        }
    }
    return $true
}

function Install-PhpMyAdmin {
    param([Parameter(Mandatory = $true)][string]$Executable)

    Assert-PhpMyAdminRequirements -Executable $Executable
    if ((Test-PhpMyAdminCoreReady) -and -not $ForcePhpMyAdmin) {
        if (-not (Test-Path -LiteralPath (Join-Path $phpMyAdminInstallRoot 'config.inc.php') -PathType Leaf)) {
            Write-PhpMyAdminConfig -DestinationRoot $phpMyAdminInstallRoot
        }
        Assert-PhpMyAdminReady
        Write-Output "phpMyAdmin $phpMyAdminVersion is ready: $phpMyAdminInstallRoot"
        return
    }

    Assert-PhpMyAdminInstallTargetIsSafe
    New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
    # Keep extraction outside the repository so nested vendor paths stay below
    # the legacy Windows MAX_PATH limit used by Windows PowerShell 5.1.
    $workRoot = Join-Path ([IO.Path]::GetTempPath()) ("seongon-pma-{0}" -f [guid]::NewGuid().ToString('N'))
    $archivePath = Join-Path $workRoot 'phpmyadmin.zip'
    $checksumPath = Join-Path $workRoot 'phpmyadmin.zip.sha256'
    $extractRoot = Join-Path $workRoot 'extract'

    try {
        New-Item -ItemType Directory -Path $workRoot,$extractRoot -Force | Out-Null
        Write-Host 'Downloading phpMyAdmin package and SHA-256 checksum...' -ForegroundColor Cyan
        Copy-PhpMyAdminPackageSource -Source $PhpMyAdminArchiveSource -Destination $archivePath
        Copy-PhpMyAdminPackageSource -Source $PhpMyAdminChecksumSource -Destination $checksumPath

        $checksumText = Get-Content -Raw -LiteralPath $checksumPath
        $expectedMatch = [regex]::Match($checksumText, '(?i)\b[0-9a-f]{64}\b')
        if (-not $expectedMatch.Success) {
            throw 'The phpMyAdmin checksum file does not contain a SHA-256 hash.'
        }
        $expectedHash = $expectedMatch.Value.ToLowerInvariant()
        $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToLowerInvariant()
        if ($actualHash -ne $expectedHash) {
            throw "phpMyAdmin SHA-256 mismatch. Expected $expectedHash but received $actualHash."
        }

        Expand-Archive -LiteralPath $archivePath -DestinationPath $extractRoot -Force
        $packageRoot = Get-ChildItem -LiteralPath $extractRoot -Directory |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'index.php') -PathType Leaf } |
            Select-Object -First 1
        if (-not $packageRoot) {
            throw 'The verified archive does not contain a phpMyAdmin application root.'
        }

        Write-PhpMyAdminConfig -DestinationRoot $packageRoot.FullName
        [void](Resolve-RequiredFile -Path (Join-Path $packageRoot.FullName 'vendor\autoload.php') -Description 'phpMyAdmin Composer autoloader in verified archive')
        [void](Resolve-RequiredFile -Path (Join-Path $packageRoot.FullName 'vendor\symfony\polyfill-php80\bootstrap.php') -Description 'phpMyAdmin Symfony polyfill in verified archive')
        if (Test-Path -LiteralPath $phpMyAdminInstallRoot) {
            Remove-Item -LiteralPath $phpMyAdminInstallRoot -Recurse -Force
        }
        Move-Item -LiteralPath $packageRoot.FullName -Destination $phpMyAdminInstallRoot
        Assert-PhpMyAdminReady
        Write-Output "phpMyAdmin $phpMyAdminVersion installed: $phpMyAdminInstallRoot"
    }
    finally {
        if (Test-Path -LiteralPath $workRoot) {
            Remove-Item -LiteralPath $workRoot -Recurse -Force
        }
    }
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

function Stop-FrontendDevServerForBuild {
    param([Parameter(Mandatory = $true)][string]$FrontendRoot)

    $listener = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $listener) {
        return
    }

    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    $normalizedFrontendRoot = [IO.Path]::GetFullPath($FrontendRoot).TrimEnd('\')
    if (-not $process -or [string]$process.CommandLine -notmatch [regex]::Escape($normalizedFrontendRoot)) {
        throw 'Port 5173 is occupied by an application outside this frontend workspace. Stop it before building.'
    }

    Write-Host "Stopping workspace Vite process $($process.ProcessId) before tests and build..." -ForegroundColor Yellow
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

$php = Resolve-PhpExecutable

if ($PreparePhpMyAdminOnly) {
    Install-PhpMyAdmin -Executable $php
    return
}

[void](Resolve-RequiredFile -Path (Join-Path $backendRoot '.env') -Description 'Backend .env. Copy BE\.env.example to BE\.env and configure MySQL first')
$composer = Resolve-RequiredCommand -Name 'composer.bat'
$npm = Resolve-RequiredCommand -Name 'npm.cmd'

Write-Output "Backend: $backendRoot"
Write-Output "Frontend: $frontendRoot"

if ($CheckOnly) {
    Assert-PhpMyAdminRequirements -Executable $php
    Assert-PhpMyAdminReady
    [void](Resolve-RequiredFile -Path (Join-Path $backendRoot 'vendor\autoload.php') -Description 'Composer dependencies')
    [void](Resolve-RequiredFile -Path (Join-Path $frontendRoot 'node_modules\vite\bin\vite.js') -Description 'Frontend dependencies')
    Write-Output 'Dependencies: ready'
    return
}

Install-PhpMyAdmin -Executable $php

if (-not $SkipDependencies) {
    if (-not (Test-Path -LiteralPath (Join-Path $backendRoot 'vendor\autoload.php') -PathType Leaf)) {
        Invoke-BuildStep -Label 'Install backend dependencies' -WorkingDirectory $backendRoot -Executable $composer -Arguments @('install', '--no-interaction', '--prefer-dist')
    }
    else {
        Write-Host 'Backend dependencies: ready' -ForegroundColor DarkGreen
    }

    if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot 'node_modules\vite\bin\vite.js') -PathType Leaf)) {
        Stop-FrontendDevServerForBuild -FrontendRoot $frontendRoot
        Invoke-BuildStep -Label 'Install frontend dependencies' -WorkingDirectory $frontendRoot -Executable $npm -Arguments @('ci', '--no-audit', '--no-fund')
    }
    else {
        Write-Host 'Frontend dependencies: ready' -ForegroundColor DarkGreen
    }
}

if (-not $SkipMigrations) {
    Invoke-BuildStep -Label 'Run database migrations' -WorkingDirectory $backendRoot -Executable $php -Arguments @($artisan, 'migrate', '--force')
}

Stop-FrontendDevServerForBuild -FrontendRoot $frontendRoot

if (-not $SkipTests) {
    Invoke-BuildStep -Label 'Run backend tests' -WorkingDirectory $backendRoot -Executable $php -Arguments @($artisan, 'test')
    Invoke-BuildStep -Label 'Run frontend tests' -WorkingDirectory $frontendRoot -Executable $npm -Arguments @('test')
}

Invoke-BuildStep -Label 'Build frontend production assets' -WorkingDirectory $frontendRoot -Executable $npm -Arguments @('run', 'build')
Write-Host "`nLocal web build completed." -ForegroundColor Green
