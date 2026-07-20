Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$runnerPath = Join-Path $repositoryRoot 'Infra\run-native-windows.ps1'
$stateDirectory = Join-Path $repositoryRoot 'Infra\.native-runtime'
$powerShellPath = Join-Path $PSHOME 'powershell.exe'

function Invoke-Runner {
    param([Parameter(Mandatory)][string]$Action)

    $output = & $powerShellPath -NoProfile -ExecutionPolicy Bypass -File $runnerPath $Action 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Runner action '$Action' failed: $($output | Out-String)"
    }
    return ($output | Out-String)
}

function Assert-Contains {
    param(
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Expected
    )

    if ($Text -notmatch [regex]::Escape($Expected)) {
        throw "Expected runner output to contain '$Expected'. Actual: $Text"
    }
}

if (-not (Test-Path -LiteralPath $runnerPath -PathType Leaf)) {
    throw "Native runner is missing: $runnerPath"
}

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
foreach ($fileName in @('backend.pid.json', 'frontend.pid.json', 'native-verified.json')) {
    $path = Join-Path $stateDirectory $fileName
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
    }
}

$statusOutput = Invoke-Runner -Action 'status'
Assert-Contains -Text $statusOutput -Expected 'Backend: stopped'
Assert-Contains -Text $statusOutput -Expected 'Frontend: stopped'

$logsOutput = Invoke-Runner -Action 'logs'
Assert-Contains -Text $logsOutput -Expected 'No native runtime logs found.'

$staleMetadataPath = Join-Path $stateDirectory 'backend.pid.json'
@{
    pid         = $PID
    projectRoot = $repositoryRoot
    role        = 'backend'
} | ConvertTo-Json | Set-Content -LiteralPath $staleMetadataPath -Encoding UTF8

$stopOutput = Invoke-Runner -Action 'stop'
Assert-Contains -Text $stopOutput -Expected 'Backend: stopped'
if (Test-Path -LiteralPath $staleMetadataPath) {
    throw 'A stale backend PID metadata file was not removed.'
}

try {
    [Diagnostics.Process]::GetProcessById($PID) | Out-Null
}
catch {
    throw 'The runner stopped the test process while cleaning stale metadata.'
}

Write-Host 'Native runner behavioral tests passed.'
