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
Assert-False (Test-MySql80Version -VersionText 'mysql  Ver 8.4.0 for Win64; compatibility 8.0.46') 'An unrelated 8.0 substring must not satisfy the MySQL version gate.'

$serverPath = Get-ExecutablePathFromServicePath -PathName '"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\my.ini" MySQL80'
Assert-True ($serverPath -eq 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe') 'The MySQL80 service executable path must be extracted without arguments.'

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

Assert-True ((Get-Content -LiteralPath $setupScript -Raw) -match '\$PSCmdlet\.ShouldProcess') 'The setup script must honor SupportsShouldProcess.'

function Get-PathSnapshot {
    param([Parameter(Mandatory)][string[]]$Paths)

    return @($Paths | ForEach-Object {
        if (Test-Path -LiteralPath $_ -PathType Leaf) {
            $item = Get-Item -LiteralPath $_
            [pscustomobject]@{ Path = $_; Exists = $true; Length = $item.Length; LastWriteUtc = $item.LastWriteTimeUtc.Ticks; Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_).Hash }
        }
        else {
            [pscustomobject]@{ Path = $_; Exists = $false; Length = 0; LastWriteUtc = 0; Hash = '' }
        }
    } | ConvertTo-Json -Compress)
}

$sentinelDirectory = Join-Path $env:TEMP ('seongon-lms-whatif-' + [guid]::NewGuid().ToString('N'))
$mutationSentinel = Join-Path $sentinelDirectory 'mutation-attempted.txt'
$snapshotPaths = @(
    $setupScript,
    (Join-Path $repositoryRoot 'BE\.env'),
    (Join-Path $repositoryRoot 'BE\.env.example'),
    (Join-Path $repositoryRoot 'FE\DEMO\package-lock.json')
)
$beforeSnapshot = Get-PathSnapshot -Paths $snapshotPaths
New-Item -ItemType Directory -Path $sentinelDirectory | Out-Null
try {
    $guardScript = "@echo off`r`necho guard-version`r`nif /I `"%1`"==`"install`" echo mutation>%SEONGON_LMS_MUTATION_SENTINEL%`r`nif /I `"%1`"==`"ci`" echo mutation>%SEONGON_LMS_MUTATION_SENTINEL%`r`nexit /b 0`r`n"
    Set-Content -LiteralPath (Join-Path $sentinelDirectory 'composer.bat') -Value $guardScript -Encoding ASCII
    Set-Content -LiteralPath (Join-Path $sentinelDirectory 'npm.cmd') -Value $guardScript -Encoding ASCII
    $pwshPath = (Get-Command pwsh.exe -ErrorAction Stop).Source
    $previousPath = $env:Path
    $env:Path = $sentinelDirectory + ';' + $env:Path
    $env:SEONGON_LMS_MUTATION_SENTINEL = $mutationSentinel
    try {
        $whatIfOutput = & $pwshPath -NoProfile -ExecutionPolicy Bypass -File $setupScript -WhatIf *>&1 | Out-String
        $whatIfExitCode = $LASTEXITCODE
    }
    finally {
        $env:Path = $previousPath
        Remove-Item Env:SEONGON_LMS_MUTATION_SENTINEL -ErrorAction SilentlyContinue
    }
    Assert-True ($whatIfExitCode -eq 0) '-WhatIf child process must exit with code 0.'
    Assert-True ($whatIfOutput -match 'WhatIf mode: preflight only') '-WhatIf must route to the read-only preflight path.'
    Assert-False (Test-Path -LiteralPath $mutationSentinel) '-WhatIf must not invoke guarded external mutators.'
    Assert-True ((Get-PathSnapshot -Paths $snapshotPaths) -eq $beforeSnapshot) '-WhatIf must not change relevant repository files.'
}
finally {
    if (Test-Path -LiteralPath $sentinelDirectory) {
        Remove-Item -LiteralPath $sentinelDirectory -Recurse -Force
    }
}

Write-Host 'Native Windows setup behavior checks passed.'
