$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$scriptPath = Join-Path $repoRoot 'Infra\build-local-web-windows.ps1'

function New-PhpMyAdminFixture {
    param([Parameter(Mandatory = $true)][string]$Root)

    $packageRoot = Join-Path $Root 'phpMyAdmin-5.2.3-all-languages'
    New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $packageRoot 'index.php') -Value '<?php echo "fixture";' -Encoding ASCII
    $vendorRoot = Join-Path $packageRoot 'vendor'
    $polyfillRoot = Join-Path $vendorRoot 'symfony\polyfill-php80'
    New-Item -ItemType Directory -Path $polyfillRoot -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $vendorRoot 'autoload.php') -Value '<?php echo "autoload fixture";' -Encoding ASCII
    Set-Content -LiteralPath (Join-Path $polyfillRoot 'bootstrap.php') -Value '<?php echo "polyfill fixture";' -Encoding ASCII

    $archivePath = Join-Path $Root 'phpMyAdmin-5.2.3-all-languages.zip'
    Compress-Archive -LiteralPath $packageRoot -DestinationPath $archivePath -Force
    $checksumPath = Join-Path $Root 'phpMyAdmin-5.2.3-all-languages.zip.sha256'
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToLowerInvariant()
    Set-Content -LiteralPath $checksumPath -Value "$hash  phpMyAdmin-5.2.3-all-languages.zip" -Encoding ASCII

    $fakePhp = Join-Path $Root 'php.ps1'
    Set-Content -LiteralPath $fakePhp -Value @'
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PhpArgs)
if ($PhpArgs[0] -eq '-r') { '8.3.26'; exit 0 }
if ($PhpArgs[0] -eq '-m') { 'mysqli'; exit 0 }
throw "Unexpected PHP arguments: $($PhpArgs -join ' ')"
'@ -Encoding UTF8

    return @{
        Archive = $archivePath
        Checksum = $checksumPath
        Php = $fakePhp
    }
}

Describe 'build-local-web-windows phpMyAdmin preparation' {
    It 'installs a verified phpMyAdmin package and generates local cookie configuration' {
        $caseRoot = Join-Path $TestDrive 'valid'
        $runtimeRoot = Join-Path $caseRoot 'runtime'
        New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
        $fixture = New-PhpMyAdminFixture -Root $caseRoot

        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
            -PreparePhpMyAdminOnly `
            -RuntimeRoot $runtimeRoot `
            -PhpExecutable $fixture.Php `
            -PhpMyAdminArchiveSource $fixture.Archive `
            -PhpMyAdminChecksumSource $fixture.Checksum

        $LASTEXITCODE | Should Be 0
        $installRoot = Join-Path $runtimeRoot 'phpmyadmin-5.2.3'
        Test-Path -LiteralPath (Join-Path $installRoot 'index.php') -PathType Leaf | Should Be $true
        $config = Get-Content -Raw -LiteralPath (Join-Path $installRoot 'config.inc.php')
        $config | Should Match "auth_type'\] = 'cookie'"
        $config | Should Match "host'\] = '127\.0\.0\.1'"
        $config | Should Match "port'\] = '3306'"
        $config | Should Not Match 'DB_PASSWORD'
        [regex]::Match($config, "blowfish_secret'\] = '([^']+)'").Groups[1].Value.Length | Should BeGreaterThan 20
    }

    It 'rejects a package whose SHA-256 does not match' {
        $caseRoot = Join-Path $TestDrive 'bad-checksum'
        $runtimeRoot = Join-Path $caseRoot 'runtime'
        New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
        $fixture = New-PhpMyAdminFixture -Root $caseRoot
        Set-Content -LiteralPath $fixture.Checksum -Value (('0' * 64) + '  phpMyAdmin.zip') -Encoding ASCII

        $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
            -PreparePhpMyAdminOnly `
            -RuntimeRoot $runtimeRoot `
            -PhpExecutable $fixture.Php `
            -PhpMyAdminArchiveSource $fixture.Archive `
            -PhpMyAdminChecksumSource $fixture.Checksum 2>&1

        $LASTEXITCODE | Should Not Be 0
        ($output -join "`n") | Should Match 'SHA-256 mismatch'
        Test-Path -LiteralPath (Join-Path $runtimeRoot 'phpmyadmin-5.2.3') | Should Be $false
    }

    It 'replaces a partial phpMyAdmin installation whose vendor files are missing' {
        $caseRoot = Join-Path $TestDrive 'partial-install'
        $runtimeRoot = Join-Path $caseRoot 'runtime'
        $installRoot = Join-Path $runtimeRoot 'phpmyadmin-5.2.3'
        New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $installRoot 'index.php') -Value '<?php echo "partial";' -Encoding ASCII
        $fixture = New-PhpMyAdminFixture -Root $caseRoot

        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
            -PreparePhpMyAdminOnly `
            -RuntimeRoot $runtimeRoot `
            -PhpExecutable $fixture.Php `
            -PhpMyAdminArchiveSource $fixture.Archive `
            -PhpMyAdminChecksumSource $fixture.Checksum

        $LASTEXITCODE | Should Be 0
        Test-Path -LiteralPath (Join-Path $installRoot 'vendor\autoload.php') -PathType Leaf | Should Be $true
        Test-Path -LiteralPath (Join-Path $installRoot 'vendor\symfony\polyfill-php80\bootstrap.php') -PathType Leaf | Should Be $true
    }
}
