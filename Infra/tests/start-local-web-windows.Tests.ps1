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

        ([regex]::Matches($content, '-WindowStyle Hidden')).Count | Should Be 3
        $content | Should Not Match '-WindowStyle Minimized'
    }

    It 'lets failed child processes exit and captures diagnosable logs' {
        $content = Get-Content -LiteralPath $scriptPath -Raw

        $content | Should Not Match "'-NoExit'"
        ([regex]::Matches($content, '-RedirectStandardOutput')).Count | Should Be 3
        ([regex]::Matches($content, '-RedirectStandardError')).Count | Should Be 3
        $content | Should Match 'Get-ChildFailureMessage'
        $content | Should Match 'Exit code'
    }

    It 'checks phpMyAdmin by default and honors the skip switch' {
        $caseRoot = Join-Path $TestDrive 'phpmyadmin integration'
        New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
        Copy-Item -LiteralPath $scriptPath -Destination (Join-Path $caseRoot 'start-local-web-windows.ps1')
        Set-Content -LiteralPath (Join-Path $caseRoot 'start-phpmyadmin-windows.ps1') -Value @'
param([switch]$CheckOnly, [switch]$SkipMySqlCheck, [switch]$NoBrowser)
if (-not $CheckOnly -or -not $SkipMySqlCheck -or -not $NoBrowser) { exit 19 }
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'phpmyadmin.marker') -Value 'checked' -Encoding ASCII
exit 0
'@ -Encoding UTF8

        & (Join-Path $caseRoot 'start-local-web-windows.ps1') -CheckPhpMyAdminOnly
        Get-Content -LiteralPath (Join-Path $caseRoot 'phpmyadmin.marker') | Should Be 'checked'

        Remove-Item -LiteralPath (Join-Path $caseRoot 'phpmyadmin.marker') -Force
        (& (Join-Path $caseRoot 'start-local-web-windows.ps1') -CheckPhpMyAdminOnly -SkipPhpMyAdmin) | Should Be 'phpMyAdmin startup skipped.'
        Test-Path -LiteralPath (Join-Path $caseRoot 'phpmyadmin.marker') | Should Be $false
    }
}
