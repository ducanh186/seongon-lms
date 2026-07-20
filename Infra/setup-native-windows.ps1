#Requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$PreflightOnly,
    [switch]$ResumeAfterMySql
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'BE'
$frontendRoot = Join-Path $projectRoot 'FE\DEMO'

function Write-Check {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Value
    )

    Write-Host ('{0}: {1}' -f $Name, $Value)
}

function Get-CommandPath {
    param([Parameter(Mandatory)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        return $null
    }

    return $command.Source
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-PortState {
    param([Parameter(Mandatory)][int]$Port)

    $listeners = [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    if ($listeners | Where-Object { $_.Port -eq $Port }) {
        return 'in use'
    }

    return 'available'
}

function Invoke-Preflight {
    Write-Check -Name 'Administrator' -Value (Test-IsAdministrator)

    $wingetPath = Get-CommandPath -Name 'winget.exe'
    Write-Check -Name 'Winget' -Value $(if ($wingetPath) { $wingetPath } else { 'not found' })

    $phpPath = Get-CommandPath -Name 'php.exe'
    $phpVersion = if ($phpPath) { (& $phpPath --version | Select-Object -First 1) } else { 'not found' }
    Write-Check -Name 'PHP' -Value $phpVersion
    $phpModules = if ($phpPath) { ((& $phpPath -m) -join ', ') } else { 'not found' }
    Write-Check -Name 'PHP modules' -Value $phpModules

    $composerPath = Get-CommandPath -Name 'composer.bat'
    Write-Check -Name 'Composer' -Value $(if ($composerPath) { (& $composerPath --version | Select-Object -First 1) } else { 'not found' })

    $nodePath = Get-CommandPath -Name 'node.exe'
    Write-Check -Name 'Node' -Value $(if ($nodePath) { (& $nodePath --version) } else { 'not found' })
    $npmPath = Get-CommandPath -Name 'npm.cmd'
    Write-Check -Name 'npm' -Value $(if ($npmPath) { (& $npmPath --version) } else { 'not found' })

    $mysqlPath = Get-CommandPath -Name 'mysql.exe'
    Write-Check -Name 'MySQL client' -Value $(if ($mysqlPath) { (& $mysqlPath --version) } else { 'not found' })
    Write-Check -Name 'MySQL server' -Value 'not authenticated during preflight'

    foreach ($port in @(3306, 8000, 5173)) {
        Write-Check -Name "Port $port" -Value (Get-PortState -Port $port)
    }

    Write-Check -Name 'BE composer.lock' -Value (Test-Path -LiteralPath (Join-Path $backendRoot 'composer.lock'))
    Write-Check -Name 'FE package-lock.json' -Value (Test-Path -LiteralPath (Join-Path $frontendRoot 'package-lock.json'))
}

function Refresh-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = (@($machinePath, $userPath) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ';'
}

function Ensure-WingetPackage {
    param([Parameter(Mandatory)][string]$Id)

    if (-not (Get-CommandPath -Name 'winget.exe')) {
        throw 'Winget is required to install the native PHP and Node.js dependencies.'
    }

    & winget.exe list --id $Id --exact --accept-source-agreements | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Winget package already installed: $Id"
        return
    }

    & winget.exe install --id $Id --exact --accept-package-agreements --accept-source-agreements --disable-interactivity
    if ($LASTEXITCODE -ne 0) {
        throw "Winget failed to install $Id."
    }
}

function Get-PhpExecutable {
    $phpPath = Get-CommandPath -Name 'php.exe'
    if (-not $phpPath) {
        throw 'php.exe was not found after PHP installation.'
    }

    return $phpPath
}

function Test-Php83Runtime {
    param([Parameter(Mandatory)][string]$VersionText)

    return $VersionText -match '^\s*PHP\s+8\.3\.[0-9]+\b'
}

function Test-Node22Runtime {
    param([Parameter(Mandatory)][string]$VersionText)

    return $VersionText -match '^v22\.[0-9]+\.[0-9]+\b'
}

function Assert-ExternalCommandSucceeded {
    param(
        [Parameter(Mandatory)][int]$ExitCode,
        [Parameter(Mandatory)][string]$Operation
    )

    if ($ExitCode -ne 0) {
        throw "$Operation failed with exit code $ExitCode."
    }
}

function Assert-PostInstallRuntimeVersions {
    $phpPath = Get-PhpExecutable
    $phpVersion = (& $phpPath --version | Select-Object -First 1)
    Assert-ExternalCommandSucceeded -ExitCode $LASTEXITCODE -Operation 'PHP version check'
    if (-not (Test-Php83Runtime -VersionText $phpVersion)) {
        throw "The php.exe selected from PATH is not PHP 8.3: $phpVersion"
    }

    $nodePath = Get-CommandPath -Name 'node.exe'
    if (-not $nodePath) {
        throw 'node.exe was not found after Node.js installation.'
    }
    $nodeVersion = (& $nodePath --version | Select-Object -First 1)
    Assert-ExternalCommandSucceeded -ExitCode $LASTEXITCODE -Operation 'Node.js version check'
    if (-not (Test-Node22Runtime -VersionText $nodeVersion)) {
        throw "The node.exe selected from PATH is not Node.js 22: $nodeVersion"
    }
}

function Enable-PhpExtension {
    param(
        [Parameter(Mandatory)][string]$PhpIniPath,
        [Parameter(Mandatory)][string]$Extension,
        [switch]$ZendExtension
    )

    $content = Get-Content -LiteralPath $PhpIniPath -Raw
    $key = if ($ZendExtension) { 'zend_extension' } else { 'extension' }
    $value = if ($ZendExtension) { 'opcache' } else { $Extension }
    $pattern = '(?im)^\s*;?\s*' + [regex]::Escape($key) + '\s*=\s*' + [regex]::Escape($value) + '\s*$'
    if ($content -match $pattern) {
        $content = [regex]::Replace($content, $pattern, "$key=$value")
    }
    else {
        $content += [Environment]::NewLine + "$key=$value" + [Environment]::NewLine
    }

    Set-Content -LiteralPath $PhpIniPath -Value $content -Encoding ASCII
}

function Configure-Php {
    $phpPath = Get-PhpExecutable
    $phpDirectory = Split-Path -Parent $phpPath
    $phpIniPath = Join-Path $phpDirectory 'php.ini'
    if (-not (Test-Path -LiteralPath $phpIniPath)) {
        $productionIni = Join-Path $phpDirectory 'php.ini-production'
        if (-not (Test-Path -LiteralPath $productionIni)) {
            throw "php.ini-production was not found beside $phpPath."
        }
        Copy-Item -LiteralPath $productionIni -Destination $phpIniPath
    }

    foreach ($extension in @('bcmath', 'gd', 'intl', 'mbstring', 'pdo_mysql', 'zip')) {
        Enable-PhpExtension -PhpIniPath $phpIniPath -Extension $extension
    }
    Enable-PhpExtension -PhpIniPath $phpIniPath -Extension 'opcache' -ZendExtension

    & $phpPath --ini | Out-Host
    $installedModules = @(& $phpPath -m)
    $requiredPhpModules = @('bcmath', 'dom', 'gd', 'intl', 'mbstring', 'Zend OPcache', 'pdo_mysql', 'zip')
    $missingModules = @($requiredPhpModules | Where-Object {
        $requiredModule = $_
        -not ($installedModules | Where-Object { $_ -ieq $requiredModule })
    })
    if ($missingModules.Count -gt 0) {
        throw ('PHP is missing required modules: ' + ($missingModules -join ', '))
    }
}

function ConvertTo-NormalizedSha384 {
    param([Parameter(Mandatory)][string]$Value)

    $normalizedValue = $Value.Trim()
    if ($normalizedValue -notmatch '^[0-9a-fA-F]{96}$') {
        throw 'Composer SHA-384 signature must contain exactly 96 hexadecimal characters.'
    }
    return $normalizedValue.ToLowerInvariant()
}

function ConvertTo-MySqlOptionFileValue {
    param([Parameter(Mandatory)][string]$Value)

    if ($Value.Contains("`r") -or $Value.Contains("`n")) {
        throw 'MySQL option-file values cannot contain line breaks.'
    }
    $escapedValue = $Value.Replace('\', '\\').Replace('"', '\"')
    return '"' + $escapedValue + '"'
}

function New-MySqlTcpArguments {
    return @('--host=127.0.0.1', '--port=3306', '--protocol=tcp')
}

function Safe-RemoveDirectory {
    param([Parameter(Mandatory)][string]$Path)

    $tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\\') + '\\'
    $fullPath = [IO.Path]::GetFullPath($Path)
    if (-not $fullPath.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Refusing to remove a directory outside the task-specific temporary directory.'
    }
    if (Test-Path -LiteralPath $fullPath) {
        Remove-Item -LiteralPath $fullPath -Recurse -Force
    }
}

function Install-Composer {
    $phpPath = Get-PhpExecutable
    $tempDirectory = Join-Path $env:TEMP ('seongon-lms-composer-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tempDirectory | Out-Null
    try {
        $signaturePath = Join-Path $tempDirectory 'installer.sig'
        $installerPath = Join-Path $tempDirectory 'installer.php'
        Invoke-WebRequest -UseBasicParsing -Uri 'https://composer.github.io/installer.sig' -OutFile $signaturePath
        Invoke-WebRequest -UseBasicParsing -Uri 'https://getcomposer.org/installer' -OutFile $installerPath

        $expectedSha384 = ConvertTo-NormalizedSha384 -Value (Get-Content -LiteralPath $signaturePath -Raw)
        $actualSha384 = ConvertTo-NormalizedSha384 -Value (Get-FileHash -Algorithm SHA384 -LiteralPath $installerPath).Hash
        if ($expectedSha384 -ne $actualSha384) {
            throw 'Composer installer SHA-384 signature verification failed.'
        }

        $composerDirectory = Join-Path $env:LOCALAPPDATA 'Programs\Composer'
        New-Item -ItemType Directory -Path $composerDirectory -Force | Out-Null
        & $phpPath $installerPath --install-dir=$composerDirectory --filename=composer.phar
        if ($LASTEXITCODE -ne 0) {
            throw 'Composer installer failed.'
        }

        $composerBat = Join-Path $composerDirectory 'composer.bat'
        Set-Content -LiteralPath $composerBat -Value '@php "%~dp0composer.phar" %*' -Encoding ASCII
        Refresh-ProcessPath
        $env:Path = $composerDirectory + ';' + $env:Path
    }
    finally {
        Safe-RemoveDirectory -Path $tempDirectory
    }
}

function Test-MySql80Version {
    param([Parameter(Mandatory)][string]$VersionText)

    if ($VersionText -match '(?i)mariadb') {
        return $false
    }
    return $VersionText -match '(?<![0-9])8\.0\.[0-9]+'
}

function Test-MySql80Client {
    $mysqlPath = Get-CommandPath -Name 'mysql.exe'
    if (-not $mysqlPath) {
        return $false
    }

    $version = (& $mysqlPath --version) -join ' '
    if ($LASTEXITCODE -ne 0) {
        return $false
    }
    return Test-MySql80Version -VersionText $version
}

function Stop-ForMySqlInstallation {
    Write-Host 'Select MySQL Installer 8.0.46.'
    Write-Host 'Install MySQL Server 8.0 only.'
    Write-Host 'Use port 3306 and Windows service name MySQL80.'
    Write-Host 'Choose a strong root password and keep it available for the next run.'
    Write-Host 'Rerun setup-native-windows.ps1 with -ResumeAfterMySql.'
    Start-Process 'https://dev.mysql.com/downloads/installer/'
    exit 1
}

function New-RestrictedTempDirectory {
    param([Parameter(Mandatory)][string]$Prefix)

    $directory = Join-Path $env:TEMP ($Prefix + '-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $directory | Out-Null
    $acl = Get-Acl -LiteralPath $directory
    $acl.SetAccessRuleProtection($true, $false)
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    [void]$acl.AddAccessRule($rule)
    Set-Acl -LiteralPath $directory -AclObject $acl
    return $directory
}

function Assert-ChildPath {
    param(
        [Parameter(Mandatory)][string]$Directory,
        [Parameter(Mandatory)][string]$Path
    )

    $resolvedDirectory = [IO.Path]::GetFullPath($Directory).TrimEnd('\') + '\'
    $resolvedPath = [IO.Path]::GetFullPath($Path)
    if (-not $resolvedPath.StartsWith($resolvedDirectory, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Refusing to use a path outside the temporary credential directory.'
    }
}

function New-HexPassword {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
        return ([BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
    }
    finally {
        $rng.Dispose()
    }
}

function Initialize-MySqlDatabase {
    $mysqlPath = Get-CommandPath -Name 'mysql.exe'
    if (-not $mysqlPath) {
        throw 'mysql.exe was not found.'
    }

    $rootPassword = Read-Host -Prompt 'MySQL root password' -AsSecureString
    $credential = New-Object Management.Automation.PSCredential('root', $rootPassword)
    $plainRootPassword = $credential.GetNetworkCredential().Password
    $applicationPassword = New-HexPassword
    $tempDirectory = New-RestrictedTempDirectory -Prefix 'seongon-lms-mysql'
    try {
        $optionPath = Join-Path $tempDirectory 'client.cnf'
        $sqlPath = Join-Path $tempDirectory 'initialize.sql'
        Assert-ChildPath -Directory $tempDirectory -Path $optionPath
        Assert-ChildPath -Directory $tempDirectory -Path $sqlPath
        $optionFileContent = "[client]`nuser=`"root`"`npassword=$(ConvertTo-MySqlOptionFileValue -Value $plainRootPassword)"
        Set-Content -LiteralPath $optionPath -Value $optionFileContent -Encoding UTF8
        $tcpArguments = New-MySqlTcpArguments
        $serverVersion = (& $mysqlPath "--defaults-extra-file=$optionPath" @tcpArguments --batch --skip-column-names --execute='SELECT VERSION()') -join ' '
        Assert-ExternalCommandSucceeded -ExitCode $LASTEXITCODE -Operation 'MySQL server version check'
        if (-not (Test-MySql80Version -VersionText $serverVersion)) {
            throw "The authenticated MySQL server at 127.0.0.1:3306 is not MySQL 8.0: $serverVersion"
        }
        $sql = @"
CREATE DATABASE IF NOT EXISTS `seongon_lms` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'seongon'@'localhost' IDENTIFIED BY '$applicationPassword';
ALTER USER 'seongon'@'localhost' IDENTIFIED BY '$applicationPassword';
GRANT ALL PRIVILEGES ON `seongon_lms`.* TO 'seongon'@'localhost';
FLUSH PRIVILEGES;
"@
        Set-Content -LiteralPath $sqlPath -Value $sql -Encoding ASCII
        $importCommand = ('"{0}" --defaults-extra-file="{1}" --host=127.0.0.1 --port=3306 --protocol=tcp < "{2}"' -f $mysqlPath, $optionPath, $sqlPath)
        & cmd.exe /d /c $importCommand
        Assert-ExternalCommandSucceeded -ExitCode $LASTEXITCODE -Operation 'MySQL database initialization'
        return $applicationPassword
    }
    finally {
        $plainRootPassword = $null
        Safe-RemoveDirectory -Path $tempDirectory
    }
}

function Set-DotEnvValue {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Key,
        [Parameter(Mandatory)][string]$Value
    )

    $content = if (Test-Path -LiteralPath $Path) { Get-Content -LiteralPath $Path -Raw } else { '' }
    $pattern = '(?m)^' + [regex]::Escape($Key) + '=.*$'
    $line = "$Key=$Value"
    if ($content -match $pattern) {
        $content = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line })
    }
    else {
        $content = $content.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
    }
    Set-Content -LiteralPath $Path -Value $content -Encoding UTF8
}

function Configure-LaravelAndDependencies {
    param([Parameter(Mandatory)][string]$ApplicationPassword)

    $envPath = Join-Path $backendRoot '.env'
    if (Test-Path -LiteralPath $envPath) {
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        Copy-Item -LiteralPath $envPath -Destination (Join-Path $backendRoot ".env.native-backup-$timestamp")
    }
    elseif (Test-Path -LiteralPath (Join-Path $backendRoot '.env.example')) {
        Copy-Item -LiteralPath (Join-Path $backendRoot '.env.example') -Destination $envPath
    }

    $values = [ordered]@{
        APP_ENV          = 'local'
        APP_DEBUG        = 'true'
        APP_URL          = 'http://127.0.0.1:8000'
        FRONTEND_URL     = 'http://localhost:5173'
        DB_CONNECTION    = 'mysql'
        DB_HOST          = '127.0.0.1'
        DB_PORT          = '3306'
        DB_DATABASE      = 'seongon_lms'
        DB_USERNAME      = 'seongon'
        DB_PASSWORD      = $ApplicationPassword
        SESSION_DRIVER   = 'database'
        QUEUE_CONNECTION = 'database'
        CACHE_STORE      = 'database'
    }
    foreach ($key in $values.Keys) {
        Set-DotEnvValue -Path $envPath -Key $key -Value $values[$key]
    }

    & composer install --no-interaction --working-dir $backendRoot
    if ($LASTEXITCODE -ne 0) { throw 'composer install failed.' }
    & php (Join-Path $backendRoot 'artisan') key:generate --force
    if ($LASTEXITCODE -ne 0) { throw 'Laravel key generation failed.' }
    & php (Join-Path $backendRoot 'artisan') migrate --force
    if ($LASTEXITCODE -ne 0) { throw 'Laravel migration failed.' }
    & php (Join-Path $backendRoot 'artisan') app:seed-demo-once
    if ($LASTEXITCODE -ne 0) { throw 'Laravel demo seeding failed.' }
    & npm.cmd ci --prefix $frontendRoot
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
}

if ($PreflightOnly -or $WhatIfPreference) {
    if ($WhatIfPreference -and -not $PreflightOnly) {
        Write-Host 'WhatIf mode: preflight only; no install or configuration actions will run.'
    }
    Invoke-Preflight
}
else {
    Ensure-WingetPackage -Id 'PHP.PHP.8.3'
    Ensure-WingetPackage -Id 'OpenJS.NodeJS.22'
    Refresh-ProcessPath
    Assert-PostInstallRuntimeVersions
    Configure-Php

    if (-not (Get-CommandPath -Name 'composer.bat')) {
        Install-Composer
    }

    if ($ResumeAfterMySql) {
        Write-Host 'ResumeAfterMySql: verifying the manually installed MySQL 8.0 client before continuing.'
    }
    if (-not (Test-MySql80Client)) {
        Stop-ForMySqlInstallation
    }

    $applicationPassword = Initialize-MySqlDatabase
    Configure-LaravelAndDependencies -ApplicationPassword $applicationPassword
    Write-Host 'Native Windows setup completed.'
}
