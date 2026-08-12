Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$scriptPath = Join-Path $repositoryRoot 'Infra\remove-docker-wsl-windows.ps1'

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Required production script is missing: Infra\remove-docker-wsl-windows.ps1"
}

$global:PreviewMutatorCalls = New-Object System.Collections.Generic.List[string]

function global:Stop-Process { $global:PreviewMutatorCalls.Add('Stop-Process') }
function global:Stop-Service { $global:PreviewMutatorCalls.Add('Stop-Service') }
function global:Remove-Item { $global:PreviewMutatorCalls.Add('Remove-Item') }
function global:Remove-AppxPackage { $global:PreviewMutatorCalls.Add('Remove-AppxPackage') }
function global:Disable-WindowsOptionalFeature { $global:PreviewMutatorCalls.Add('Disable-WindowsOptionalFeature') }
Set-Item -Path Function:\global:wsl.exe -Value {
    if ($args -match '--shutdown|--unregister') { $global:PreviewMutatorCalls.Add("wsl.exe $($args -join ' ')") }
    @("Ubuntu`0", "`0")
}
Set-Item -Path Function:\global:winget.exe -Value {
    if ($args -match 'uninstall') { $global:PreviewMutatorCalls.Add("winget.exe $($args -join ' ')") }
    'Winget preview proxy'
}
Set-Item -Path Function:\global:dism.exe -Value {
    if ($args -match 'disable-feature') { $global:PreviewMutatorCalls.Add("dism.exe $($args -join ' ')") }
    'DISM preview proxy'
}
Set-Item -Path Function:\global:docker.exe -Value {
    if ($args -match 'rm|prune') { $global:PreviewMutatorCalls.Add("docker.exe $($args -join ' ')") }
    'Docker preview proxy'
}

$result = & $scriptPath *>&1
$exitCode = if (Test-Path -LiteralPath 'Variable:global:LASTEXITCODE') { $global:LASTEXITCODE } else { 0 }
if ($exitCode -ne 0) { throw 'Preview mode must exit successfully.' }
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

if ($global:PreviewMutatorCalls.Count -ne 0) {
    throw "Preview called a mutator: $($global:PreviewMutatorCalls -join ', ')"
}

. $scriptPath
function Assert-SafeRemovalRejected {
    param([string]$Path, [string]$Parent, [string]$Description)

    try {
        Safe-RemoveDirectory -LiteralPath $Path -ExpectedParent $Parent
        throw "Safe-RemoveDirectory accepted $Description."
    }
    catch {
        if ($_.Exception.Message -eq "Safe-RemoveDirectory accepted $Description.") { throw }
    }
}

$driveRoot = [IO.Path]::GetPathRoot($repositoryRoot)
Assert-SafeRemovalRejected -Path $repositoryRoot -Parent $repositoryRoot -Description 'the repository root'
Assert-SafeRemovalRejected -Path $driveRoot -Parent $repositoryRoot -Description 'the drive root'
if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
    Assert-SafeRemovalRejected -Path $env:USERPROFILE -Parent (Split-Path -Path $env:USERPROFILE -Parent) -Description 'the user-profile root'
}
