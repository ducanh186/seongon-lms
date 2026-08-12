#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
    [string]$Action = 'restart',
    [switch]$NoBrowser,
    [string]$ProjectRoot,
    [ValidateRange(1024, 65535)][int]$BackendPort = 8000,
    [ValidateRange(1024, 65535)][int]$FrontendPort = 5173,
    [switch]$SkipMySqlCheck,
    [switch]$SkipPreparationCommands
)

$ErrorActionPreference = 'Stop'

function Resolve-Executable {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $command) {
        throw "Required executable '$Name' was not found on PATH."
    }

    return $command.Source
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-EnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$EnvPath,
        [Parameter(Mandatory = $true)][string]$Key
    )

    foreach ($line in Get-Content -LiteralPath $EnvPath) {
        if ($line -match ('^\s*' + [regex]::Escape($Key) + '\s*=\s*(.*)$')) {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }

    return $null
}

function Assert-TestBypassAllowed {
    param([Parameter(Mandatory = $true)][string]$ResolvedProjectRoot)

    $temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
    $comparison = [System.StringComparison]::OrdinalIgnoreCase
    if (-not $ResolvedProjectRoot.StartsWith($temporaryRoot + '\', $comparison)) {
        throw 'Test-only bypass switches are only permitted for the explicit native runner test fixture.'
    }

    $markerPath = Join-Path $ResolvedProjectRoot 'Infra\.native-runtime-test-fixture.json'
    try {
        $marker = Get-Content -LiteralPath $markerPath -Raw | ConvertFrom-Json
        if ($marker.kind -ne 'native-runner-test-fixture' -or $marker.projectRoot -ne $ResolvedProjectRoot) {
            throw 'invalid fixture marker'
        }
    }
    catch {
        throw 'Test-only bypass switches are only permitted for the explicit native runner test fixture.'
    }
}

function Get-FrontendFingerprint {
    param([Parameter(Mandatory = $true)][string]$FrontendRoot)

    $candidates = New-Object System.Collections.Generic.List[string]
    $sourceRoot = Join-Path $FrontendRoot 'src'
    if (Test-Path -LiteralPath $sourceRoot) {
        foreach ($file in Get-ChildItem -LiteralPath $sourceRoot -File -Recurse) {
            $candidates.Add($file.FullName)
        }
    }

    foreach ($name in @('index.html', 'package.json', 'package-lock.json', '.env')) {
        $path = Join-Path $FrontendRoot $name
        if (Test-Path -LiteralPath $path) {
            $candidates.Add($path)
        }
    }

    foreach ($file in Get-ChildItem -LiteralPath $FrontendRoot -File -ErrorAction SilentlyContinue) {
        if ($file.Name -like 'vite.config.*' -or $file.Name -like 'tsconfig*.json') {
            $candidates.Add($file.FullName)
        }
    }

    $records = foreach ($path in ($candidates | Select-Object -Unique | Sort-Object)) {
        $relativePath = $path.Substring($FrontendRoot.Length).TrimStart('\', '/').Replace('\', '/')
        '{0}|{1}' -f $relativePath, (Get-Sha256 -Path $path)
    }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($records -join "`n"))
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha256.Dispose()
    }
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][string]$Executable,
        [string[]]$Arguments = @(),
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5.1 exposes native stderr as ErrorRecord objects.
        $ErrorActionPreference = 'Continue'
        Push-Location -LiteralPath $WorkingDirectory
        $output = @(& $Executable @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -ne 0) {
        $text = ($output | Out-String).Trim()
        throw "$Description failed with exit code ${exitCode}. $text"
    }
}

function Write-TextFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Value
    )

    [System.IO.File]::WriteAllText($Path, $Value + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
}

function Get-OwnedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$PidRecordPath,
        [Parameter(Mandatory = $true)][string]$ExpectedPath,
        [Parameter(Mandatory = $true)][string]$ResolvedProjectRoot
    )

    if (-not (Test-Path -LiteralPath $PidRecordPath)) {
        return $null
    }

    try {
        $record = Get-Content -LiteralPath $PidRecordPath -Raw | ConvertFrom-Json
        $process = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f [int]$record.pid) -ErrorAction Stop
        if ($null -eq $process -or [string]::IsNullOrWhiteSpace($process.CommandLine)) {
            return $null
        }

        if ($process.CommandLine.IndexOf($ResolvedProjectRoot, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
            return $null
        }
        if ($process.CommandLine.IndexOf($ExpectedPath, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
            return $null
        }

        return $process
    }
    catch {
        return $null
    }
}

function Remove-PidRecordAndStopOwnedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$PidRecordPath,
        [Parameter(Mandatory = $true)][string]$ExpectedPath,
        [Parameter(Mandatory = $true)][string]$ResolvedProjectRoot
    )

    $process = Get-OwnedProcess -PidRecordPath $PidRecordPath -ExpectedPath $ExpectedPath -ResolvedProjectRoot $ResolvedProjectRoot
    if ($null -ne $process) {
        Stop-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
        Wait-Process -Id $process.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $PidRecordPath -Force -ErrorAction SilentlyContinue
}

function Test-HttpEndpoint {
    param([Parameter(Mandatory = $true)][string]$Uri)

    try {
        $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    }
    catch {
        return $false
    }
}

function Test-PortIsInUse {
    param([Parameter(Mandatory = $true)][int]$Port)

    $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    return $connections.Count -gt 0
}

function Assert-PortAvailable {
    param([Parameter(Mandatory = $true)][int]$Port)

    if (Test-PortIsInUse -Port $Port) {
        throw "Port $Port is already owned by another process. Stop that process or choose a different port."
    }
}

function Write-PidRecord {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Process,
        [Parameter(Mandatory = $true)][string]$ExpectedPath
    )

    [ordered]@{
        pid = $Process.Id
        expectedPath = $ExpectedPath
        startedAt = (Get-Date).ToString('o')
    } | ConvertTo-Json | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Stop-NewOwnedProcess {
    param(
        [Parameter(Mandatory = $true)]$Process,
        [Parameter(Mandatory = $true)][string]$ExpectedPath,
        [Parameter(Mandatory = $true)][string]$ResolvedProjectRoot
    )

    try {
        $liveProcess = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $Process.Id) -ErrorAction Stop
        if ($null -ne $liveProcess -and
            -not [string]::IsNullOrWhiteSpace($liveProcess.CommandLine) -and
            $liveProcess.CommandLine.IndexOf($ResolvedProjectRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -and
            $liveProcess.CommandLine.IndexOf($ExpectedPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            Stop-Process -Id $liveProcess.ProcessId -ErrorAction SilentlyContinue
            Wait-Process -Id $liveProcess.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
        }
    }
    catch {
        # A missing or mismatched process is intentionally left untouched.
    }
}

function ConvertTo-StartProcessArgument {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value -notmatch '[\s"]') {
        return $Value
    }
    return '"' + $Value.Replace('"', '\"') + '"'
}

