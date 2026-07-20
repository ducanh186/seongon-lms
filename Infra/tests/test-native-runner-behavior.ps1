Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$runnerPath = Join-Path $repositoryRoot 'Infra\run-native-windows.ps1'
$stateDirectory = Join-Path $repositoryRoot 'Infra\.native-runtime'
$powerShellPath = Join-Path $PSHOME 'powershell.exe'

function Invoke-Runner {
    param([Parameter(Mandatory)][string]$Action)

    $output = & $powerShellPath -NoProfile -ExecutionPolicy Bypass -File $runnerPath $Action 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Runner action '$Action' failed: $($output | Out-String)"
    }
    return ($output | Out-String)
}

function Assert-Contains {
    param(
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Expected
    )

    if ($Text -notmatch [regex]::Escape($Expected)) {
        throw "Expected runner output to contain '$Expected'. Actual: $Text"
    }
}

function Assert-True {
    param(
        [Parameter(Mandatory)][bool]$Condition,
        [Parameter(Mandatory)][string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Assert-Throws {
    param(
        [Parameter(Mandatory)][scriptblock]$Operation,
        [Parameter(Mandatory)][string]$ExpectedText
    )

    try {
        & $Operation
    }
    catch {
        Assert-Contains -Text $_.Exception.Message -Expected $ExpectedText
        return
    }
    throw "Expected operation to throw '$ExpectedText'."
}

if (-not (Test-Path -LiteralPath $runnerPath -PathType Leaf)) {
    throw "Native runner is missing: $runnerPath"
}

$protectedStateFiles = @('backend.pid.json', 'frontend.pid.json', 'native-verified.json')
foreach ($fileName in $protectedStateFiles) {
    $path = Join-Path $stateDirectory $fileName
    if (Test-Path -LiteralPath $path) {
        throw "Refusing to run behavioral tests while runtime state exists: $path"
    }
}
if (-not (Test-Path -LiteralPath $stateDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
}

$statusOutput = Invoke-Runner -Action 'status'
Assert-Contains -Text $statusOutput -Expected 'Backend: stopped'
Assert-Contains -Text $statusOutput -Expected 'Frontend: stopped'

$logsOutput = Invoke-Runner -Action 'logs'
Assert-Contains -Text $logsOutput -Expected 'No native runtime logs found.'

$staleMetadataPath = Join-Path $stateDirectory 'backend.pid.json'
@{
    pid         = $PID
    projectRoot = $repositoryRoot
    role        = 'backend'
} | ConvertTo-Json | Set-Content -LiteralPath $staleMetadataPath -Encoding UTF8

$stopOutput = Invoke-Runner -Action 'stop'
Assert-Contains -Text $stopOutput -Expected 'Backend: stopped'
if (Test-Path -LiteralPath $staleMetadataPath) {
    throw 'A stale backend PID metadata file was not removed.'
}

try {
    [Diagnostics.Process]::GetProcessById($PID) | Out-Null
}
catch {
    throw 'The runner stopped the test process while cleaning stale metadata.'
}

$env:NATIVE_RUNTIME_LIBRARY_MODE = '1'
. $runnerPath
Remove-Item Env:NATIVE_RUNTIME_LIBRARY_MODE -ErrorAction SilentlyContinue

$testStateDirectory = Join-Path $env:TEMP ('seongon-lms-native-runner-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testStateDirectory | Out-Null
try {
    $stateDirectory = $testStateDirectory
    $verificationMarkerPath = Join-Path $testStateDirectory 'native-verified.json'
    $roleConfiguration.backend.PidPath = Join-Path $testStateDirectory 'backend.pid.json'
    $roleConfiguration.frontend.PidPath = Join-Path $testStateDirectory 'frontend.pid.json'
    $roleConfiguration.backend.StdoutPath = Join-Path $testStateDirectory 'backend.stdout.log'
    $roleConfiguration.backend.StderrPath = Join-Path $testStateDirectory 'backend.stderr.log'
    $roleConfiguration.frontend.StdoutPath = Join-Path $testStateDirectory 'frontend.stdout.log'
    $roleConfiguration.frontend.StderrPath = Join-Path $testStateDirectory 'frontend.stderr.log'

    Assert-True -Condition (Test-RoleCommandLine -Role 'backend' -CommandLine ('php.exe ' + $projectRoot + '\BE\artisan serve')) -Message 'The canonical project root should be owned.'
    Assert-True -Condition (-not (Test-RoleCommandLine -Role 'backend' -CommandLine ('php.exe ' + $projectRoot + '-copy\BE\artisan serve'))) -Message 'A sibling path with the project-root prefix must not be owned.'

    function Get-NetTCPConnection { throw 'simulated provider failure' }
    Assert-Throws -Operation { Get-ListenerProcessId -Port 8000 } -ExpectedText 'Unable to query port 8000'
    Remove-Item Function:Get-NetTCPConnection

    $rootProcessId = 41001
    $childProcessId = 41002
    $foreignChildProcessId = 41003
    [ordered]@{ pid = $rootProcessId; role = 'backend'; projectRoot = $projectRoot } | ConvertTo-Json | Set-Content -LiteralPath $roleConfiguration.backend.PidPath -Encoding UTF8
    function Get-CimInstance {
        param([string]$ClassName, [string]$Filter)
        $processes = @(
            [pscustomobject]@{ ProcessId = $rootProcessId; ParentProcessId = 1; CommandLine = ('php.exe ' + $projectRoot + '\BE\artisan serve') },
            [pscustomobject]@{ ProcessId = $childProcessId; ParentProcessId = $rootProcessId; CommandLine = ('php.exe -S 127.0.0.1:8000 ' + $projectRoot + '\BE\server.php') },
            [pscustomobject]@{ ProcessId = $foreignChildProcessId; ParentProcessId = $rootProcessId; CommandLine = ('php.exe -S 127.0.0.1:8000 ' + $projectRoot + '-copy\BE\server.php') }
        )
        if ($Filter -match 'ProcessId\s*=\s*41001') { return $processes[0] }
        return $processes
    }
    $script:stoppedProcessIds = @()
    function Stop-Process { param([int]$Id) $script:stoppedProcessIds += $Id }
    Stop-RoleProcess -Role 'backend'
    Assert-True -Condition (($script:stoppedProcessIds -join ',') -eq "$childProcessId,$rootProcessId") -Message 'Scoped stop must stop only owned descendants, leaf first, then its owned launcher.'
    Assert-True -Condition (-not (Test-Path -LiteralPath $roleConfiguration.backend.PidPath)) -Message 'PID metadata should be removed after scoped tree cleanup.'
    Remove-Item Function:Get-CimInstance
    Remove-Item Function:Stop-Process

    [ordered]@{ projectRoot = $projectRoot; verifiedAtUtc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $verificationMarkerPath -Encoding UTF8
    Assert-True -Condition (-not (Test-VerificationMarker)) -Message 'A marker without owned processes and reachable endpoints must be rejected.'
    Assert-True -Condition (-not (Test-Path -LiteralPath $verificationMarkerPath)) -Message 'A stale marker must be removed.'

    Write-VerificationMarker -MySqlEvidence ([pscustomobject]@{ ServerVersion = '8.0.99'; BinaryVersion = 'mysqld  Ver 8.0.99' })
    Write-VerificationMarker -MySqlEvidence ([pscustomobject]@{ ServerVersion = '8.0.100'; BinaryVersion = 'mysqld  Ver 8.0.100' })
    Assert-True -Condition (Test-Path -LiteralPath $verificationMarkerPath) -Message 'Verification marker must be written.'
    $storedMarker = Get-Content -LiteralPath $verificationMarkerPath -Raw | ConvertFrom-Json
    Assert-True -Condition ($storedMarker.mysqlVersion -eq '8.0.100') -Message 'Atomic marker replacement must publish the complete newer marker.'
    Assert-True -Condition (@(Get-ChildItem -LiteralPath $testStateDirectory -Filter '*.tmp' -File).Count -eq 0) -Message 'Atomic marker writes must not leave a temporary file.'
    Assert-True -Condition (@(Get-ChildItem -LiteralPath $testStateDirectory -Filter '*.bak' -File).Count -eq 0) -Message 'Atomic marker writes must not leave a backup file.'

    function Test-HttpSuccess { param([string]$Url) return $false }
    Assert-Throws -Operation { Wait-ForRuntimeReady -TimeoutSeconds 0 } -ExpectedText 'within 0 seconds'
    Remove-Item Function:Test-HttpSuccess
}
finally {
    Remove-Item -LiteralPath $testStateDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Native runner behavioral tests passed.'
