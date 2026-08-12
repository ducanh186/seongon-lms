#Requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param([switch]$DestroyAllData)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:ProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$script:MarkerPath = Join-Path $PSScriptRoot '.native-runtime\native-verified.json'
$script:ConfirmationPhrase = 'DELETE DOCKER AND WSL DATA'

function Get-DockerResidualCandidates {
    $definitions = @(
        @{ Parent = $env:ProgramData; Child = 'Docker' },
        @{ Parent = $env:ProgramData; Child = 'DockerDesktop' },
        @{ Parent = $env:ProgramData; Child = 'DockerDesktopVMs' },
        @{ Parent = $env:ProgramFiles; Child = 'Docker' },
        @{ Parent = $env:LOCALAPPDATA; Child = 'Docker' },
        @{ Parent = $env:APPDATA; Child = 'Docker' },
        @{ Parent = $env:USERPROFILE; Child = '.docker' }
    )

    foreach ($definition in $definitions) {
        if (-not [string]::IsNullOrWhiteSpace([string]$definition.Parent)) {
            [pscustomobject]@{
                Parent = [string]$definition.Parent
                Path = Join-Path -Path ([string]$definition.Parent) -ChildPath ([string]$definition.Child)
            }
        }
    }
}

function Get-WslDistributionNames {
    if (-not (Get-Command -Name 'wsl.exe' -ErrorAction SilentlyContinue)) {
        return @()
    }

    try {
        return @(& wsl.exe --list --quiet 2>$null |
            ForEach-Object { ([string]$_).Replace([string][char]0, '').Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }
    catch {
        return @()
    }
}

function Get-DockerResourceIds {
    param([Parameter(Mandatory)][string[]]$Arguments)

    if (-not (Get-Command -Name 'docker.exe' -ErrorAction SilentlyContinue)) {
        return @()
    }

    try {
        return @(& docker.exe @Arguments 2>$null |
            ForEach-Object { ([string]$_).Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
            Select-Object -Unique)
    }
    catch {
        return @()
    }
}

function Get-OptionalFeatureState {
    param([Parameter(Mandatory)][string]$FeatureName)

    $command = Get-Command -Name 'Get-WindowsOptionalFeature' -ErrorAction SilentlyContinue
    if (-not $command) {
        return 'unavailable'
    }
    try {
        return (Get-WindowsOptionalFeature -Online -FeatureName $FeatureName -ErrorAction Stop).State
    }
    catch {
        return 'unavailable'
    }
}

function Invoke-Preview {
    Write-Host 'PREVIEW ONLY: no Docker, WSL, package, feature, or filesystem changes will be made.'

    $dockerCommand = Get-Command -Name 'docker.exe' -ErrorAction SilentlyContinue
    Write-Host ('PREVIEW Docker CLI: ' + $(if ($dockerCommand) { $dockerCommand.Source } else { 'not found' }))
    if ($dockerCommand) {
        foreach ($resource in @(
                @{ Label = 'containers'; Arguments = @('ps', '-aq') },
                @{ Label = 'volumes'; Arguments = @('volume', 'ls', '-q') },
                @{ Label = 'networks'; Arguments = @('network', 'ls', '--filter', 'type=custom', '-q') },
                @{ Label = 'images'; Arguments = @('image', 'ls', '-aq') })) {
            $ids = @(Get-DockerResourceIds -Arguments $resource.Arguments)
            Write-Host ('PREVIEW Docker {0}: {1}' -f $resource.Label, $(if ($ids.Count) { $ids -join ', ' } else { 'none or unavailable' }))
        }
    }

    $distributions = @(Get-WslDistributionNames)
    Write-Host ('PREVIEW WSL distributions: ' + $(if ($distributions.Count) { $distributions -join ', ' } else { 'none or unavailable' }))

    foreach ($candidate in Get-DockerResidualCandidates) {
        Write-Host ('PREVIEW residual path: {0} ({1})' -f $candidate.Path, $(if (Test-Path -LiteralPath $candidate.Path) { 'present' } else { 'absent' }))
    }

    $dockerPackage = Get-AppxPackage -Name 'DockerDesktop' -ErrorAction SilentlyContinue
    $wslPackage = Get-AppxPackage -Name 'MicrosoftCorporationII.WindowsSubsystemForLinux' -ErrorAction SilentlyContinue
    Write-Host ('PREVIEW Docker Store package: ' + $(if ($dockerPackage) { $dockerPackage.PackageFullName } else { 'absent' }))
    Write-Host ('PREVIEW WSL Store package: ' + $(if ($wslPackage) { $wslPackage.PackageFullName } else { 'absent' }))
    foreach ($feature in @('Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform')) {
        Write-Host ('PREVIEW optional feature {0}: {1}' -f $feature, (Get-OptionalFeatureState -FeatureName $feature))
    }
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-NativeVerificationMarker {
    if (-not (Test-Path -LiteralPath $script:MarkerPath -PathType Leaf)) {
        throw "Native verification marker is missing: $script:MarkerPath"
    }

    try {
        $marker = Get-Content -LiteralPath $script:MarkerPath -Raw | ConvertFrom-Json
        $markerRoot = [IO.Path]::GetFullPath([string]$marker.projectRoot).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    }
    catch {
        throw "Native verification marker is invalid: $($_.Exception.Message)"
    }

    if ([string]::IsNullOrWhiteSpace([string]$marker.projectRoot) -or
        -not $markerRoot.Equals($script:ProjectRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Native verification marker projectRoot does not match this repository.'
    }
    if ([string]$marker.mysqlVersion -notmatch '^8\.0\.\d+') {
        throw 'Native verification marker does not record MySQL 8.0.'
    }
    return $marker
}

function Test-HttpEndpoint {
    param([Parameter(Mandatory)][string]$Uri)

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    }
    catch {
        return $false
    }
}

function Test-MySql80Now {
    try {
        $service = Get-CimInstance -ClassName Win32_Service -Filter "Name='MySQL80'" -ErrorAction Stop
        if ($null -eq $service -or $service.State -ne 'Running') {
            return $false
        }
        $pathName = [string]$service.PathName
        $serverPath = if ($pathName -match '^\s*"([^"]+mysqld\.exe)"') { $matches[1] } elseif ($pathName -match '^\s*([^\s]+mysqld\.exe)') { $matches[1] } else { $null }
        if (-not $serverPath -or -not (Test-Path -LiteralPath $serverPath -PathType Leaf)) {
            return $false
        }
        $version = ((& $serverPath --version | Select-Object -First 1) -join ' ').Trim()
        return $LASTEXITCODE -eq 0 -and $version -match '(?i)\b(?:Ver\s+)?8\.0\.\d+\b'
    }
    catch {
        return $false
    }
}

function Confirm-DestructionPrerequisites {
    if (-not (Test-Administrator)) {
        throw 'Administrator privileges are required. Nothing was removed.'
    }

    $marker = Get-NativeVerificationMarker
    foreach ($endpoint in @([string]$marker.backendUrl, [string]$marker.frontendUrl)) {
        if ([string]::IsNullOrWhiteSpace($endpoint) -or -not (Test-HttpEndpoint -Uri $endpoint)) {
            throw "Native endpoint is not responding: $endpoint. Nothing was removed."
        }
    }
    if (-not (Test-MySql80Now)) {
        throw 'MySQL 8.0 is not running now. Nothing was removed.'
    }
}

function Safe-RemoveDirectory {
    param(
        [Parameter(Mandatory)][string]$LiteralPath,
        [Parameter(Mandatory)][string]$ExpectedParent
    )

    $targetFullPath = [IO.Path]::GetFullPath($LiteralPath)
    $expectedParentFullPath = [IO.Path]::GetFullPath($ExpectedParent).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $directorySeparator = [IO.Path]::DirectorySeparatorChar
    $expectedPrefix = $expectedParentFullPath + $directorySeparator
    $rootPath = [IO.Path]::GetPathRoot($targetFullPath)
    $userProfileRoot = if ([string]::IsNullOrWhiteSpace($env:USERPROFILE)) { $null } else { [IO.Path]::GetFullPath($env:USERPROFILE).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) }

    if ([string]::IsNullOrWhiteSpace($ExpectedParent) -or
        $targetFullPath.Equals($rootPath, [StringComparison]::OrdinalIgnoreCase) -or
        $targetFullPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar).Equals($expectedParentFullPath, [StringComparison]::OrdinalIgnoreCase) -or
        ($userProfileRoot -and $targetFullPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar).Equals($userProfileRoot, [StringComparison]::OrdinalIgnoreCase)) -or
        $targetFullPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar).Equals($script:ProjectRoot, [StringComparison]::OrdinalIgnoreCase) -or
        -not $targetFullPath.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing unsafe directory deletion target: $LiteralPath"
    }

    if (Test-Path -LiteralPath $targetFullPath -PathType Container -and $PSCmdlet.ShouldProcess($targetFullPath, 'Remove Docker residual directory')) {
        Remove-Item -LiteralPath $targetFullPath -Recurse -Force -ErrorAction Stop
        Write-Host "EXECUTED: REMOVE DIRECTORY $targetFullPath"
    }
}