function Wait-ForEndpoints {
    param(
        [Parameter(Mandatory = $true)][int]$BackendPort,
        [Parameter(Mandatory = $true)][int]$FrontendPort
    )

    $deadline = (Get-Date).AddSeconds(60)
    do {
        if ((Test-HttpEndpoint -Uri ("http://127.0.0.1:{0}/up" -f $BackendPort)) -and (Test-HttpEndpoint -Uri ("http://127.0.0.1:{0}/" -f $FrontendPort))) {
            return
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)

    throw 'Native backend or frontend did not become ready within 60 seconds.'
}

function Prepare-NativeRuntime {
    param(
        [Parameter(Mandatory = $true)][string]$BackendRoot,
        [Parameter(Mandatory = $true)][string]$FrontendRoot,
        [Parameter(Mandatory = $true)][string]$RuntimeRoot,
        [Parameter(Mandatory = $true)][string]$EnvPath,
        [Parameter(Mandatory = $true)][string]$ComposerLockPath,
        [Parameter(Mandatory = $true)][string]$PackageLockPath,
        [switch]$SkipMySql,
        [switch]$SkipCommands
    )

    $dbUser = Get-EnvValue -EnvPath $EnvPath -Key 'DB_USERNAME'
    $dbPassword = Get-EnvValue -EnvPath $EnvPath -Key 'DB_PASSWORD'
    if ([string]::IsNullOrWhiteSpace($dbUser) -or $dbUser -eq 'root' -or [string]::IsNullOrWhiteSpace($dbPassword)) {
        throw 'BE/.env must define a non-root, non-blank DB_USERNAME and a non-blank DB_PASSWORD.'
    }

    $composerLockHash = Get-Sha256 -Path $ComposerLockPath
    $packageLockHash = Get-Sha256 -Path $PackageLockPath
    $frontendFingerprint = Get-FrontendFingerprint -FrontendRoot $FrontendRoot
    $composerStampPath = Join-Path $RuntimeRoot 'composer-lock.sha256'
    $npmStampPath = Join-Path $RuntimeRoot 'npm-lock.sha256'
    $frontendStampPath = Join-Path $RuntimeRoot 'frontend-fingerprint.sha256'

    if ($SkipCommands) {
        return
    }

    $phpPath = Resolve-Executable -Name 'php'
    $composerPath = Resolve-Executable -Name 'composer'
    $nodePath = Resolve-Executable -Name 'node'
    $npmPath = Resolve-Executable -Name 'npm.cmd'

    if (-not $SkipMySql) {
        $service = Get-Service -Name 'MySQL80' -ErrorAction Stop
        if ($service.Status -ne 'Running') {
            Start-Service -Name 'MySQL80'
            $service.WaitForStatus('Running', [TimeSpan]::FromSeconds(60))
        }
        $serviceInfo = Get-CimInstance Win32_Service -Filter "Name = 'MySQL80'" -ErrorAction Stop
        $serviceExecutable = if ($serviceInfo.PathName -match '^\s*"([^"]+)"') { $Matches[1] } else { ($serviceInfo.PathName -split '\s+')[0] }
        $versionOutput = @(& $serviceExecutable '--version' 2>&1) -join ' '
        if ($LASTEXITCODE -ne 0 -or $versionOutput -match 'MariaDB' -or $versionOutput -notmatch '(?<!\d)8\.0(?!\d)') {
            throw 'MySQL80 must run Oracle MySQL Server 8.0; MariaDB and MySQL 8.4 are not supported.'
        }
    }

    $autoloadPath = Join-Path $BackendRoot 'vendor\autoload.php'
    $previousComposerHash = if (Test-Path -LiteralPath $composerStampPath) { (Get-Content -LiteralPath $composerStampPath -Raw).Trim() } else { '' }
    if (-not (Test-Path -LiteralPath $autoloadPath) -or $previousComposerHash -ne $composerLockHash) {
        Invoke-NativeCommand -Description 'composer install' -Executable $composerPath -Arguments @('install', '--no-interaction', '--prefer-dist') -WorkingDirectory $BackendRoot
        Write-TextFile -Path $composerStampPath -Value $composerLockHash
    }
    Invoke-NativeCommand -Description 'composer check-platform-reqs' -Executable $composerPath -Arguments @('check-platform-reqs', '--no-interaction') -WorkingDirectory $BackendRoot

    $nodeModulesPath = Join-Path $FrontendRoot 'node_modules'
    $previousNpmHash = if (Test-Path -LiteralPath $npmStampPath) { (Get-Content -LiteralPath $npmStampPath -Raw).Trim() } else { '' }
    $npmDependenciesRefreshed = $false
    if (-not (Test-Path -LiteralPath $nodeModulesPath) -or $previousNpmHash -ne $packageLockHash) {
        Invoke-NativeCommand -Description 'npm ci' -Executable $npmPath -Arguments @('ci') -WorkingDirectory $FrontendRoot
        Write-TextFile -Path $npmStampPath -Value $packageLockHash
        $npmDependenciesRefreshed = $true
    }

    $artisanPath = Join-Path $BackendRoot 'artisan'
    Invoke-NativeCommand -Description 'php artisan config:clear' -Executable $phpPath -Arguments @($artisanPath, 'config:clear') -WorkingDirectory $BackendRoot
    Invoke-NativeCommand -Description 'php artisan migrate' -Executable $phpPath -Arguments @($artisanPath, 'migrate', '--force') -WorkingDirectory $BackendRoot
    Invoke-NativeCommand -Description 'php artisan app:seed-demo-once' -Executable $phpPath -Arguments @($artisanPath, 'app:seed-demo-once') -WorkingDirectory $BackendRoot

    $distIndexPath = Join-Path $FrontendRoot 'dist\index.html'
    $previousFingerprint = if (Test-Path -LiteralPath $frontendStampPath) { (Get-Content -LiteralPath $frontendStampPath -Raw).Trim() } else { '' }
    if (-not (Test-Path -LiteralPath $distIndexPath) -or $previousFingerprint -ne $frontendFingerprint -or $npmDependenciesRefreshed) {
        Invoke-NativeCommand -Description 'npm run build' -Executable $npmPath -Arguments @('run', 'build') -WorkingDirectory $FrontendRoot
        Write-TextFile -Path $frontendStampPath -Value $frontendFingerprint
    }
}

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
}
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$backendRoot = Join-Path $ProjectRoot 'BE'
$frontendRoot = Join-Path $ProjectRoot 'FE\DEMO'
$runtimeRoot = Join-Path $ProjectRoot 'Infra\.native-runtime'
$artisanPath = Join-Path $backendRoot 'artisan'
$vitePath = Join-Path $frontendRoot 'node_modules\vite\bin\vite.js'
$backendPidPath = Join-Path $runtimeRoot 'backend.pid.json'
$frontendPidPath = Join-Path $runtimeRoot 'frontend.pid.json'
$verifiedPath = Join-Path $runtimeRoot 'native-verified.json'

