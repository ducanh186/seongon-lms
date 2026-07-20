#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
    [string]$Action = 'status'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backendRoot = Join-Path $projectRoot 'BE'
$frontendRoot = Join-Path $projectRoot 'FE\DEMO'
$stateDirectory = Join-Path $PSScriptRoot '.native-runtime'
$backendUrl = 'http://127.0.0.1:8000'
$frontendUrl = 'http://localhost:5173'

$roleConfiguration = @{
    backend = [pscustomobject]@{
        DisplayName = 'Backend'
        Port = 8000
        PidPath = Join-Path $stateDirectory 'backend.pid.json'
        StdoutPath = Join-Path $stateDirectory 'backend.stdout.log'
        StderrPath = Join-Path $stateDirectory 'backend.stderr.log'
    }
    frontend = [pscustomobject]@{
        DisplayName = 'Frontend'
        Port = 5173
        PidPath = Join-Path $stateDirectory 'frontend.pid.json'
        StdoutPath = Join-Path $stateDirectory 'frontend.stdout.log'
        StderrPath = Join-Path $stateDirectory 'frontend.stderr.log'
    }
}
$verificationMarkerPath = Join-Path $stateDirectory 'native-verified.json'

function Ensure-StateDirectory {
    if (-not (Test-Path -LiteralPath $stateDirectory -PathType Container)) {
        New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
    }
}

function Remove-PidMetadata {
    param([Parameter(Mandatory)][string]$Role)

    $pidPath = $roleConfiguration[$Role].PidPath
    if (Test-Path -LiteralPath $pidPath -PathType Leaf) {
        Remove-Item -LiteralPath $pidPath -Force
    }
}

function Get-PidMetadata {
    param([Parameter(Mandatory)][string]$Role)

    $pidPath = $roleConfiguration[$Role].PidPath
    if (-not (Test-Path -LiteralPath $pidPath -PathType Leaf)) {
        return $null
    }

    try {
        $metadata = Get-Content -LiteralPath $pidPath -Raw | ConvertFrom-Json
        if ($null -eq $metadata.pid -or [int]$metadata.pid -le 0) {
            throw 'PID metadata does not contain a positive pid.'
        }
        return $metadata
    }
    catch {
        Write-Warning "Removing invalid $Role PID metadata: $($_.Exception.Message)"
        Remove-PidMetadata -Role $Role
        return $null
    }
}

