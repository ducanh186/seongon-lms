$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$composeFile = Join-Path $repoRoot 'Infra\docker-compose.yml'
$envFile = Join-Path $repoRoot 'Infra\.env'
$runScript = Join-Path $repoRoot 'Infra\run-docker.ps1'

if (-not (Test-Path -LiteralPath $runScript)) {
    throw 'Missing Infra/run-docker.ps1.'
}

$runScriptContent = Get-Content -LiteralPath $runScript -Raw
foreach ($action in @('up', 'down', 'restart', 'logs', 'status', 'admin')) {
    if ($runScriptContent -notmatch "'$action'") {
        throw "Infra/run-docker.ps1 must support the '$action' action."
    }
}

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing $envFile. Copy Infra/.env.example before verification."
}

$json = docker compose --env-file $envFile -f $composeFile config --format json
if ($LASTEXITCODE -ne 0) {
    throw 'docker compose config failed.'
}

$profileJson = docker compose --env-file $envFile -f $composeFile --profile admin config --format json
if ($LASTEXITCODE -ne 0) {
    throw 'docker compose config with admin profile failed.'
}

$config = $json | ConvertFrom-Json
$profileConfig = $profileJson | ConvertFrom-Json
$serviceNames = @($config.services.PSObject.Properties.Name)

foreach ($required in @('nginx', 'app', 'mysql')) {
    if ($required -notin $serviceNames) {
        throw "Missing required service: $required"
    }
}

if ('phpmyadmin' -in $serviceNames) {
    throw 'phpmyadmin must not be enabled by default.'
}

$profileServiceNames = @($profileConfig.services.PSObject.Properties.Name)
if ('phpmyadmin' -notin $profileServiceNames) {
    throw 'phpmyadmin must be enabled by the admin profile.'
}

if ($null -ne $config.services.app.PSObject.Properties['ports']) {
    throw 'app must not publish host ports.'
}

if ($null -ne $config.services.mysql.PSObject.Properties['ports']) {
    throw 'mysql must not publish host ports.'
}

if ('admin' -notin @($profileConfig.services.phpmyadmin.profiles)) {
    throw 'phpmyadmin must use the admin profile.'
}

$pmaHostIp = $profileConfig.services.phpmyadmin.ports[0].host_ip
if ($pmaHostIp -ne '127.0.0.1') {
    throw 'phpmyadmin must bind to 127.0.0.1.'
}

$volumeNames = @($config.volumes.PSObject.Properties.Name)
foreach ($required in @('mysql_data', 'app_storage')) {
    if ($required -notin $volumeNames) {
        throw "Missing required volume: $required"
    }
}

Write-Output 'Production Compose contract verified.'
