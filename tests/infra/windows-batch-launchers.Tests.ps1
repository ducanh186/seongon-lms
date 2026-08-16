$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$infraRoot = Join-Path $repositoryRoot 'Infra'

Describe 'Windows batch launchers' {
    It 'starts the local web launcher and preserves its exit code' {
        $launcher = Join-Path $infraRoot 'start-local-web-windows.bat'

        Test-Path -LiteralPath $launcher -PathType Leaf | Should Be $true
        $output = & cmd.exe /d /c "`"$launcher`" -CheckPhpMyAdminOnly -NoBrowser" 2>&1
        $LASTEXITCODE | Should Be 0
        ($output -join "`n") | Should Match 'phpMyAdmin (already running|ready)'
    }

    It 'checks the build launcher and preserves its exit code' {
        $launcher = Join-Path $infraRoot 'build-local-web-windows.bat'

        Test-Path -LiteralPath $launcher -PathType Leaf | Should Be $true
        $output = & cmd.exe /d /c "`"$launcher`" -CheckOnly" 2>&1
        $LASTEXITCODE | Should Be 0
        ($output -join "`n") | Should Match 'Dependencies: ready'
    }
}
