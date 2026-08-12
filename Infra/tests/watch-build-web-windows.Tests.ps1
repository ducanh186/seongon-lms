$ErrorActionPreference = 'Stop'

$infraDirectory = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $infraDirectory 'watch-build-web-windows.bat'

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Watch-build launcher is missing: $scriptPath"
}

$output = & $scriptPath --verify 2>&1
$exitCode = $LASTEXITCODE
$expectedFrontend = [System.IO.Path]::GetFullPath((Join-Path $infraDirectory '..\FE\DEMO'))
$joinedOutput = $output -join "`n"

if ($exitCode -ne 0) {
    throw "Verify mode exited with $exitCode.`n$joinedOutput"
}

if ($joinedOutput -notmatch [regex]::Escape("Frontend: $expectedFrontend")) {
    throw "Verify output did not report the resolved frontend directory.`n$joinedOutput"
}

if ($joinedOutput -notmatch [regex]::Escape('Command: npm run build -- --watch')) {
    throw "Verify output did not report the Vite watch-build command.`n$joinedOutput"
}

if ($joinedOutput -notmatch 'Dependencies: (ready|npm install --no-audit --no-fund required)') {
    throw "Verify output did not report dependency readiness.`n$joinedOutput"
}

Write-Host 'PASS: watch-build launcher resolves the project and verifies its bounded command contract.'