function Invoke-ExternalMutation {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][scriptblock]$Operation
    )

    if ($PSCmdlet.ShouldProcess($Label, 'Execute destructive operation')) {
        & $Operation
        if ($LASTEXITCODE -ne 0) {
            throw "Failed: $Label (exit code $LASTEXITCODE)"
        }
        Write-Host "EXECUTED: $Label"
    }
}

function Stop-DockerDesktop {
    foreach ($name in @('Docker Desktop', 'com.docker.backend', 'com.docker.service')) {
        foreach ($process in @(Get-Process -Name $name -ErrorAction SilentlyContinue)) {
            if ($PSCmdlet.ShouldProcess("process $($process.Id)", 'Stop Docker Desktop process')) {
                Stop-Process -Id $process.Id -Force -ErrorAction Stop
                Write-Host "EXECUTED: STOP PROCESS $($process.Id)"
            }
        }
    }
    $service = Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue
    if ($service -and $service.Status -ne 'Stopped' -and $PSCmdlet.ShouldProcess('com.docker.service', 'Stop Docker Desktop service')) {
        Stop-Service -Name 'com.docker.service' -ErrorAction Stop
        Write-Host 'EXECUTED: STOP SERVICE com.docker.service'
    }
}

function Remove-DockerEngineResources {
    if (-not (Get-Command -Name 'docker.exe' -ErrorAction SilentlyContinue)) {
        return
    }
    & docker.exe info 2>$null
    if ($LASTEXITCODE -ne 0) {
        return
    }

    foreach ($resource in @(
            @{ Label = 'DOCKER CONTAINERS'; Query = @('ps', '-aq'); Remove = @('rm', '-f') },
            @{ Label = 'DOCKER VOLUMES'; Query = @('volume', 'ls', '-q'); Remove = @('volume', 'rm', '-f') },
            @{ Label = 'DOCKER NETWORKS'; Query = @('network', 'ls', '--filter', 'type=custom', '-q'); Remove = @('network', 'rm') },
            @{ Label = 'DOCKER IMAGES'; Query = @('image', 'ls', '-aq'); Remove = @('image', 'rm', '-f') })) {
        $ids = @(Get-DockerResourceIds -Arguments $resource.Query)
        foreach ($id in $ids) {
            Invoke-ExternalMutation -Label ($resource.Label + ' ' + $id) -Operation { & docker.exe @($resource.Remove + @($id)) }
        }
    }
    Invoke-ExternalMutation -Label 'DOCKER BUILDER CACHE' -Operation { & docker.exe builder prune --all --force }
}

