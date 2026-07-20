Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$expectedScripts = @(
    'Infra\setup-native-windows.ps1',
    'Infra\run-native-windows.ps1',
    'Infra\remove-docker-wsl-windows.ps1'
)

$requiredSetupPatterns = @(
    'PHP.PHP.8.3',
    'OpenJS.NodeJS.22',
    'composer.github.io/installer.sig',
    'dev.mysql.com/downloads/installer',
    'bcmath', 'dom', 'gd', 'intl', 'mbstring', 'opcache', 'pdo_mysql', 'zip',
    'app:seed-demo-once',
    '127.0.0.1',
    'FRONTEND_URL'
)

$requiredRunnerPatterns = @(
    "ValidateSet('start', 'stop', 'restart', 'status', 'logs')",
    '127.0.0.1', '8000', '5173',
    '.native-runtime',
    'native-verified.json',
    'Win32_Process'
)

$requiredRemovalPatterns = @(
    'DestroyAllData',
    'DELETE DOCKER AND WSL DATA',
    'native-verified.json',
    'wsl.exe', '--unregister',
    'Docker.DockerDesktop',
    'MicrosoftCorporationII.WindowsSubsystemForLinux',
    'Microsoft-Windows-Subsystem-Linux',
    'VirtualMachinePlatform',
    'Safe-RemoveDirectory'
)

function Get-ParsedScript {
    param(
        [Parameter(Mandatory)]
        [string]$RelativePath
    )

    $scriptPath = Join-Path $repositoryRoot $RelativePath
    if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
        throw "Required production script is missing: $RelativePath"
    }

    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile(
        $scriptPath,
        [ref]$tokens,
        [ref]$parseErrors
    )

    if ($parseErrors.Count -gt 0) {
        throw "PowerShell parser errors in ${RelativePath}:`n$($parseErrors | Out-String)"
    }

    return [pscustomobject]@{
        RelativePath = $RelativePath
        Ast          = $ast
        Content      = Get-Content -LiteralPath $scriptPath -Raw
    }
}

function Assert-RequiredPatterns {
    param(
        [Parameter(Mandatory)]
        [string]$RelativePath,
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string[]]$Patterns
    )

    foreach ($pattern in $Patterns) {
        if ($Content -notmatch [regex]::Escape($pattern)) {
            throw "Required pattern '$pattern' is missing from $RelativePath"
        }
    }
}

function Assert-RecursiveDeletionIsSafe {
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.Language.Ast]$Ast,
        [Parameter(Mandatory)]
        [string]$RelativePath
    )

    $commands = $Ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] }, $true)
    foreach ($command in $commands) {
        $usesRecursiveRemove = $command.GetCommandName() -eq 'Remove-Item' -and
            ($command.CommandElements | ForEach-Object { $_.Extent.Text }) -match '^-Recurse'
        if (-not $usesRecursiveRemove) {
            continue
        }

        $parent = $command.Parent
        $isInsideSafeRemoveDirectory = $false
        while ($null -ne $parent) {
            if ($parent -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
                $parent.Name -eq 'Safe-RemoveDirectory') {
                $isInsideSafeRemoveDirectory = $true
                break
            }
            $parent = $parent.Parent
        }

        if (-not $isInsideSafeRemoveDirectory) {
            throw "Remove-Item -Recurse appears outside Safe-RemoveDirectory in $RelativePath"
        }
    }
}

$parsedScripts = @{}
foreach ($relativePath in $expectedScripts) {
    $parsedScripts[$relativePath] = Get-ParsedScript -RelativePath $relativePath
}

Assert-RequiredPatterns -RelativePath 'Infra\setup-native-windows.ps1' `
    -Content $parsedScripts['Infra\setup-native-windows.ps1'].Content `
    -Patterns $requiredSetupPatterns
Assert-RequiredPatterns -RelativePath 'Infra\run-native-windows.ps1' `
    -Content $parsedScripts['Infra\run-native-windows.ps1'].Content `
    -Patterns $requiredRunnerPatterns
Assert-RequiredPatterns -RelativePath 'Infra\remove-docker-wsl-windows.ps1' `
    -Content $parsedScripts['Infra\remove-docker-wsl-windows.ps1'].Content `
    -Patterns $requiredRemovalPatterns

foreach ($relativePath in $expectedScripts) {
    Assert-RecursiveDeletionIsSafe -Ast $parsedScripts[$relativePath].Ast -RelativePath $relativePath
}

foreach ($relativePath in @('Infra\setup-native-windows.ps1', 'Infra\run-native-windows.ps1')) {
    $content = $parsedScripts[$relativePath].Content
    if ($content -match '(?im)\bdocker(?:\.exe)?\s+volume\s+(?:rm|prune)\b' -or
        $content -match '(?im)\bdocker(?:\.exe)?\s+compose\b[^\r\n]*(?:\s-v\b|--volumes\b)') {
        throw "Docker volume deletion is not allowed in $relativePath"
    }
}
