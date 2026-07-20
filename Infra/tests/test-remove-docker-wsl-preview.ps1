Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$scriptPath = Join-Path $repositoryRoot 'Infra\remove-docker-wsl-windows.ps1'

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Required production script is missing: Infra\remove-docker-wsl-windows.ps1"
}

$result = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Preview mode must exit successfully.' }
$text = $result -join [Environment]::NewLine
foreach ($required in @('PREVIEW', 'Docker', 'WSL')) {
    if ($text -notmatch [regex]::Escape($required)) {
        throw "Preview output is missing '$required'."
    }
}
foreach ($forbidden in @('EXECUTED: DISM', 'EXECUTED: WINGET UNINSTALL', 'EXECUTED: WSL UNREGISTER', 'EXECUTED: REMOVE DIRECTORY')) {
    if ($text -match [regex]::Escape($forbidden)) {
        throw "Preview performed a destructive action: $forbidden"
    }
}