if ($SkipMySqlCheck -or $SkipPreparationCommands) {
    Assert-TestBypassAllowed -ResolvedProjectRoot $ProjectRoot
}

function Invoke-Stop {
    if (Test-Path -LiteralPath $verifiedPath) {
        Remove-Item -LiteralPath $verifiedPath -Force
    }
    Remove-PidRecordAndStopOwnedProcess -PidRecordPath $backendPidPath -ExpectedPath $artisanPath -ResolvedProjectRoot $ProjectRoot
    Remove-PidRecordAndStopOwnedProcess -PidRecordPath $frontendPidPath -ExpectedPath $vitePath -ResolvedProjectRoot $ProjectRoot
    Write-Output 'Native runtime stopped.'
}

function Invoke-Status {
    $backend = Get-OwnedProcess -PidRecordPath $backendPidPath -ExpectedPath $artisanPath -ResolvedProjectRoot $ProjectRoot
    $frontend = Get-OwnedProcess -PidRecordPath $frontendPidPath -ExpectedPath $vitePath -ResolvedProjectRoot $ProjectRoot
    if ($null -eq $backend -and $null -eq $frontend) {
        Write-Output 'Native runtime is stopped.'
        return
    }

    $backendReady = $null -ne $backend -and (Test-HttpEndpoint -Uri ("http://127.0.0.1:{0}/up" -f $BackendPort))
    $frontendReady = $null -ne $frontend -and (Test-HttpEndpoint -Uri ("http://127.0.0.1:{0}/" -f $FrontendPort))
    if ($backendReady -and $frontendReady) {
        Write-Output 'Native runtime is healthy.'
    }
    else {
        Write-Output 'Native runtime is not healthy.'
    }
}

