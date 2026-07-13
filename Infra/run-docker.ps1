[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('up', 'down', 'restart', 'logs', 'status', 'admin')]
    [string]$Action = 'up'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$composeFile = Join-Path $PSScriptRoot 'docker-compose.yml'
$envFile = Join-Path $PSScriptRoot '.env'
$envExampleFile = Join-Path $PSScriptRoot '.env.example'

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ComposeArguments
    )

    & docker compose --env-file $envFile -f $composeFile @ComposeArguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed: $($ComposeArguments -join ' ')"
    }
}

function Get-EnvironmentValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$DefaultValue
    )

    $match = Select-String -LiteralPath $envFile -Pattern "^$([regex]::Escape($Name))=(.*)$" | Select-Object -First 1
    if ($null -eq $match) {
        return $DefaultValue
    }

    return $match.Matches[0].Groups[1].Value.Trim()
}

if ($null -eq (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker CLI was not found. Install and start Docker Desktop first.'
}

& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop is not running or the Docker daemon is unavailable.'
}

if (-not (Test-Path -LiteralPath $envFile)) {
    Copy-Item -LiteralPath $envExampleFile -Destination $envFile
    Write-Warning 'Created Infra/.env from Infra/.env.example.'
    Write-Host 'Set APP_KEY, APP_URL, MYSQL_PASSWORD and MYSQL_ROOT_PASSWORD, then run this script again.'
    exit 1
}

$environmentContent = Get-Content -LiteralPath $envFile -Raw
$placeholderPatterns = @(
    'REPLACE_WITH_A_REAL_LARAVEL_APP_KEY',
    'MYSQL_PASSWORD=change_me',
    'MYSQL_ROOT_PASSWORD=change_root_me'
)

$remainingPlaceholders = @($placeholderPatterns | Where-Object { $environmentContent.Contains($_) })
if ($remainingPlaceholders.Count -gt 0) {
    throw 'Infra/.env still contains placeholder secrets. Replace them before starting the stack.'
}

$httpPort = Get-EnvironmentValue -Name 'HTTP_PORT' -DefaultValue '80'
$phpMyAdminPort = Get-EnvironmentValue -Name 'PHPMYADMIN_PORT' -DefaultValue '8081'
$appUrl = if ($httpPort -eq '80') { 'http://127.0.0.1' } else { "http://127.0.0.1:$httpPort" }

Push-Location $repoRoot
try {
    switch ($Action) {
        'up' {
            Write-Host 'Validating production Compose configuration...'
            Invoke-Compose -ComposeArguments @('config', '--quiet')

            Write-Host 'Building production images...'
            Invoke-Compose -ComposeArguments @('build')

            Write-Host 'Starting production stack...'
            Invoke-Compose -ComposeArguments @('up', '-d', '--wait', '--wait-timeout', '180')
            Invoke-Compose -ComposeArguments @('ps')

            Write-Host "SEONGON LMS is ready at $appUrl"
            Write-Host "Health check: $appUrl/healthz"
        }
        'down' {
            Invoke-Compose -ComposeArguments @('down')
            Write-Host 'Containers stopped. Persistent volumes were kept.'
        }
        'restart' {
            Invoke-Compose -ComposeArguments @('restart')
            Invoke-Compose -ComposeArguments @('ps')
        }
        'logs' {
            Invoke-Compose -ComposeArguments @('logs', '--follow', '--tail', '200', 'app', 'nginx', 'mysql')
        }
        'status' {
            Invoke-Compose -ComposeArguments @('ps')
        }
        'admin' {
            Invoke-Compose -ComposeArguments @('--profile', 'admin', 'up', '-d', '--wait', '--wait-timeout', '180', 'phpmyadmin')
            Write-Host "phpMyAdmin is ready at http://127.0.0.1:$phpMyAdminPort"
        }
    }
}
finally {
    Pop-Location
}
