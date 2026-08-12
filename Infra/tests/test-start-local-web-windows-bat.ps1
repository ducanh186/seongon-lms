Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Describe 'start-local-web-windows.bat' {
    BeforeAll {
        $script:sourceBat = Join-Path (Split-Path -Parent $PSScriptRoot) 'start-local-web-windows.bat'
    }

    It 'exists beside the PowerShell launcher' {
        Test-Path -LiteralPath $script:sourceBat -PathType Leaf | Should Be $true
    }

    It 'runs the sibling PowerShell launcher from a foreign working directory' {
        $caseRoot = Join-Path $TestDrive 'success case'
        New-Item -ItemType Directory -Path $caseRoot | Out-Null
        Copy-Item -LiteralPath $script:sourceBat -Destination (Join-Path $caseRoot 'start-local-web-windows.bat')
        Set-Content -LiteralPath (Join-Path $caseRoot 'start-local-web-windows.ps1') -Encoding ASCII -Value @'
$marker = Join-Path $PSScriptRoot 'success.marker'
Set-Content -LiteralPath $marker -Value 'started'
exit 0
'@

        Push-Location $TestDrive
        try {
            & cmd.exe /d /c "`"$caseRoot\start-local-web-windows.bat`""
            $exitCode = $LASTEXITCODE
        }
        finally {
            Pop-Location
        }

        $exitCode | Should Be 0
        Get-Content -LiteralPath (Join-Path $caseRoot 'success.marker') | Should Be 'started'
    }

    It 'preserves the PowerShell failure exit code' {
        $caseRoot = Join-Path $TestDrive 'failure case'
        New-Item -ItemType Directory -Path $caseRoot | Out-Null
        Copy-Item -LiteralPath $script:sourceBat -Destination (Join-Path $caseRoot 'start-local-web-windows.bat')
        Set-Content -LiteralPath (Join-Path $caseRoot 'start-local-web-windows.ps1') -Encoding ASCII -Value 'exit 23'

        & cmd.exe /d /c "echo. | `"$caseRoot\start-local-web-windows.bat`""

        $LASTEXITCODE | Should Be 23
    }

    It 'returns code 2 when the sibling PowerShell launcher is missing' {
        $caseRoot = Join-Path $TestDrive 'missing case'
        New-Item -ItemType Directory -Path $caseRoot | Out-Null
        Copy-Item -LiteralPath $script:sourceBat -Destination (Join-Path $caseRoot 'start-local-web-windows.bat')

        & cmd.exe /d /c "echo. | `"$caseRoot\start-local-web-windows.bat`""

        $LASTEXITCODE | Should Be 2
    }
}
