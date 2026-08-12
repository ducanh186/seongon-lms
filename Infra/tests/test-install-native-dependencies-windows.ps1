#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$infraRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $infraRoot 'install-native-dependencies-windows.ps1'

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Required production script is missing: $scriptPath"
}

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ("seongon-native-deps-test-{0}" -f [guid]::NewGuid().ToString('N'))
$fakePhpRoot = Join-Path $testRoot 'PHP83'
$fakeExtRoot = Join-Path $fakePhpRoot 'ext'
$fixtureProjectRoot = Join-Path $testRoot 'project'
$fixtureBackendRoot = Join-Path $fixtureProjectRoot 'BE'

try {
    New-Item -ItemType Directory -Path $fakeExtRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $fixtureBackendRoot -Force | Out-Null

    $projectIni = Join-Path $fixtureBackendRoot 'php.ini'
    $projectIniOriginal = @'
extension_dir = "ext"
;extension=fileinfo
;extension=gd
;extension=intl
;extension=mbstring
;extension=openssl
;extension=pdo_mysql
;extension=zip
;zend_extension=opcache
'@
    Set-Content -LiteralPath $projectIni -Value $projectIniOriginal -Encoding ASCII

    foreach ($dllName in @(
        'php_fileinfo.dll',
        'php_gd.dll',
        'php_intl.dll',
        'php_mbstring.dll',
        'php_openssl.dll',
        'php_pdo_mysql.dll',
        'php_zip.dll',
        'php_opcache.dll'
    )) {
        New-Item -ItemType File -Path (Join-Path $fakeExtRoot $dllName) -Force | Out-Null
    }

    $fakePhp = Join-Path $fakePhpRoot 'php.ps1'
    $fakePhpSource = @'
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PhpArgs)
$iniPath = Join-Path $PSScriptRoot 'php.ini'

switch ($PhpArgs[0]) {
    '--version' {
        'PHP 8.3.32 (cli)'
        exit 0
    }
    '--ini' {
        "Loaded Configuration File: $iniPath"
        exit 0
    }
    '-m' {
        'bcmath'
        'dom'
        if (Test-Path -LiteralPath $iniPath) {
            $ini = Get-Content -LiteralPath $iniPath -Raw
            foreach ($entry in @(
                @{ Pattern = '(?im)^\s*extension\s*=\s*fileinfo\s*$'; Name = 'fileinfo' },
                @{ Pattern = '(?im)^\s*extension\s*=\s*gd\s*$'; Name = 'gd' },
                @{ Pattern = '(?im)^\s*extension\s*=\s*intl\s*$'; Name = 'intl' },
                @{ Pattern = '(?im)^\s*extension\s*=\s*mbstring\s*$'; Name = 'mbstring' },
                @{ Pattern = '(?im)^\s*extension\s*=\s*openssl\s*$'; Name = 'openssl' },
                @{ Pattern = '(?im)^\s*extension\s*=\s*pdo_mysql\s*$'; Name = 'pdo_mysql' },
                @{ Pattern = '(?im)^\s*extension\s*=\s*zip\s*$'; Name = 'zip' },
                @{ Pattern = '(?im)^\s*zend_extension\s*=\s*opcache\s*$'; Name = 'Zend OPcache' }
            )) {
                if ($ini -match $entry.Pattern) { $entry.Name }
            }
        }
        exit 0
    }
    default {
        throw "Unexpected fake PHP arguments: $($PhpArgs -join ' ')"
    }
}
'@
    Set-Content -LiteralPath $fakePhp -Value $fakePhpSource -Encoding UTF8

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
        -ProjectRoot $fixtureProjectRoot `
        -PhpExecutable $fakePhp `
        -PhpOnly `
        -NoPersistPhpRc

    if ($LASTEXITCODE -ne 0) {
        throw "PHP-only configuration exited with code $LASTEXITCODE."
    }

    $runtimeIni = Join-Path $fakePhpRoot 'php.ini'
    if (-not (Test-Path -LiteralPath $runtimeIni -PathType Leaf)) {
        throw 'The runtime php.ini was not created beside the PHP executable.'
    }

    $runtimeIniText = Get-Content -LiteralPath $runtimeIni -Raw
    foreach ($requiredLine in @(
        'extension=fileinfo',
        'extension=gd',
        'extension=intl',
        'extension=mbstring',
        'extension=openssl',
        'extension=pdo_mysql',
        'extension=zip',
        'zend_extension=opcache'
    )) {
        $matches = [regex]::Matches($runtimeIniText, "(?im)^\s*$([regex]::Escape($requiredLine))\s*$")
        if ($matches.Count -ne 1) {
            throw "Expected exactly one active '$requiredLine' directive, found $($matches.Count)."
        }
    }

    $projectIniAfter = Get-Content -LiteralPath $projectIni -Raw
    if ($projectIniAfter.Trim() -ne $projectIniOriginal.Trim()) {
        throw 'The project-local BE/php.ini must remain unchanged.'
    }

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
        -ProjectRoot $fixtureProjectRoot `
        -PhpExecutable $fakePhp `
        -PhpOnly `
        -NoPersistPhpRc

    if ($LASTEXITCODE -ne 0) {
        throw "Second PHP-only configuration exited with code $LASTEXITCODE."
    }

    $runtimeIniTextAfterSecondRun = Get-Content -LiteralPath $runtimeIni -Raw
    foreach ($requiredLine in @(
        'extension=fileinfo',
        'extension=gd',
        'extension=intl',
        'extension=mbstring',
        'extension=openssl',
        'extension=pdo_mysql',
        'extension=zip',
        'zend_extension=opcache'
    )) {
        $matches = [regex]::Matches($runtimeIniTextAfterSecondRun, "(?im)^\s*$([regex]::Escape($requiredLine))\s*$")
        if ($matches.Count -ne 1) {
            throw "Idempotency failed for '$requiredLine'; found $($matches.Count) active directives."
        }
    }

    $commandResolutionMarker = Join-Path $testRoot 'command-resolution-pass.txt'
    $commandResolutionProbe = Join-Path $testRoot 'command-resolution-probe.ps1'
    $nativeStderrProbe = Join-Path $testRoot 'native-stderr-probe.bat'
    Set-Content -LiteralPath $nativeStderrProbe -Value @(
        '@echo off',
        'echo Composer version test',
        'echo PHP version 8.3.33 1>&2',
        'exit /b 0'
    ) -Encoding ASCII
    $escapedScriptPath = $scriptPath.Replace("'", "''")
    $escapedProjectRoot = $fixtureProjectRoot.Replace("'", "''")
    $escapedFakePhp = $fakePhp.Replace("'", "''")
    $escapedMarker = $commandResolutionMarker.Replace("'", "''")
    $escapedNativeStderrProbe = $nativeStderrProbe.Replace("'", "''")
    $probeSource = @"
