#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Admin,
    [ValidateRange(1, 900)]
    [int]$TimeoutSeconds = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$infraRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $infraRoot '..')).Path
$composePath = Join-Path $infraRoot 'docker-compose.yml'
$envPath = Join-Path $infraRoot '.env'
$envExamplePath = Join-Path $infraRoot '.env.example'

function Resolve-ProjectPath {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    return Join-Path $projectRoot $RelativePath
}

function New-RandomHex {
    param([int]$Length = 32)

    $bytes = New-Object byte[] $Length
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }

    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

function New-RandomBase64 {
    param([int]$Length = 32)

    $bytes = New-Object byte[] $Length
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }

    return [Convert]::ToBase64String($bytes)
}

function Ensure-LocalEnvFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ExamplePath
    )

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        $content = Get-Content -Raw -LiteralPath $Path
        $updatedContent = $content
        if ($updatedContent -match '(?m)^HTTP_PORT=80\s*$') {
            $updatedContent = $updatedContent -replace '(?m)^HTTP_PORT=80\s*$', 'HTTP_PORT=5173'
        }
        if ($updatedContent -match '(?m)^APP_URL=http://localhost\s*$') {
            $updatedContent = $updatedContent -replace '(?m)^APP_URL=http://localhost\s*$', 'APP_URL=http://localhost:5173'
        }
        if ($updatedContent -ne $content) {
            Set-Content -LiteralPath $Path -Value $updatedContent -Encoding UTF8
            Write-Host "Updated legacy Docker port defaults in $Path" -ForegroundColor Yellow
        }
        return
    }
    if (-not (Test-Path -LiteralPath $ExamplePath -PathType Leaf)) {
        throw "Missing environment template: $ExamplePath"
    }

    $content = Get-Content -Raw -LiteralPath $ExamplePath
    $content = $content -replace '(?m)^APP_KEY=.*$', "APP_KEY=base64:$(New-RandomBase64)"
    $content = $content -replace '(?m)^MYSQL_PASSWORD=.*$', "MYSQL_PASSWORD=$(New-RandomHex)"
    $content = $content -replace '(?m)^MYSQL_ROOT_PASSWORD=.*$', "MYSQL_ROOT_PASSWORD=$(New-RandomHex)"
    Set-Content -LiteralPath $Path -Value $content -Encoding UTF8
    Write-Host "Created local Docker environment at $Path" -ForegroundColor Green
}

function Assert-DockerReady {
    if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) {
        throw 'Docker CLI was not found. Install Docker Desktop and open it before running this script.'
    }

    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Desktop is not running. Open Docker Desktop, wait until it is ready, then run this script again.'
    }

    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Compose is unavailable. Update Docker Desktop so the Compose plugin is installed.'
    }
}

function Get-HttpPort {
    $match = Select-String -Path $envPath -Pattern '^\s*HTTP_PORT\s*=\s*(\d+)\s*$' | Select-Object -First 1
    if (-not $match) {
        return 5173
    }

    $port = [int]$match.Matches[0].Groups[1].Value
    if ($port -lt 1 -or $port -gt 65535) {
        throw "HTTP_PORT must be between 1 and 65535; received $port."
    }
    return $port
}

function Invoke-Compose {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $globalArguments = @('--env-file', $envPath, '-f', $composePath)
    if ($Admin) {
        $globalArguments += @('--profile', 'admin')
    }

    & docker compose @globalArguments @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose failed with exit code ${LASTEXITCODE}: docker compose $($Arguments -join ' ')"
    }
}

function Stop-PortProcess {
    param([Parameter(Mandatory = $true)][int]$Port)

    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -eq 0) {
        return
    }

    foreach ($listener in $listeners) {
        $processId = [int]$listener.OwningProcess
        if ($processId -eq 0) {
            continue
        }

        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
        if (-not $process) {
            continue
        }

        $processName = [IO.Path]::GetFileNameWithoutExtension([string]$process.Name)
        if ($processName -match '^(com\.docker\.backend|docker-proxy|dockerd|Docker Desktop)$') {
            Write-Host "Port $Port is owned by Docker; stopping the current Compose stack..." -ForegroundColor Yellow
            Invoke-Compose -Arguments @('down')
            continue
        }

        Write-Host "Stopping process $processId ($processName) on port $Port..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force -ErrorAction Stop
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
        if ($listeners.Count -eq 0) {
            return
        }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)

    throw "Port $Port is still occupied after stopping the existing process."
}

function Wait-ForHealth {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][int]$Timeout
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($Timeout)
    $uri = "http://127.0.0.1:$Port/healthz"
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 5
            if ($response.StatusCode -eq 200 -and $response.Content.Trim() -eq 'ok') {
                return
            }
        }
        catch {
            # The services are still starting or the host port is not ready yet.
        }
        Start-Sleep -Seconds 2
    } while ([DateTime]::UtcNow -lt $deadline)

    throw "The Docker stack did not become healthy within $Timeout seconds: $uri"
}

function Show-FailureDiagnostics {
    Write-Host "`nDocker service status:" -ForegroundColor Yellow
    try { Invoke-Compose -Arguments @('ps') } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
    Write-Host "`nRecent Docker logs:" -ForegroundColor Yellow
    try { Invoke-Compose -Arguments @('logs', '--tail=120') } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
}

try {
    [void](Resolve-ProjectPath -RelativePath 'BE')
    if (-not (Test-Path -LiteralPath $composePath -PathType Leaf)) {
        throw "Compose file was not found: $composePath"
    }

    Ensure-LocalEnvFile -Path $envPath -ExamplePath $envExamplePath
    Assert-DockerReady
    Stop-PortProcess -Port (Get-HttpPort)

    Invoke-Compose -Arguments @('config', '--quiet')
    Invoke-Compose -Arguments @('build', '--pull', 'app', 'nginx')
    Invoke-Compose -Arguments @('up', '-d', '--force-recreate', '--remove-orphans')
    Wait-ForHealth -Port (Get-HttpPort) -Timeout $TimeoutSeconds

    Write-Host "`nDocker stack is ready at http://localhost:$(Get-HttpPort)" -ForegroundColor Green
    if ($Admin) {
        Write-Host 'phpMyAdmin is available at http://127.0.0.1:8081' -ForegroundColor Green
    }
}
catch {
    Write-Error $_.Exception.Message
    if (Test-Path -LiteralPath $envPath -PathType Leaf) {
        Show-FailureDiagnostics
    }
    exit 1
}
