$infraRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $infraRoot 'start-phpmyadmin-windows.ps1'
$batchPath = Join-Path $infraRoot 'start-phpmyadmin-windows.bat'

function Get-FreeTcpPort {
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
    $listener.Stop()
    return $port
}

function Invoke-PhpMyAdminLauncher {
    param(
        [Parameter(Mandatory)][string]$RuntimeRoot,
        [Parameter(Mandatory)][string]$PhpExecutable,
        [Parameter(Mandatory)][int]$Port,
        [int]$ReadyTimeoutSeconds = 10
    )

    $wrapperOut = Join-Path $RuntimeRoot 'wrapper.out.log'
    $wrapperErr = Join-Path $RuntimeRoot 'wrapper.err.log'
    New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
    Remove-Item -LiteralPath $wrapperOut,$wrapperErr -Force -ErrorAction SilentlyContinue
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', "`"$scriptPath`"",
        '-RuntimeRoot', "`"$RuntimeRoot`"",
        '-PhpExecutable', "`"$PhpExecutable`"",
        '-Port', $Port,
        '-ReadyTimeoutSeconds', $ReadyTimeoutSeconds,
        '-SkipSetupCheck',
        '-SkipMySqlCheck',
        '-NoBrowser'
    )
    $wrapper = Start-Process -FilePath powershell.exe `
        -ArgumentList $arguments `
        -RedirectStandardOutput $wrapperOut `
        -RedirectStandardError $wrapperErr `
        -PassThru
    if (-not $wrapper.WaitForExit(15000)) {
        Stop-Process -Id $wrapper.Id -Force -ErrorAction SilentlyContinue
        throw 'The phpMyAdmin launcher did not exit within 15 seconds.'
    }
    return @{
        ExitCode = $wrapper.ExitCode
        Output = @(
            if (Test-Path -LiteralPath $wrapperOut) { Get-Content -LiteralPath $wrapperOut }
            if (Test-Path -LiteralPath $wrapperErr) { Get-Content -LiteralPath $wrapperErr }
        )
    }
}

Describe 'start-phpmyadmin-windows' {
    It 'provides the PowerShell service launcher' {
        Test-Path -LiteralPath $scriptPath -PathType Leaf | Should Be $true
    }

    It 'provides the batch service launcher' {
        Test-Path -LiteralPath $batchPath -PathType Leaf | Should Be $true
    }

    if (Test-Path -LiteralPath $scriptPath -PathType Leaf) {
        It 'starts a real loopback PHP endpoint and is idempotent' {
            $runtimeRoot = Join-Path $TestDrive 'runtime'
            $documentRoot = Join-Path $runtimeRoot 'phpmyadmin-5.2.3'
            New-Item -ItemType Directory -Path $documentRoot -Force | Out-Null
            Set-Content -LiteralPath (Join-Path $documentRoot 'index.php') -Value '<?php echo "phpmyadmin-fixture";' -Encoding ASCII
            $php = (Get-Command php -ErrorAction Stop).Source
            $port = Get-FreeTcpPort

            try {
                $firstResult = Invoke-PhpMyAdminLauncher -RuntimeRoot $runtimeRoot -PhpExecutable $php -Port $port
                $firstResult.ExitCode | Should Be 0
                ($firstResult.Output -join "`n") | Should Match "phpMyAdmin ready: http://127\.0\.0\.1:$port"
                (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/" -TimeoutSec 5).Content | Should Be 'phpmyadmin-fixture'

                $pidPath = Join-Path $runtimeRoot 'phpmyadmin.pid'
                Test-Path -LiteralPath $pidPath -PathType Leaf | Should Be $true
                $firstPid = [int](Get-Content -LiteralPath $pidPath)
                (Get-Process -Id $firstPid -ErrorAction SilentlyContinue) | Should Not BeNullOrEmpty
                Test-Path -LiteralPath (Join-Path $runtimeRoot 'logs/phpmyadmin.out.log') -PathType Leaf | Should Be $true
                Test-Path -LiteralPath (Join-Path $runtimeRoot 'logs/phpmyadmin.err.log') -PathType Leaf | Should Be $true

                $secondResult = Invoke-PhpMyAdminLauncher -RuntimeRoot $runtimeRoot -PhpExecutable $php -Port $port
                $secondResult.ExitCode | Should Be 0
                ($secondResult.Output -join "`n") | Should Match 'already running'
                [int](Get-Content -LiteralPath $pidPath) | Should Be $firstPid
            }
            finally {
                $pidPath = Join-Path $runtimeRoot 'phpmyadmin.pid'
                if (Test-Path -LiteralPath $pidPath) {
                    $processId = [int](Get-Content -LiteralPath $pidPath)
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Wait-Process -Id $processId -ErrorAction SilentlyContinue
                }
            }
        }

        It 'rejects a port occupied by a different service' {
            $runtimeRoot = Join-Path $TestDrive 'occupied'
            $documentRoot = Join-Path $runtimeRoot 'phpmyadmin-5.2.3'
            New-Item -ItemType Directory -Path $documentRoot -Force | Out-Null
            Set-Content -LiteralPath (Join-Path $documentRoot 'index.php') -Value '<?php echo "fixture";' -Encoding ASCII
            $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
            $listener.Start()
            $port = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
            try {
                $result = Invoke-PhpMyAdminLauncher `
                    -RuntimeRoot $runtimeRoot `
                    -PhpExecutable (Get-Command php).Source `
                    -Port $port
                $result.ExitCode | Should Not Be 0
            }
            finally {
                $listener.Stop()
            }
        }
    }

    if (Test-Path -LiteralPath $batchPath -PathType Leaf) {
        It 'forwards arguments and preserves the launcher exit code' {
            $caseRoot = Join-Path $TestDrive 'batch'
            New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
            Copy-Item -LiteralPath $batchPath -Destination (Join-Path $caseRoot 'start-phpmyadmin-windows.bat')
            Set-Content -LiteralPath (Join-Path $caseRoot 'start-phpmyadmin-windows.ps1') -Value @'
param([int]$Port)
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'port.txt') -Value $Port -Encoding ASCII
exit 17
'@ -Encoding UTF8

            & cmd.exe /d /c "`"$caseRoot\start-phpmyadmin-windows.bat`" -Port 18081"

            $LASTEXITCODE | Should Be 17
            Get-Content -LiteralPath (Join-Path $caseRoot 'port.txt') | Should Be '18081'
        }
    }
}
