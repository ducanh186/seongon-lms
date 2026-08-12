#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [string]$PhpExecutable,
    [switch]$PhpOnly,
    [switch]$NoPersistPhpRc,
    [switch]$SkipMySqlCheck,
    [switch]$SkipProjectDependencies
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

function Resolve-NativeCommandPath {
    param([Parameter(Mandatory = $true)]$CommandInfo)

    foreach ($propertyName in @('Source', 'Path', 'Definition', 'FullName')) {
        $property = $CommandInfo.PSObject.Properties[$propertyName]
        if (-not $property -or [string]::IsNullOrWhiteSpace([string]$property.Value)) {
            continue
        }

        $candidate = [string]$property.Value
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "Could not resolve an executable path from command '$($CommandInfo.Name)'."
}

function Invoke-NativeCommandCapture {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [string[]]$Arguments = @()
    )

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5.1 converts native stderr into ErrorRecord objects.
        # Capture those records without treating informational stderr as a terminating error.
        $ErrorActionPreference = 'Continue'
        $output = @(& $Executable @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = @($output | ForEach-Object { $_.ToString().TrimEnd() })
    }
}

function Set-IniDirective {
    param(
        [Parameter(Mandatory = $true)][string]$IniPath,
        [Parameter(Mandatory = $true)][string[]]$Patterns,
        [Parameter(Mandatory = $true)][string]$Replacement
    )

    $sourceLines = @(Get-Content -LiteralPath $IniPath)
    $outputLines = New-Object 'System.Collections.Generic.List[string]'
    $wasWritten = $false

    foreach ($line in $sourceLines) {
        $isMatch = $false
        foreach ($pattern in $Patterns) {
            if ($line -match $pattern) {
                $isMatch = $true
                break
            }
        }

        if ($isMatch) {
            if (-not $wasWritten) {
                $outputLines.Add($Replacement)
                $wasWritten = $true
            }
            continue
        }

        $outputLines.Add($line)
    }

    if (-not $wasWritten) {
        $outputLines.Add($Replacement)
    }

    Set-Content -LiteralPath $IniPath -Value $outputLines -Encoding ASCII
}