function Remove-WslDistributions {
    Invoke-ExternalMutation -Label 'WSL SHUTDOWN' -Operation { & wsl.exe --shutdown }
    foreach ($distribution in @(Get-WslDistributionNames)) {
        Invoke-ExternalMutation -Label ('WSL UNREGISTER ' + $distribution) -Operation { & wsl.exe --unregister $distribution }
    }
}

function Remove-DockerDesktopApplication {
    $winget = Get-Command -Name 'winget.exe' -ErrorAction SilentlyContinue
    if ($winget) {
        $listed = (& winget.exe list --id Docker.DockerDesktop --exact --accept-source-agreements 2>$null | Out-String)
        if ($LASTEXITCODE -eq 0 -and $listed -match 'Docker\.DockerDesktop|Docker Desktop') {
            Invoke-ExternalMutation -Label 'WINGET UNINSTALL Docker.DockerDesktop' -Operation { & winget.exe uninstall --id Docker.DockerDesktop --exact --silent --accept-source-agreements }
            return
        }
    }

    $uninstallEntry = @(Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -eq 'Docker Desktop' } |
        Select-Object -First 1)
    if (-not $uninstallEntry -or [string]::IsNullOrWhiteSpace([string]$uninstallEntry.UninstallString)) {
        return
    }
    $uninstallString = [string]$uninstallEntry.UninstallString
    if ($uninstallString -match '^\s*"([^"]+)"\s*(.*)$') {
        $filePath = $matches[1]; $arguments = $matches[2]
    }
    elseif ($uninstallString -match '^\s*([^\s]+\.exe)\s*(.*)$') {
        $filePath = $matches[1]; $arguments = $matches[2]
    }
    else {
        throw 'Docker Desktop uninstall string is not an executable command. Nothing was removed.'
    }
    Invoke-ExternalMutation -Label 'REGISTERED UNINSTALL Docker Desktop' -Operation {
        $process = Start-Process -FilePath $filePath -ArgumentList $arguments -Wait -PassThru -ErrorAction Stop
        if ($process.ExitCode -ne 0) { throw "Docker Desktop uninstaller failed with exit code $($process.ExitCode)" }
    }
}

