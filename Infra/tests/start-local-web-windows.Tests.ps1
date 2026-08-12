$scriptPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'start-local-web-windows.ps1'

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

    It 'starts both local service windows hidden' {
        $content = Get-Content -LiteralPath $scriptPath -Raw

        ([regex]::Matches($content, '-WindowStyle Hidden')).Count | Should Be 2
        $content | Should Not Match '-WindowStyle Minimized'
    }

    It 'lets failed child processes exit and captures diagnosable logs' {
        $content = Get-Content -LiteralPath $scriptPath -Raw

        $content | Should Not Match "'-NoExit'"
        ([regex]::Matches($content, '-RedirectStandardOutput')).Count | Should Be 2
        ([regex]::Matches($content, '-RedirectStandardError')).Count | Should Be 2
        $content | Should Match 'Get-ChildFailureMessage'
        $content | Should Match 'Exit code'
    }
}
