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

    It 'launches both native scripts from the repository root without profile prompts' {
        foreach ($name in @('build-local-web-windows.bat', 'start-local-web-windows.bat')) {
            $launcher = Get-Content -Raw (Join-Path $infraRoot $name)

            $launcher | Should Match 'REPO_ROOT=%~dp0\.\.'
            $launcher | Should Match 'pushd "%REPO_ROOT%"'
            $launcher | Should Match '-NoProfile -NonInteractive'
            $launcher | Should Match 'POWERSHELL_EXE'
            $launcher | Should Match 'popd'
        }
    }
}
