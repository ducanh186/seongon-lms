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
$script:DockerCommand = $null

function Get-DockerCommand {
    $command = Get-Command docker -ErrorAction SilentlyContinue
    if ($null -ne $command) {
        return $command.Source
    }

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\resources\bin\docker.exe'),
        (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe')
    )

    return $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

function Get-DockerDesktopExecutable {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\Docker Desktop.exe'),
        (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe')
    )

    return $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

function Install-DockerDesktop {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($null -eq $winget) {
        throw 'Docker Desktop is not installed and Windows Package Manager (winget) was not found. Install App Installer from https://aka.ms/getwinget, restart PowerShell, and run this script again.'
    }

    Write-Host 'Docker Desktop is not installed. Installing Docker Desktop with winget...'
    & $winget.Source install --id Docker.DockerDesktop --exact --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Desktop installation failed. Review the winget output, then run this script again.'
    }
}

function Test-DockerDaemon {
    if ($null -eq $script:DockerCommand) {
        return $false
    }

    & $script:DockerCommand info --format '{{.ServerVersion}}' 2>$null | Out-Null
    return $LASTEXITCODE -eq 0
}

function Wait-DockerDaemon {
    param(
        [int]$TimeoutSeconds = 300
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        $script:DockerCommand = Get-DockerCommand
        if (Test-DockerDaemon) {
            return $true
        }

        Start-Sleep -Seconds 5
    } while ([DateTime]::UtcNow -lt $deadline)

    return $false
}

function Ensure-DockerReady {
    $script:DockerCommand = Get-DockerCommand
    if ($null -eq $script:DockerCommand) {
        Install-DockerDesktop
        $script:DockerCommand = Get-DockerCommand
    }

    if (Test-DockerDaemon) {
        return
    }

    $dockerDesktop = Get-DockerDesktopExecutable
    if ($null -eq $dockerDesktop) {
        throw 'Docker Desktop was installed but its executable was not found. Restart Windows, then run this script again.'
    }

    Write-Host 'Starting Docker Desktop and waiting for the Docker daemon...'
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden

    if (-not (Wait-DockerDaemon)) {
        throw "Docker did not become ready within 300 seconds. Restart Windows, run 'wsl --update', confirm WSL 2 and hardware virtualization are enabled, start Docker Desktop, and run this script again."
    }
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ComposeArguments
    )

    & $script:DockerCommand compose --env-file $envFile -f $composeFile @ComposeArguments
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

Ensure-DockerReady

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