function Invoke-Start {
    $requiredPaths = @(
        (Join-Path $backendRoot '.env'),
        (Join-Path $backendRoot 'composer.lock'),
        (Join-Path $frontendRoot 'package-lock.json'),
        $artisanPath
    )
    foreach ($path in $requiredPaths) {
        if (-not (Test-Path -LiteralPath $path)) {
            throw "Required native runtime path is missing: $path"
        }
    }

    $existingBackend = Get-OwnedProcess -PidRecordPath $backendPidPath -ExpectedPath $artisanPath -ResolvedProjectRoot $ProjectRoot
    $existingFrontend = Get-OwnedProcess -PidRecordPath $frontendPidPath -ExpectedPath $vitePath -ResolvedProjectRoot $ProjectRoot
    if ($null -ne $existingBackend -and $null -ne $existingFrontend -and
        (Test-HttpEndpoint -Uri ("http://127.0.0.1:{0}/up" -f $BackendPort)) -and
        (Test-HttpEndpoint -Uri ("http://127.0.0.1:{0}/" -f $FrontendPort))) {
        Write-Output 'Native runtime is already healthy.'
        return
    }

    if (Test-Path -LiteralPath $runtimeRoot) {
        Invoke-Stop
    }
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
    Prepare-NativeRuntime -BackendRoot $backendRoot -FrontendRoot $frontendRoot -RuntimeRoot $runtimeRoot -EnvPath (Join-Path $backendRoot '.env') -ComposerLockPath (Join-Path $backendRoot 'composer.lock') -PackageLockPath (Join-Path $frontendRoot 'package-lock.json') -SkipMySql:$SkipMySqlCheck -SkipCommands:$SkipPreparationCommands

    $phpPath = Resolve-Executable -Name 'php'
    $nodePath = Resolve-Executable -Name 'node'
    if (-not (Test-Path -LiteralPath $vitePath)) {
        throw "Vite entrypoint was not created by npm preparation: $vitePath"
    }
    $vitePath = (Resolve-Path -LiteralPath $vitePath).Path
    Assert-PortAvailable -Port $BackendPort
    Assert-PortAvailable -Port $FrontendPort
    $backendOutput = Join-Path $runtimeRoot 'backend.stdout.log'
    $backendError = Join-Path $runtimeRoot 'backend.stderr.log'
    $frontendOutput = Join-Path $runtimeRoot 'frontend.stdout.log'
    $frontendError = Join-Path $runtimeRoot 'frontend.stderr.log'
    $newBackend = $null
    $newFrontend = $null
    try {
        $backendArguments = (@($artisanPath, 'serve', '--host=127.0.0.1', ("--port={0}" -f $BackendPort)) | ForEach-Object { ConvertTo-StartProcessArgument -Value $_ }) -join ' '
        $newBackend = Start-Process -FilePath $phpPath -ArgumentList $backendArguments -WorkingDirectory $backendRoot -RedirectStandardOutput $backendOutput -RedirectStandardError $backendError -PassThru
        Write-PidRecord -Path $backendPidPath -Process $newBackend -ExpectedPath $artisanPath
        $frontendArguments = (@($vitePath, '--host', '127.0.0.1', '--port', $FrontendPort) | ForEach-Object { ConvertTo-StartProcessArgument -Value ([string]$_) }) -join ' '
        $newFrontend = Start-Process -FilePath $nodePath -ArgumentList $frontendArguments -WorkingDirectory $frontendRoot -RedirectStandardOutput $frontendOutput -RedirectStandardError $frontendError -PassThru
        Write-PidRecord -Path $frontendPidPath -Process $newFrontend -ExpectedPath $vitePath
        Wait-ForEndpoints -BackendPort $BackendPort -FrontendPort $FrontendPort
        [ordered]@{
            verifiedAt = (Get-Date).ToString('o')
            backend = "http://127.0.0.1:$BackendPort/up"
            frontend = "http://127.0.0.1:$FrontendPort/"
        } | ConvertTo-Json | Set-Content -LiteralPath $verifiedPath -Encoding UTF8
    }
    catch {
        if ($null -ne $newBackend) { Stop-NewOwnedProcess -Process $newBackend -ExpectedPath $artisanPath -ResolvedProjectRoot $ProjectRoot }
        if ($null -ne $newFrontend) { Stop-NewOwnedProcess -Process $newFrontend -ExpectedPath $vitePath -ResolvedProjectRoot $ProjectRoot }
        Remove-Item -LiteralPath $backendPidPath, $frontendPidPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $verifiedPath -Force -ErrorAction SilentlyContinue
        throw
    }
    Write-Output 'Native runtime is healthy.'
    if (-not $NoBrowser) {
        Start-Process ("http://localhost:{0}" -f $FrontendPort)
    }
}

function Invoke-Logs {
    if (-not (Test-Path -LiteralPath $runtimeRoot)) {
        Write-Output 'Native runtime logs have not been created yet.'
        return
    }

    foreach ($name in @('backend.stdout.log', 'backend.stderr.log', 'frontend.stdout.log', 'frontend.stderr.log')) {
        $path = Join-Path $runtimeRoot $name
        Write-Output $path
        if (Test-Path -LiteralPath $path) {
            Get-Content -LiteralPath $path -Tail 50
        }
    }
}

switch ($Action) {
    'start' { Invoke-Start }
    'stop' { Invoke-Stop }
    'restart' { Invoke-Stop; Invoke-Start }
    'status' { Invoke-Status }
    'logs' { Invoke-Logs }
}
