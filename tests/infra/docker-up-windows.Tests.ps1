$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$scriptPath = Join-Path $repoRoot 'Infra\docker-up-windows.ps1'
$batchPath = Join-Path $repoRoot 'Infra\docker-up-windows.bat'
$composePath = Join-Path $repoRoot 'Infra\docker-compose.yml'
$envExamplePath = Join-Path $repoRoot 'Infra\.env.example'

Describe 'Docker Desktop Windows launcher contract' {
    It 'has a PowerShell entrypoint and a forwarding batch wrapper' {
        Test-Path -LiteralPath $scriptPath -PathType Leaf | Should Be $true
        Test-Path -LiteralPath $batchPath -PathType Leaf | Should Be $true

        $batch = Get-Content -Raw -LiteralPath $batchPath
        $batch | Should Match 'docker-up-windows\.ps1'
        $batch | Should Match 'ERRORLEVEL'
    }

    It 'uses Docker Compose instead of host dependency commands' {
        $script = Get-Content -Raw -LiteralPath $scriptPath
        $script | Should Match 'docker info'
        $script | Should Match 'docker compose'
        $script | Should Match 'build.*--pull.*app.*nginx'
        $script | Should Match 'force-recreate'
        $script | Should Match 'remove-orphans'
        $script | Should Match 'healthz'
        $script | Should Not Match 'composer install'
        $script | Should Not Match 'npm ci'
        $script | Should Not Match 'php artisan'
    }

    It 'supports the optional admin profile and timeout' {
        $script = Get-Content -Raw -LiteralPath $scriptPath
        $script | Should Match '\[switch\]\$Admin'
        $script | Should Match '\[int\]\$TimeoutSeconds'
        $script | Should Match 'profile.*admin'
    }

    It 'keeps Compose data and service health contracts' {
        $compose = Get-Content -Raw -LiteralPath $composePath
        $compose | Should Match 'condition: service_healthy'
        $compose | Should Match 'start_period: 60s'
        $compose | Should Match 'mysql_data:'
        $compose | Should Match 'app_storage:'
        $compose | Should Not Match '(?m)^\s*- "3306:3306"'
    }

    It 'documents all required first-run environment values' {
        $envExample = Get-Content -Raw -LiteralPath $envExamplePath
        foreach ($name in @('APP_KEY', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD', 'HTTP_PORT')) {
            $envExample | Should Match "(?m)^$name="
        }
    }

    It 'uses the native frontend port and releases an occupied listener before startup' {
        $script = Get-Content -Raw -LiteralPath $scriptPath
        $compose = Get-Content -Raw -LiteralPath $composePath
        $envExample = Get-Content -Raw -LiteralPath $envExamplePath

        $envExample | Should Match '(?m)^HTTP_PORT=5173$'
        $envExample | Should Match '(?m)^APP_URL=http://localhost:5173$'
        $compose | Should Match '\$\{HTTP_PORT:-5173\}:80'
        $script | Should Match 'Stop-PortProcess'
        $script | Should Match 'Get-NetTCPConnection'
        $script | Should Match 'Stop-Process'
    }
}
