Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$setupScript = Join-Path $repositoryRoot 'Infra\setup-native-windows.ps1'

function Assert-True {
    param([Parameter(Mandatory)][bool]$Condition, [Parameter(Mandatory)][string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-False {
    param([Parameter(Mandatory)][bool]$Condition, [Parameter(Mandatory)][string]$Message)
    if ($Condition) { throw $Message }
}

function Assert-Throws {
    param([Parameter(Mandatory)][scriptblock]$Action, [Parameter(Mandatory)][string]$Message)
    try {
        & $Action
    }
    catch {
        return
    }
    throw $Message
}

# Dot-sourcing with -PreflightOnly loads the pure helpers without entering any mutation path.
. $setupScript -PreflightOnly | Out-Null

Assert-True (Test-Php83Runtime -VersionText 'PHP 8.3.26 (cli)') 'PHP 8.3 must be accepted.'
Assert-False (Test-Php83Runtime -VersionText 'PHP 8.2.30 (cli)') 'PHP 8.2 must be rejected.'
Assert-True (Test-Node22Runtime -VersionText 'v22.22.2') 'Node 22 must be accepted.'
Assert-False (Test-Node22Runtime -VersionText 'v20.19.0') 'Node 20 must be rejected.'

Assert-True (Test-MySql80Version -VersionText 'mysql  Ver 8.0.46 for Win64 on x86_64') 'MySQL 8.0 must be accepted.'
Assert-False (Test-MySql80Version -VersionText 'mysql  Ver 8.4.0 for Win64 on x86_64') 'MySQL 8.4 must be rejected.'
Assert-False (Test-MySql80Version -VersionText 'mysql  Ver 15.1 Distrib 10.11.6-MariaDB') 'MariaDB must be rejected.'

$serializedPassword = ConvertTo-MySqlOptionFileValue -Value 'space " quote # hash ; semi \ slash'
Assert-True ($serializedPassword -eq '"space \" quote # hash ; semi \\ slash"') 'MySQL option-file value must quote spaces and escape quote/backslash.'
Assert-Throws -Action { ConvertTo-MySqlOptionFileValue -Value "line`nbreak" } -Message 'MySQL option-file value must reject line breaks.'

$arguments = New-MySqlTcpArguments
Assert-True (($arguments -join ' ') -eq '--host=127.0.0.1 --port=3306 --protocol=tcp') 'MySQL connection must be pinned to local TCP 127.0.0.1:3306.'

$validSha384 = ('a' * 96)
Assert-True ((ConvertTo-NormalizedSha384 -Value $validSha384) -eq $validSha384) 'A 96-character SHA-384 digest must be accepted.'
Assert-Throws -Action { ConvertTo-NormalizedSha384 -Value ($validSha384 + 'unexpected') } -Message 'Malformed SHA-384 text must be rejected.'

Assert-ExternalCommandSucceeded -ExitCode 0 -Operation 'test command'
Assert-Throws -Action { Assert-ExternalCommandSucceeded -ExitCode 7 -Operation 'test command' } -Message 'A nonzero external command exit code must throw.'

$pwshPath = (Get-Command pwsh.exe -ErrorAction Stop).Source
$whatIfOutput = & $pwshPath -NoProfile -ExecutionPolicy Bypass -File $setupScript -WhatIf *>&1 | Out-String
Assert-True ($whatIfOutput -match 'WhatIf mode: preflight only') '-WhatIf must route to the read-only preflight path.'

Write-Host 'Native Windows setup behavior checks passed.'