function Add-DirectoryToUserPath {
    param([Parameter(Mandatory = $true)][string]$Directory)

    $normalizedDirectory = [IO.Path]::GetFullPath($Directory).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $pathEntries = @($userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $alreadyPresent = $pathEntries | Where-Object {
        [IO.Path]::GetFullPath($_).TrimEnd([IO.Path]::DirectorySeparatorChar) -ieq $normalizedDirectory
    }

    if (-not $alreadyPresent) {
        $newUserPath = (@($pathEntries) + $normalizedDirectory) -join ';'
        [Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')
    }

    if (-not (($env:Path -split ';') -contains $normalizedDirectory)) {
        $env:Path = "$normalizedDirectory;$env:Path"
    }
}

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
}
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$backendRoot = Join-Path $ProjectRoot 'BE'
$frontendRoot = Join-Path $ProjectRoot 'FE\DEMO'

if ([string]::IsNullOrWhiteSpace($PhpExecutable)) {
    $phpCommand = Get-Command php.exe -ErrorAction SilentlyContinue
    if ($phpCommand) {
        $PhpExecutable = Resolve-NativeCommandPath -CommandInfo $phpCommand
    }
    else {
        $fallbackPhp = Join-Path $env:LOCALAPPDATA 'Programs\PHP83\php.exe'
        $PhpExecutable = Resolve-RequiredFile -Path $fallbackPhp -Description 'PHP 8.3 executable'
    }
}
else {
    $PhpExecutable = Resolve-RequiredFile -Path $PhpExecutable -Description 'PHP executable'
}

$phpVersionOutput = (& $PhpExecutable --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "php --version failed with exit code $LASTEXITCODE."
}
if ($phpVersionOutput -notmatch '(?m)^PHP 8\.3\.') {
    throw "This project requires PHP 8.3.x. Resolved executable reported: $phpVersionOutput"
}

$phpDir = Split-Path -Parent $PhpExecutable
$phpIni = Join-Path $phpDir 'php.ini'
$phpIniProduction = Join-Path $phpDir 'php.ini-production'
$projectPhpIni = Join-Path $backendRoot 'php.ini'

if (-not (Test-Path -LiteralPath $phpIni -PathType Leaf)) {
    if (Test-Path -LiteralPath $projectPhpIni -PathType Leaf) {
        Copy-Item -LiteralPath $projectPhpIni -Destination $phpIni
        Write-Host "Copied project-local BE/php.ini to the PHP runtime: $phpIni" -ForegroundColor Yellow
    }
    else {
        $phpIniProduction = Resolve-RequiredFile -Path $phpIniProduction -Description 'php.ini-production template'
        Copy-Item -LiteralPath $phpIniProduction -Destination $phpIni
        Write-Host "Created runtime php.ini from php.ini-production: $phpIni" -ForegroundColor Yellow
    }
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$phpIniBackup = "$phpIni.backup-$timestamp"
Copy-Item -LiteralPath $phpIni -Destination $phpIniBackup

$env:PHPRC = $phpDir
if (-not $NoPersistPhpRc) {
    [Environment]::SetEnvironmentVariable('PHPRC', $phpDir, 'User')
}

Set-IniDirective -IniPath $phpIni `
    -Patterns @('^\s*;?\s*extension_dir\s*=') `
    -Replacement 'extension_dir = "ext"'

$requiredModules = @(
    @{ Name = 'bcmath'; Dll = 'php_bcmath.dll'; Directive = 'extension=bcmath'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?bcmath(?:\.dll)?\s*$') },
    @{ Name = 'dom'; Dll = 'php_dom.dll'; Directive = 'extension=dom'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?dom(?:\.dll)?\s*$') },
    @{ Name = 'fileinfo'; Dll = 'php_fileinfo.dll'; Directive = 'extension=fileinfo'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?fileinfo(?:\.dll)?\s*$') },
    @{ Name = 'gd'; Dll = 'php_gd.dll'; Directive = 'extension=gd'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?gd(?:\.dll)?\s*$') },
    @{ Name = 'intl'; Dll = 'php_intl.dll'; Directive = 'extension=intl'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?intl(?:\.dll)?\s*$') },
    @{ Name = 'mbstring'; Dll = 'php_mbstring.dll'; Directive = 'extension=mbstring'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?mbstring(?:\.dll)?\s*$') },
    @{ Name = 'openssl'; Dll = 'php_openssl.dll'; Directive = 'extension=openssl'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?openssl(?:\.dll)?\s*$') },
    @{ Name = 'pdo_mysql'; Dll = 'php_pdo_mysql.dll'; Directive = 'extension=pdo_mysql'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?pdo_mysql(?:\.dll)?\s*$') },
    @{ Name = 'zip'; Dll = 'php_zip.dll'; Directive = 'extension=zip'; Patterns = @('^\s*;?\s*extension\s*=\s*(?:php_)?zip(?:\.dll)?\s*$') },
    @{ Name = 'Zend OPcache'; Dll = 'php_opcache.dll'; Directive = 'zend_extension=opcache'; Patterns = @('^\s*;?\s*zend_extension\s*=\s*(?:php_)?opcache(?:\.dll)?\s*$') }
)

$installedBefore = @(& $PhpExecutable -m 2>&1)
if ($LASTEXITCODE -ne 0) {
    throw "php -m failed before configuration with exit code $LASTEXITCODE."
}

foreach ($module in $requiredModules) {
    if ($installedBefore -contains $module.Name) {
        continue
    }

    $dllPath = Join-Path (Join-Path $phpDir 'ext') $module.Dll
    if (-not (Test-Path -LiteralPath $dllPath -PathType Leaf)) {
        throw "Cannot enable $($module.Name): required DLL is missing: $dllPath"
    }

    Set-IniDirective -IniPath $phpIni -Patterns $module.Patterns -Replacement $module.Directive
}

$installedAfter = @(& $PhpExecutable -m 2>&1)
if ($LASTEXITCODE -ne 0) {
    throw "php -m failed after configuration with exit code $LASTEXITCODE."
}
$missingAfter = @($requiredModules | Where-Object { $installedAfter -notcontains $_.Name } | ForEach-Object { $_.Name })
if ($missingAfter.Count -gt 0) {
    throw "PHP extensions are still missing after configuring $phpIni`: $($missingAfter -join ', ')"
}

$iniReport = (& $PhpExecutable --ini 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
    throw "php --ini failed with exit code $LASTEXITCODE."
}
if ($iniReport -notlike "*$phpIni*") {
    throw "PHP is not loading the runtime php.ini at $phpIni. Current report: $iniReport"
}

Write-Host "PHP OK: $($phpVersionOutput.Split([Environment]::NewLine)[0])" -ForegroundColor Green
Write-Host "Loaded php.ini: $phpIni" -ForegroundColor Green
Write-Host "Backup: $phpIniBackup" -ForegroundColor DarkGray

if ($PhpOnly) {
    Write-Host 'PHP-only configuration completed.' -ForegroundColor Green
    exit 0
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw "Node.js was not found. Install it with: winget install --id OpenJS.NodeJS.24 --exact"
}
$nodeExecutable = Resolve-NativeCommandPath -CommandInfo $nodeCommand
$nodeVersion = (& $nodeExecutable --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(?<major>\d+)\.') {
    throw "Unable to determine Node.js version: $nodeVersion"
}
if ([int]$Matches.major -lt 22) {
    throw "Node.js 22 or newer is required. Resolved version: $nodeVersion"
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    throw 'npm.cmd was not found beside the Node.js installation.'
}
$npmExecutable = Resolve-NativeCommandPath -CommandInfo $npmCommand
$npmVersion = (& $npmExecutable --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "npm --version failed with exit code $LASTEXITCODE."
}
Write-Host "Node/npm OK: $nodeVersion / npm $npmVersion" -ForegroundColor Green

$composerCommand = Get-Command composer.bat -ErrorAction SilentlyContinue
if (-not $composerCommand) {
    $composerCommand = Get-Command composer -ErrorAction SilentlyContinue
}

if ($composerCommand) {
    $composerExecutable = Resolve-NativeCommandPath -CommandInfo $composerCommand
}
else {
    $composerInstallDir = Join-Path $env:LOCALAPPDATA 'Programs\Composer'
    New-Item -ItemType Directory -Path $composerInstallDir -Force | Out-Null
    $tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $composerTempDir = Join-Path $tempParent ("seongon-composer-{0}" -f [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $composerTempDir | Out-Null

    try {
        $signaturePath = Join-Path $composerTempDir 'installer.sig'
        $installerPath = Join-Path $composerTempDir 'composer-setup.php'
        Invoke-WebRequest -UseBasicParsing -Uri 'https://composer.github.io/installer.sig' -OutFile $signaturePath
        Invoke-WebRequest -UseBasicParsing -Uri 'https://getcomposer.org/installer' -OutFile $installerPath

        $expectedHash = (Get-Content -LiteralPath $signaturePath -Raw).Trim().ToLowerInvariant()
        $actualHash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA384).Hash.ToLowerInvariant()
        if ($expectedHash -notmatch '^[a-f0-9]{96}$' -or $actualHash -cne $expectedHash) {
            throw 'Composer installer SHA-384 verification failed. The installer was not executed.'
        }

        Invoke-CheckedCommand -Description 'Composer installation' -Command {
            & $PhpExecutable $installerPath "--install-dir=$composerInstallDir" '--filename=composer.phar' '--quiet'
        }

        $composerExecutable = Join-Path $composerInstallDir 'composer.bat'
        $composerBatch = "@echo off`r`nphp `"%~dp0composer.phar`" %*`r`n"
        Set-Content -LiteralPath $composerExecutable -Value $composerBatch -Encoding ASCII
        Add-DirectoryToUserPath -Directory $composerInstallDir
    }
    finally {
        if (Test-Path -LiteralPath $composerTempDir) {
            $resolvedTemp = [IO.Path]::GetFullPath($composerTempDir)
            if (-not $resolvedTemp.StartsWith("$tempParent$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
                throw "Refusing to clean an unexpected Composer temp path: $resolvedTemp"
            }
            Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
        }
    }
}

$composerResult = Invoke-NativeCommandCapture -Executable $composerExecutable -Arguments @('--version')
$composerVersion = ($composerResult.Output | Out-String).Trim()
if ($composerResult.ExitCode -ne 0) {
    throw "composer --version failed with exit code $($composerResult.ExitCode): $composerVersion"
}
Write-Host "Composer OK: $composerVersion" -ForegroundColor Green

if (-not $SkipMySqlCheck) {
    $mysqlCommand = Get-Command mysql.exe -ErrorAction SilentlyContinue
    if (-not $mysqlCommand) {
        $mysqlFallback = Join-Path $env:ProgramFiles 'MySQL\MySQL Server 8.0\bin\mysql.exe'
        if (Test-Path -LiteralPath $mysqlFallback -PathType Leaf) {
            $mysqlCommand = Get-Item -LiteralPath $mysqlFallback
        }
    }

    if (-not $mysqlCommand) {
        Start-Process 'https://dev.mysql.com/downloads/installer/'
        throw @'
MySQL 8.0 is not installed yet. The official installer page was opened.
Install MySQL Server 8.0, use port 3306 and service name MySQL80, then rerun this script.
Do not substitute MySQL 8.4, MariaDB, XAMPP, or SQLite.
'@
    }

    $mysqlExecutable = Resolve-NativeCommandPath -CommandInfo $mysqlCommand
    $mysqlVersion = (& $mysqlExecutable --version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $mysqlVersion -notmatch '(?<!\d)8\.0\.\d+(?!\d)' -or $mysqlVersion -match 'MariaDB') {
        throw "MySQL client must be 8.0.x. Resolved version: $mysqlVersion"
    }

    $mysqlService = Get-Service -Name MySQL80 -ErrorAction SilentlyContinue
    if (-not $mysqlService) {
        throw 'MySQL 8.0 client exists, but Windows service MySQL80 was not found.'
    }
    if ($mysqlService.Status -ne 'Running') {
        Write-Warning 'MySQL80 is installed but not running. Open Administrator PowerShell and run: Start-Service MySQL80'
    }
    Write-Host "MySQL client OK: $mysqlVersion" -ForegroundColor Green
}

if (-not $SkipProjectDependencies) {
    Resolve-RequiredFile -Path (Join-Path $backendRoot 'composer.json') -Description 'Backend composer.json' | Out-Null
    Resolve-RequiredFile -Path (Join-Path $frontendRoot 'package-lock.json') -Description 'Frontend package-lock.json' | Out-Null

    Invoke-CheckedCommand -Description 'Backend Composer dependency installation' -Command {
        & $composerExecutable install --no-interaction --working-dir $backendRoot
    }
    Invoke-CheckedCommand -Description 'Frontend npm dependency installation' -Command {
        & $npmExecutable ci --prefix $frontendRoot
    }
}

Write-Host ''
Write-Host 'Native dependencies are ready.' -ForegroundColor Green
Write-Host "Next: follow $ProjectRoot\docs\NATIVE_WINDOWS_SETUP.md from section 7 to create MySQL database/user and configure .env files."
