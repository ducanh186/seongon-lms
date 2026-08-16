#Requires -Version 5.1

[CmdletBinding()]
param(
    [string]$RuntimeRoot = (Join-Path $PSScriptRoot '.native-runtime'),
    [string]$PhpExecutable,
    [string]$ArchiveSource = 'https://files.phpmyadmin.net/phpMyAdmin/5.2.3/phpMyAdmin-5.2.3-all-languages.zip',
    [string]$ChecksumSource = 'https://files.phpmyadmin.net/phpMyAdmin/5.2.3/phpMyAdmin-5.2.3-all-languages.zip.sha256',
    [switch]$Force,
    [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$phpMyAdminVersion = '5.2.3'
$installRoot = Join-Path $RuntimeRoot "phpmyadmin-$phpMyAdminVersion"

function Resolve-PhpExecutable {
    if ($PhpExecutable) {
        if (-not (Test-Path -LiteralPath $PhpExecutable -PathType Leaf)) {
            throw "PHP executable was not found: $PhpExecutable"
        }
        return (Resolve-Path -LiteralPath $PhpExecutable).Path
    }

    $command = Get-Command php -ErrorAction SilentlyContinue
    if (-not $command) {
        throw 'PHP was not found in PATH. Run Infra\install-native-dependencies-windows.ps1 first.'
    }
    return $command.Source
}

function Test-PhpModule {
    param(
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string]$Module
    )

    $modules = @(& $Executable -m 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect PHP modules with $Executable."
    }
    return [bool]($modules | Where-Object { $_.Trim() -ieq $Module })
}

function Ensure-Mysqli {
    param([Parameter(Mandatory)][string]$Executable)

    if (Test-PhpModule -Executable $Executable -Module 'mysqli') {
        return
    }

    $dependencyInstaller = Join-Path $PSScriptRoot 'install-native-dependencies-windows.ps1'
    if (-not (Test-Path -LiteralPath $dependencyInstaller -PathType Leaf)) {
        throw "mysqli is disabled and the dependency installer is missing: $dependencyInstaller"
    }

    Write-Host 'Enabling the PHP mysqli extension...'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $dependencyInstaller `
        -ProjectRoot (Split-Path -Parent $PSScriptRoot) `
        -PhpExecutable $Executable `
        -PhpOnly
    if ($LASTEXITCODE -ne 0 -or -not (Test-PhpModule -Executable $Executable -Module 'mysqli')) {
        throw 'The PHP mysqli extension could not be enabled.'
    }
}

function Copy-PackageSource {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination
    )

    if ([Uri]::IsWellFormedUriString($Source, [UriKind]::Absolute) -and $Source -match '^https://') {
        Invoke-WebRequest -UseBasicParsing -Uri $Source -OutFile $Destination
        return
    }
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "Package source was not found: $Source"
    }
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Assert-InstallTargetIsSafe {
    $resolvedRuntime = [IO.Path]::GetFullPath($RuntimeRoot).TrimEnd('\') + '\'
    $resolvedInstall = [IO.Path]::GetFullPath($installRoot)
    if (-not $resolvedInstall.StartsWith($resolvedRuntime, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe phpMyAdmin install target: $resolvedInstall"
    }
}

function Write-PhpMyAdminConfig {
    param([Parameter(Mandatory)][string]$DestinationRoot)

    $randomBytes = New-Object byte[] 24
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
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

$php = Resolve-PhpExecutable
$phpVersion = (& $php -r 'echo PHP_VERSION;' 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not [Version]::TryParse($phpVersion, [ref]([Version]$null))) {
    throw "Unable to read the PHP version from $php."
}
if ([Version]$phpVersion -lt [Version]'8.2.0') {
    throw "phpMyAdmin 5.2.3 requires PHP 8.2 or newer; found $phpVersion."
}
Ensure-Mysqli -Executable $php

if ($CheckOnly) {
    if (-not (Test-Path -LiteralPath (Join-Path $installRoot 'index.php') -PathType Leaf)) {
        throw "phpMyAdmin is not installed at $installRoot. Run setup-phpmyadmin-windows.bat first."
    }
    if (-not (Test-Path -LiteralPath (Join-Path $installRoot 'config.inc.php') -PathType Leaf)) {
        throw "phpMyAdmin configuration is missing at $installRoot."
    }
    Write-Output "phpMyAdmin $phpMyAdminVersion is ready: $installRoot"
    exit 0
}

if ((Test-Path -LiteralPath (Join-Path $installRoot 'index.php') -PathType Leaf) -and -not $Force) {
    Write-Output "phpMyAdmin $phpMyAdminVersion is already installed: $installRoot"
    exit 0
}

Assert-InstallTargetIsSafe
New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
$workRoot = Join-Path $RuntimeRoot ("phpmyadmin-setup-{0}" -f [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $workRoot 'phpmyadmin.zip'
$checksumPath = Join-Path $workRoot 'phpmyadmin.zip.sha256'
$extractRoot = Join-Path $workRoot 'extract'

try {
    New-Item -ItemType Directory -Path $workRoot,$extractRoot -Force | Out-Null
    Write-Host 'Downloading phpMyAdmin package and checksum...'
    Copy-PackageSource -Source $ArchiveSource -Destination $archivePath
    Copy-PackageSource -Source $ChecksumSource -Destination $checksumPath

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
    if (Test-Path -LiteralPath $installRoot) {
        Remove-Item -LiteralPath $installRoot -Recurse -Force
    }
    Move-Item -LiteralPath $packageRoot.FullName -Destination $installRoot
    Write-Output "phpMyAdmin $phpMyAdminVersion installed: $installRoot"
}
finally {
    if (Test-Path -LiteralPath $workRoot) {
        Remove-Item -LiteralPath $workRoot -Recurse -Force
    }
}