function Remove-WslStorePackage {
    $package = Get-AppxPackage -Name 'MicrosoftCorporationII.WindowsSubsystemForLinux' -ErrorAction SilentlyContinue
    if ($package -and $PSCmdlet.ShouldProcess($package.PackageFullName, 'Remove WSL Store package for current user')) {
        Remove-AppxPackage -Package $package.PackageFullName -ErrorAction Stop
        Write-Host "EXECUTED: REMOVE WSL STORE PACKAGE $($package.PackageFullName)"
    }
}

function Disable-WslFeatures {
    foreach ($feature in @('Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform')) {
        Invoke-ExternalMutation -Label ('DISM DISABLE FEATURE ' + $feature) -Operation { & dism.exe /Online /Disable-Feature (('/FeatureName:' + $feature)) /NoRestart }
    }
}

function Invoke-Destruction {
    Stop-DockerDesktop
    Remove-DockerEngineResources
    Remove-WslDistributions
    Remove-DockerDesktopApplication
    Remove-WslStorePackage
    foreach ($candidate in Get-DockerResidualCandidates) {
        Safe-RemoveDirectory -LiteralPath $candidate.Path -ExpectedParent $candidate.Parent
    }
    Disable-WslFeatures
}

if ($MyInvocation.InvocationName -ne '.') {
    if (-not $DestroyAllData) {
        Invoke-Preview
        return
    }

    Confirm-DestructionPrerequisites
    $confirmation = Read-Host 'Type DELETE DOCKER AND WSL DATA to continue'
    if ($confirmation -cne 'DELETE DOCKER AND WSL DATA') {
        throw 'Confirmation did not match. Nothing was removed.'
    }
    Invoke-Destruction
}
