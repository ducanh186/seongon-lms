param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot
)

$resolvedProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$uaDir = Join-Path $resolvedProjectRoot '.ua'
$resolvedUaDir = (Resolve-Path -LiteralPath $uaDir).Path

if (-not $resolvedUaDir.StartsWith($resolvedProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing cleanup outside project root: $resolvedUaDir"
}

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$trashDir = Join-Path $resolvedUaDir ".trash-$timestamp"
New-Item -ItemType Directory -Path $trashDir -Force | Out-Null

$intermediateDir = Join-Path $resolvedUaDir 'intermediate'
if (Test-Path -LiteralPath $intermediateDir) {
    Get-ChildItem -LiteralPath $intermediateDir -Force |
        Where-Object { $_.Name -ne 'scan-result.json' } |
        ForEach-Object { Move-Item -LiteralPath $_.FullName -Destination $trashDir }
}

$tmpDir = Join-Path $resolvedUaDir 'tmp'
if (Test-Path -LiteralPath $tmpDir) {
    Move-Item -LiteralPath $tmpDir -Destination $trashDir
}

Write-Output "Preserved: $intermediateDir\scan-result.json"
Write-Output "Moved scratch artifacts to: $trashDir"
