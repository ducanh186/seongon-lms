$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$infraDirectory = Join-Path $repositoryRoot 'Infra'
$scriptPath = Join-Path $infraDirectory 'build-local-web-windows.ps1'

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Build launcher is missing: $scriptPath"
}

$output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -CheckOnly 2>&1
$exitCode = $LASTEXITCODE
$expectedFrontend = [System.IO.Path]::GetFullPath((Join-Path $infraDirectory '..\FE\DEMO'))
$expectedBackend = [System.IO.Path]::GetFullPath((Join-Path $infraDirectory '..\BE'))
$joinedOutput = $output -join "`n"

if ($exitCode -ne 0) {
    throw "Verify mode exited with $exitCode.`n$joinedOutput"
}

if ($joinedOutput -notmatch [regex]::Escape("Backend: $expectedBackend")) {
    throw "Verify output did not report the resolved backend directory.`n$joinedOutput"
}

if ($joinedOutput -notmatch [regex]::Escape("Frontend: $expectedFrontend")) {
    throw "Verify output did not report the resolved frontend directory.`n$joinedOutput"
}

if ($joinedOutput -notmatch 'Dependencies: ready') {
    throw "Verify output did not report dependency readiness.`n$joinedOutput"
}

Write-Host 'PASS: build launcher resolves both applications and verifies required dependencies.'