function Test-RoleCommandLine {
    param(
        [Parameter(Mandatory)][string]$Role,
        [Parameter(Mandatory)][string]$CommandLine
    )

    if ($CommandLine.IndexOf($projectRoot, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
        return $false
    }

    if ($Role -eq 'backend') {
        return $CommandLine -match '(?i)\bartisan\s+serve\b'
    }

    return $CommandLine.IndexOf($frontendRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
        $CommandLine -match '(?i)\b(vite|npm(?:\.cmd)?)\b'
}

function Get-OwnedProcess {
    param([Parameter(Mandatory)][string]$Role)

    $metadata = Get-PidMetadata -Role $Role
    if ($null -eq $metadata) {
        return $null
    }

    $processId = [int]$metadata.pid
    try {
        $process = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $processId" -ErrorAction Stop
    }
    catch {
        Write-Warning "Removing stale $Role PID metadata because PID $processId cannot be queried."
        Remove-PidMetadata -Role $Role
        return $null
    }

    if ($null -eq $process -or -not (Test-RoleCommandLine -Role $Role -CommandLine ([string]$process.CommandLine))) {
        Write-Warning "Removing non-owned $Role PID metadata for PID $processId."
        Remove-PidMetadata -Role $Role
        return $null
    }

    return [pscustomobject]@{
        Pid = $processId
        Process = $process
    }
}

function Save-PidMetadata {
    param(
        [Parameter(Mandatory)][string]$Role,
        [Parameter(Mandatory)][int]$ProcessId
    )

    Ensure-StateDirectory
    [ordered]@{
        pid = $ProcessId
        role = $Role
        projectRoot = $projectRoot
        startedAtUtc = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json | Set-Content -LiteralPath $roleConfiguration[$Role].PidPath -Encoding UTF8
}

function Get-ListenerProcessId {
    param([Parameter(Mandatory)][int]$Port)

    try {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop | Select-Object -First 1
    }
    catch {
        return $null
    }

    if ($null -eq $listener) {
        return $null
    }
    return [int]$listener.OwningProcess
}

function Assert-PortAvailableOrOwned {
    param([Parameter(Mandatory)][string]$Role)

    $configuration = $roleConfiguration[$Role]
    $listenerPid = Get-ListenerProcessId -Port $configuration.Port
    if ($null -eq $listenerPid) {
        return
    }

    $ownedProcess = Get-OwnedProcess -Role $Role
    if ($null -ne $ownedProcess -and $ownedProcess.Pid -eq $listenerPid) {
        return
    }

    throw "Port $($configuration.Port) is in use by a process not owned by this repository."
}

function Ensure-MySql80Running {
    $service = Get-Service -Name 'MySQL80' -ErrorAction Stop
    if ($service.Status -ne 'Running') {
        Start-Service -Name 'MySQL80' -ErrorAction Stop
        $service.WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    }
}

function Start-RoleProcess {
    param([Parameter(Mandatory)][string]$Role)

    $existingProcess = Get-OwnedProcess -Role $Role
    if ($null -ne $existingProcess) {
        return [pscustomobject]@{ Role = $Role; Created = $false; Pid = $existingProcess.Pid }
    }

    Assert-PortAvailableOrOwned -Role $Role
    Ensure-StateDirectory
    $configuration = $roleConfiguration[$Role]
    if ($Role -eq 'backend') {
        $php = Get-Command 'php.exe' -ErrorAction Stop
        $artisanPath = Join-Path $backendRoot 'artisan'
        $process = Start-Process -FilePath $php.Source -ArgumentList @($artisanPath, 'serve', '--host=127.0.0.1', '--port=8000') `
            -WorkingDirectory $backendRoot -PassThru -WindowStyle Hidden `
            -RedirectStandardOutput $configuration.StdoutPath -RedirectStandardError $configuration.StderrPath
    }
    else {
        $npm = Get-Command 'npm.cmd' -ErrorAction Stop
        $process = Start-Process -FilePath $npm.Source -ArgumentList @('--prefix', $frontendRoot, 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173') `
            -WorkingDirectory $frontendRoot -PassThru -WindowStyle Hidden `
            -RedirectStandardOutput $configuration.StdoutPath -RedirectStandardError $configuration.StderrPath
    }

    Save-PidMetadata -Role $Role -ProcessId $process.Id
    return [pscustomobject]@{ Role = $Role; Created = $true; Pid = $process.Id }
}

function Test-HttpSuccess {
    param([Parameter(Mandatory)][string]$Url)

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    }
    catch {
        return $false
    }
}

function Wait-ForHttpSuccess {
    param([Parameter(Mandatory)][string]$Url)

    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    do {
        if (Test-HttpSuccess -Url $Url) {
            return
        }
        Start-Sleep -Seconds 1
    } while ([DateTime]::UtcNow -lt $deadline)

    throw "Timed out waiting for $Url after 60 seconds."
}

function Get-ServiceExecutablePath {
    param([Parameter(Mandatory)][string]$PathName)

    if ($PathName -match '^\s*"([^"]+mysqld\.exe)"') {
        return $matches[1]
    }
    if ($PathName -match '^\s*([^\s]+mysqld\.exe)') {
        return $matches[1]
    }
    return $null
}

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Key
    )

    $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match ('^\s*' + [regex]::Escape($Key) + '\s*=') } | Select-Object -Last 1
    if ($null -eq $line) {
        return $null
    }
    $value = ($line -replace '^\s*[^=]+=\s*', '').Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        return $value.Substring(1, $value.Length - 2)
    }
    return $value
}

function Get-MySql80Evidence {
    $service = Get-CimInstance -ClassName Win32_Service -Filter "Name='MySQL80'" -ErrorAction Stop
    if ($null -eq $service -or $service.State -ne 'Running') {
        throw 'MySQL80 is not running.'
    }
    $serverPath = Get-ServiceExecutablePath -PathName $service.PathName
    if (-not $serverPath -or -not (Test-Path -LiteralPath $serverPath -PathType Leaf)) {
        throw 'Unable to locate the MySQL80 server binary.'
    }
    $binaryVersion = ((& $serverPath --version | Select-Object -First 1) -join ' ').Trim()
    if ($LASTEXITCODE -ne 0 -or $binaryVersion -notmatch '(?i)\b(?:Ver\s+)?8\.0\.\d+\b') {
        throw "MySQL80 binary is not MySQL 8.0: $binaryVersion"
    }

    $envPath = Join-Path $backendRoot '.env'
    $php = Get-Command 'php.exe' -ErrorAction Stop
    foreach ($key in @('DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD')) {
        $value = Get-DotEnvValue -Path $envPath -Key $key
        if ($null -eq $value) {
            throw "BE/.env is missing $key."
        }
        Set-Item -Path ("Env:NATIVE_$key") -Value $value
    }
    try {
        $phpCode = 'try { $pdo = new PDO("mysql:host=" . getenv("NATIVE_DB_HOST") . ";port=" . getenv("NATIVE_DB_PORT") . ";dbname=" . getenv("NATIVE_DB_DATABASE"), getenv("NATIVE_DB_USERNAME"), getenv("NATIVE_DB_PASSWORD")); echo $pdo->query("SELECT VERSION()")->fetchColumn(); } catch (Throwable $error) { fwrite(STDERR, $error->getMessage()); exit(1); }'
        $serverVersion = ((& $php.Source -r $phpCode | Select-Object -First 1) -join ' ').Trim()
        if ($LASTEXITCODE -ne 0 -or $serverVersion -notmatch '^8\.0\.\d+') {
            throw "MySQL80 server did not report an 8.0.x version: $serverVersion"
        }
        return [pscustomobject]@{ ServerVersion = $serverVersion; BinaryVersion = $binaryVersion }
    }
    finally {
        foreach ($key in @('DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD')) {
            Remove-Item -Path ("Env:NATIVE_$key") -ErrorAction SilentlyContinue
        }
    }
}

function Write-VerificationMarker {
    param([Parameter(Mandatory)]$MySqlEvidence)

    [ordered]@{
        projectRoot = $projectRoot
        verifiedAtUtc = [DateTime]::UtcNow.ToString('o')
        backendUrl = $backendUrl
        frontendUrl = $frontendUrl
        mysqlVersion = $MySqlEvidence.ServerVersion
        mysqlBinaryVersion = $MySqlEvidence.BinaryVersion
    } | ConvertTo-Json | Set-Content -LiteralPath $verificationMarkerPath -Encoding UTF8
}

function Stop-RoleProcess {
    param([Parameter(Mandatory)][string]$Role)

    $ownedProcess = Get-OwnedProcess -Role $Role
    if ($null -ne $ownedProcess) {
        Stop-Process -Id $ownedProcess.Pid -Force -ErrorAction Stop
    }
    Remove-PidMetadata -Role $Role
}

function Invoke-Start {
    Ensure-MySql80Running
    $createdRoles = @()
    try {
        foreach ($role in @('backend', 'frontend')) {
            $result = Start-RoleProcess -Role $role
            if ($result.Created) {
                $createdRoles += $role
            }
        }
        Wait-ForHttpSuccess -Url "$backendUrl/up"
        Wait-ForHttpSuccess -Url "$frontendUrl/"
        $mySqlEvidence = Get-MySql80Evidence
        Write-VerificationMarker -MySqlEvidence $mySqlEvidence
        Write-Host "Native runtime verified: $backendUrl and $frontendUrl"
    }
    catch {
        foreach ($role in $createdRoles) {
            Stop-RoleProcess -Role $role
        }
        if (Test-Path -LiteralPath $verificationMarkerPath) {
            Remove-Item -LiteralPath $verificationMarkerPath -Force
        }
        Write-Host "Backend stderr log: $($roleConfiguration.backend.StderrPath)"
        Write-Host "Frontend stderr log: $($roleConfiguration.frontend.StderrPath)"
        throw
    }
}

function Invoke-Stop {
    if (Test-Path -LiteralPath $verificationMarkerPath) {
        Remove-Item -LiteralPath $verificationMarkerPath -Force
    }
    foreach ($role in @('backend', 'frontend')) {
        Stop-RoleProcess -Role $role
        Write-Host "$($roleConfiguration[$role].DisplayName): stopped"
    }
}

function Invoke-Status {
    foreach ($role in @('backend', 'frontend')) {
        $ownedProcess = Get-OwnedProcess -Role $role
        if ($null -eq $ownedProcess) {
            Write-Host "$($roleConfiguration[$role].DisplayName): stopped"
            continue
        }
        $url = if ($role -eq 'backend') { "$backendUrl/up" } else { "$frontendUrl/" }
        $reachability = if (Test-HttpSuccess -Url $url) { 'reachable' } else { 'unreachable' }
        Write-Host "$($roleConfiguration[$role].DisplayName): running ($reachability)"
    }
    if (Test-Path -LiteralPath $verificationMarkerPath) {
        Write-Host "Verification marker: $verificationMarkerPath"
    }
}

function Invoke-Logs {
    if (-not (Test-Path -LiteralPath $stateDirectory -PathType Container)) {
        Write-Host 'No native runtime logs found.'
        return
    }
    $logPaths = @(Get-ChildItem -LiteralPath $stateDirectory -Filter '*.log' -File -ErrorAction SilentlyContinue)
    if ($logPaths.Count -eq 0) {
        Write-Host 'No native runtime logs found.'
        return
    }
    foreach ($log in $logPaths) {
        Write-Host "--- $($log.Name) ---"
        Get-Content -LiteralPath $log.FullName -Tail 100
    }
}

switch ($Action) {
    'start' { Invoke-Start }
    'stop' { Invoke-Stop }
    'restart' { Invoke-Stop; Invoke-Start }
    'status' { Invoke-Status }
    'logs' { Invoke-Logs }
}