`$ErrorActionPreference = 'Stop'
. '$escapedScriptPath' -ProjectRoot '$escapedProjectRoot' -PhpExecutable '$escapedFakePhp' -PhpOnly -NoPersistPhpRc
`$commandInfo = Get-Command powershell.exe -ErrorAction Stop
`$resolvedPath = Resolve-NativeCommandPath -CommandInfo `$commandInfo
if (`$resolvedPath -ine `$commandInfo.Source) {
    throw "ApplicationInfo path resolution returned '`$resolvedPath' instead of '`$(`$commandInfo.Source)'."
}
`$nativeResult = Invoke-NativeCommandCapture -Executable '$escapedNativeStderrProbe' -Arguments @('--version')
if (`$nativeResult.ExitCode -ne 0) {
    throw "Native stderr probe returned exit code `$(`$nativeResult.ExitCode)."
}
if (`$nativeResult.Output -notcontains 'Composer version test' -or `$nativeResult.Output -notcontains 'PHP version 8.3.33') {
    throw "Native stderr probe did not capture stdout and stderr: `$(`$nativeResult.Output -join ' | ')"
}
Set-Content -LiteralPath '$escapedMarker' -Value 'PASS' -Encoding ASCII
"@
    Set-Content -LiteralPath $commandResolutionProbe -Value $probeSource -Encoding UTF8

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $commandResolutionProbe
    if ($LASTEXITCODE -ne 0) {
        throw "Command-resolution probe exited with code $LASTEXITCODE."
    }
    if (-not (Test-Path -LiteralPath $commandResolutionMarker -PathType Leaf)) {
        throw 'Command-resolution probe did not reach the ApplicationInfo assertion.'
    }

    Write-Host 'PASS: runtime php.ini is configured beside PHP, project php.ini is untouched, and reruns are idempotent.' -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $testRoot) {
        Remove-Item -LiteralPath $testRoot -Recurse -Force
    }
}
