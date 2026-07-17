$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$runScript = Join-Path $repoRoot 'Infra\run-docker.ps1'

if (-not (Test-Path -LiteralPath $runScript)) {
    throw 'Missing Infra/run-docker.ps1.'
}

$content = Get-Content -LiteralPath $runScript -Raw

$requiredPatterns = @(
    'Docker\.DockerDesktop',
    '\bwinget\b',
    'Start-Process',
    'Docker Desktop\.exe',
    'Wait-DockerDaemon',
    'WSL 2',
    'virtualization',
    'https://aka\.ms/getwinget'
)

foreach ($pattern in $requiredPatterns) {
    if ($content -notmatch $pattern) {
        throw "Infra/run-docker.ps1 is missing required bootstrap behavior: $pattern"
    }
}

if ($content -match '[^\x00-\x7F]') {
    throw 'Infra/run-docker.ps1 must contain English ASCII text only.'
}

Write-Output 'Docker bootstrap contract verified.'
