$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$scriptPath = Join-Path $repositoryRoot 'Infra\start-local-web-windows.ps1'

function Get-FreeTcpPort {
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
    $listener.Stop()
    return $port
}

Describe 'start-local-web-windows MySQL service discovery' {
    It 'selects MySQL84 when it is the installed MySQL service' {
        Mock Get-Service {
            [pscustomobject]@{ Name = 'MySQL84'; Status = 'Running' }
        }

        (& $scriptPath -CheckMySqlServiceOnly) | Should Be 'MySQL service selected: MySQL84 (Running)'
    }

    It 'prefers a running MySQL84 service over a stopped MySQL80 service' {
        Mock Get-Service {
            @(
                [pscustomobject]@{ Name = 'MySQL80'; Status = 'Stopped' }
                [pscustomobject]@{ Name = 'MySQL84'; Status = 'Running' }
            )
        }

        (& $scriptPath -CheckMySqlServiceOnly) | Should Be 'MySQL service selected: MySQL84 (Running)'
    }

    It 'honors the phpMyAdmin skip switch' {
        $caseRoot = Join-Path $TestDrive 'phpmyadmin skip'
        New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
        Copy-Item -LiteralPath $scriptPath -Destination (Join-Path $caseRoot 'start-local-web-windows.ps1')
        (& (Join-Path $caseRoot 'start-local-web-windows.ps1') -CheckPhpMyAdminOnly -SkipPhpMyAdmin) | Should Be 'phpMyAdmin startup skipped.'
    }

    It 'returns success when the installed phpMyAdmin endpoint is already running' {
        $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -CheckPhpMyAdminOnly -NoBrowser 2>&1

        $LASTEXITCODE | Should Be 0
        ($output -join "`n") | Should Match 'phpMyAdmin already running'
    }

    It 'starts phpMyAdmin without a separate helper script' {
        $caseRoot = Join-Path $TestDrive 'self-contained launcher'
        $runtimeRoot = Join-Path $caseRoot '.native-runtime'
        $documentRoot = Join-Path $runtimeRoot 'phpmyadmin-5.2.3'
        New-Item -ItemType Directory -Path $documentRoot -Force | Out-Null
        Copy-Item -LiteralPath $scriptPath -Destination (Join-Path $caseRoot 'start-local-web-windows.ps1')
        Set-Content -LiteralPath (Join-Path $documentRoot 'index.php') -Value '<?php echo "phpmyadmin-fixture";' -Encoding ASCII
        $port = Get-FreeTcpPort
        $stdoutPath = Join-Path $caseRoot 'launcher.out.log'
        $stderrPath = Join-Path $caseRoot 'launcher.err.log'

        try {
            $launcher = Start-Process -FilePath powershell.exe -ArgumentList @(
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-File', ('"{0}"' -f (Join-Path $caseRoot 'start-local-web-windows.ps1')),
                '-CheckPhpMyAdminOnly',
                '-PhpMyAdminPort', $port,
                '-NoBrowser'
            ) -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
            $launcher.WaitForExit()
            $output = @(
                Get-Content -LiteralPath $stdoutPath -ErrorAction SilentlyContinue
                Get-Content -LiteralPath $stderrPath -ErrorAction SilentlyContinue
            )

            $launcher.ExitCode | Should Be 0
            ($output -join "`n") | Should Match "phpMyAdmin ready: http://127.0.0.1:$port"
            (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/" -TimeoutSec 5).Content | Should Be 'phpmyadmin-fixture'
            Test-Path -LiteralPath (Join-Path $runtimeRoot 'phpmyadmin.pid') -PathType Leaf | Should Be $true
        }
        finally {
            $pidPath = Join-Path $runtimeRoot 'phpmyadmin.pid'
            if (Test-Path -LiteralPath $pidPath) {
                Stop-Process -Id ([int](Get-Content -LiteralPath $pidPath)) -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
