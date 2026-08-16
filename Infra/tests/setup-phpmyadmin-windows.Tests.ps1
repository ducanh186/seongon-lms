$infraRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $infraRoot 'setup-phpmyadmin-windows.ps1'
$batchPath = Join-Path $infraRoot 'setup-phpmyadmin-windows.bat'

function New-PhpMyAdminSetupFixture {
    param([Parameter(Mandatory)][string]$Root)

    $packageRoot = Join-Path $Root 'phpMyAdmin-5.2.3-english'
    New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $packageRoot 'index.php') -Value '<?php echo "fixture";' -Encoding ASCII

    $archivePath = Join-Path $Root 'phpMyAdmin-5.2.3-english.zip'
    Compress-Archive -LiteralPath $packageRoot -DestinationPath $archivePath -Force
    $checksumPath = Join-Path $Root 'phpMyAdmin-5.2.3-english.zip.sha256'
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToLowerInvariant()
    Set-Content -LiteralPath $checksumPath -Value "$hash  phpMyAdmin-5.2.3-english.zip" -Encoding ASCII

    $fakePhp = Join-Path $Root 'php.ps1'
    Set-Content -LiteralPath $fakePhp -Value @'
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PhpArgs)
if ($PhpArgs[0] -eq '-r') { '8.3.26'; exit 0 }
if ($PhpArgs[0] -eq '-m') { 'mysqli'; 'mbstring'; 'json'; 'session'; 'ctype'; 'zip'; exit 0 }
throw "Unexpected PHP arguments: $($PhpArgs -join ' ')"
'@ -Encoding UTF8

    return @{
        Archive = $archivePath
        Checksum = $checksumPath
        Php = $fakePhp
    }
}

Describe 'setup-phpmyadmin-windows' {
    It 'provides the PowerShell setup entry point' {
        Test-Path -LiteralPath $scriptPath -PathType Leaf | Should Be $true
    }

    It 'provides the batch setup entry point' {
        Test-Path -LiteralPath $batchPath -PathType Leaf | Should Be $true
    }

    if (Test-Path -LiteralPath $scriptPath -PathType Leaf) {
        It 'installs a checksum-verified package and generates loopback cookie configuration' {
            $caseRoot = Join-Path $TestDrive 'valid'
            $runtimeRoot = Join-Path $caseRoot 'runtime'
            New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
            $fixture = New-PhpMyAdminSetupFixture -Root $caseRoot

            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
                -RuntimeRoot $runtimeRoot `
                -PhpExecutable $fixture.Php `
                -ArchiveSource $fixture.Archive `
                -ChecksumSource $fixture.Checksum `
                -Force

            $LASTEXITCODE | Should Be 0
            $installRoot = Join-Path $runtimeRoot 'phpmyadmin-5.2.3'
            Test-Path -LiteralPath (Join-Path $installRoot 'index.php') -PathType Leaf | Should Be $true
            $config = Get-Content -Raw -LiteralPath (Join-Path $installRoot 'config.inc.php')
            $config | Should Match "auth_type'\] = 'cookie'"
            $config | Should Match "host'\] = '127\.0\.0\.1'"
            $config | Should Match "port'\] = '3306'"
            $config | Should Match "AllowNoPassword'\] = true"
            $config | Should Not Match 'DB_PASSWORD'
            $secretMatch = [regex]::Match($config, "blowfish_secret'\] = '([^']+)'" )
            $secretMatch.Success | Should Be $true
            $secretMatch.Groups[1].Value.Length | Should Be 32

            $checkOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
                -RuntimeRoot $runtimeRoot `
                -PhpExecutable $fixture.Php `
                -CheckOnly 2>&1
            $LASTEXITCODE | Should Be 0
            ($checkOutput -join "`n") | Should Match 'phpMyAdmin 5\.2\.3 is ready'
        }

        It 'rejects a mismatched checksum without publishing an installation' {
            $caseRoot = Join-Path $TestDrive 'bad-checksum'
            $runtimeRoot = Join-Path $caseRoot 'runtime'
            New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
            $fixture = New-PhpMyAdminSetupFixture -Root $caseRoot
            Set-Content -LiteralPath $fixture.Checksum -Value (('0' * 64) + '  phpMyAdmin.zip') -Encoding ASCII

            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
                -RuntimeRoot $runtimeRoot `
                -PhpExecutable $fixture.Php `
                -ArchiveSource $fixture.Archive `
                -ChecksumSource $fixture.Checksum `
                -Force 2>$null

            $LASTEXITCODE | Should Not Be 0
            Test-Path -LiteralPath (Join-Path $runtimeRoot 'phpmyadmin-5.2.3') | Should Be $false
        }
    }

    if (Test-Path -LiteralPath $batchPath -PathType Leaf) {
        It 'forwards arguments and preserves the PowerShell exit code' {
            $caseRoot = Join-Path $TestDrive 'batch'
            New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
            Copy-Item -LiteralPath $batchPath -Destination (Join-Path $caseRoot 'setup-phpmyadmin-windows.bat')
            Set-Content -LiteralPath (Join-Path $caseRoot 'setup-phpmyadmin-windows.ps1') -Value @'
param([string]$Probe)
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'args.txt') -Value $Probe -Encoding ASCII
exit 23
'@ -Encoding UTF8

            & cmd.exe /d /c "`"$caseRoot\setup-phpmyadmin-windows.bat`" -Probe forwarded"

            $LASTEXITCODE | Should Be 23
            Get-Content -LiteralPath (Join-Path $caseRoot 'args.txt') | Should Be 'forwarded'
        }
    }
}
