# Native Windows Runtime and Docker/WSL Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tested PowerShell tooling that installs and runs the Seongon LMS natively on localhost, verifies it, and only then permits complete Docker Desktop and WSL 2 removal.

**Architecture:** Keep setup, daily runtime control, and destructive removal in three separate scripts. Share state only through a small repository-scoped `.native-runtime` directory containing PID metadata, logs, and a verification marker; never use it as a source for credentials. MySQL 8.0 installation remains an official guided installer step, while PHP 8.3, Node 22, Composer, project configuration, database creation, migration, and seed are scripted.

**Tech Stack:** Windows PowerShell 5.1-compatible scripts, Winget, PHP 8.3, Composer 2, Node.js 22/npm, MySQL Community Server 8.0, Laravel Artisan, Vite.

## Global Constraints

- Bind Laravel to `127.0.0.1:8000` and Vite to `127.0.0.1:5173`; do not add firewall rules.
- Preserve MySQL 8.0 compatibility; do not silently install MySQL 8.4, MariaDB, XAMPP, or SQLite.
- Never print or log MySQL root/application passwords.
- Never pass raw SQL directly as PowerShell statements; use a here-string written to a validated temporary file.
- Do not remove Docker or WSL until a current native verification marker exists for this repository.
- Destructive removal requires `-DestroyAllData` plus interactive text `DELETE DOCKER AND WSL DATA`.
- Keep BIOS virtualization enabled.
- Recursive filesystem deletion is allowed only for explicit, resolved Docker directories validated beneath an expected parent.
- The current workspace is not recognized as a Git repository, so commit steps are unavailable; use file-level diff and test checkpoints instead.

## File Structure

- Create `Infra/setup-native-windows.ps1`: install/validate dependencies and configure the application.
- Create `Infra/run-native-windows.ps1`: start, stop, restart, inspect, and verify native processes.
- Create `Infra/remove-docker-wsl-windows.ps1`: preview or execute destructive removal.
- Create `Infra/tests/verify-native-windows-scripts.ps1`: static contract and parser checks.
- Create `Infra/tests/test-remove-docker-wsl-preview.ps1`: execute only the non-destructive preview path.
- Modify `Infra/README.md`: document native installation, daily operation, and irreversible removal.

---

### Task 1: Lock the PowerShell Safety Contracts With Failing Tests

**Files:**
- Create: `Infra/tests/verify-native-windows-scripts.ps1`
- Create: `Infra/tests/test-remove-docker-wsl-preview.ps1`
- Test: `Infra/tests/verify-native-windows-scripts.ps1`
- Test: `Infra/tests/test-remove-docker-wsl-preview.ps1`

**Interfaces:**
- Consumes: approved design spec and the three expected script paths.
- Produces: executable test contracts that fail while the implementation scripts are absent.

- [ ] **Step 1: Create the static contract test**

Write `verify-native-windows-scripts.ps1` with `Set-StrictMode -Version Latest`, `$ErrorActionPreference = 'Stop'`, repository-root resolution from `$PSScriptRoot`, and these exact assertion groups:

```powershell
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
```

Parse each script using `[System.Management.Automation.Language.Parser]::ParseFile(...)`; throw when parser errors exist, any required pattern is absent, `Remove-Item -Recurse` appears outside `Safe-RemoveDirectory`, or setup/runner contains Docker volume deletion.

- [ ] **Step 2: Create the preview behavior test**

Write `test-remove-docker-wsl-preview.ps1` to run the removal script with no destructive switch, capture output, require exit code `0`, require the words `PREVIEW`, `Docker`, and `WSL`, and reject evidence that DISM, Winget uninstall, `wsl --unregister`, or recursive deletion executed.

```powershell
$result = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Preview mode must exit successfully.' }
$text = $result -join [Environment]::NewLine
foreach ($required in @('PREVIEW', 'Docker', 'WSL')) {
    if ($text -notmatch [regex]::Escape($required)) {
        throw "Preview output is missing '$required'."
    }
}
foreach ($forbidden in @('EXECUTED: DISM', 'EXECUTED: WINGET UNINSTALL', 'EXECUTED: WSL UNREGISTER', 'EXECUTED: REMOVE DIRECTORY')) {
    if ($text -match [regex]::Escape($forbidden)) {
        throw "Preview performed a destructive action: $forbidden"
    }
}
```

- [ ] **Step 3: Verify RED**

Run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\verify-native-windows-scripts.ps1'
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\test-remove-docker-wsl-preview.ps1'
```

Expected: both fail because the three production scripts do not exist. Confirm the failure is specifically a missing-script assertion.

- [ ] **Step 4: Audit the test files**

Run both parser checks directly:

```powershell
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path '.\Infra\tests\verify-native-windows-scripts.ps1'), [ref]$null, [ref]$errors) | Out-Null
if ($errors.Count -gt 0) { throw ($errors | Out-String) }
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path '.\Infra\tests\test-remove-docker-wsl-preview.ps1'), [ref]$null, [ref]$errors) | Out-Null
if ($errors.Count -gt 0) { throw ($errors | Out-String) }
```

Expected: parser checks pass even though behavioral tests remain RED.

---

### Task 2: Implement Native Dependency and Application Setup

**Files:**
- Create: `Infra/setup-native-windows.ps1`
- Test: `Infra/tests/verify-native-windows-scripts.ps1`

**Interfaces:**
- Consumes: repository layout, Winget, official Composer signature endpoint, interactive MySQL Installer 8.0.
- Produces: `BE/.env`, installed dependencies, `seongon_lms` database, and a configured native application.
- Command: `& '.\Infra\setup-native-windows.ps1' [-PreflightOnly] [-ResumeAfterMySql]`.

- [ ] **Step 1: Add the script shell and read-only preflight**

Use this public interface:

```powershell
#Requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$PreflightOnly,
    [switch]$ResumeAfterMySql
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'BE'
$frontendRoot = Join-Path $projectRoot 'FE\DEMO'
```

Preflight reports but does not mutate: Administrator state, Winget, PHP version/modules, Composer, Node major version, npm, MySQL client/server version, ports `3306`, `8000`, and `5173`, and presence of both package lock files.

- [ ] **Step 2: Install exact Winget packages and refresh PATH**

Implement `Ensure-WingetPackage` to query `winget list --id <id> --exact`, then install only when absent using `--accept-package-agreements --accept-source-agreements --disable-interactivity`. Call it only for:

```powershell
Ensure-WingetPackage -Id 'PHP.PHP.8.3'
Ensure-WingetPackage -Id 'OpenJS.NodeJS.22'
```

Refresh process `PATH` by combining Machine and User environment PATH values; do not overwrite the persistent PATH directly.

- [ ] **Step 3: Configure and verify PHP**

Resolve `php.exe`, copy `php.ini-production` to the loaded configuration path when no `php.ini` exists, and idempotently uncomment available module entries. Required verification list:

```powershell
$requiredPhpModules = @('bcmath', 'dom', 'gd', 'intl', 'mbstring', 'Zend OPcache', 'pdo_mysql', 'zip')
```

Treat `dom` as already satisfied when compiled in. Use `zend_extension=opcache` for OPcache and ordinary `extension=` entries for the other DLL modules. Run `php --ini` and `php -m`; throw with the exact missing module names.

- [ ] **Step 4: Install Composer with live signature verification**

Download `https://composer.github.io/installer.sig` and `https://getcomposer.org/installer` into a `New-Item -ItemType Directory` temporary directory under `$env:TEMP`. Compare `[System.BitConverter]::ToString((Get-FileHash -Algorithm SHA384).Hash)` only after normalizing case/format, run the installer with PHP into `%LOCALAPPDATA%\Programs\Composer`, create `composer.bat`, and remove the temporary directory in `finally`.

Never continue when the SHA-384 values differ.

- [ ] **Step 5: Gate on official MySQL 8.0 installation**

When `mysql.exe` is missing or does not report major/minor `8.0`, open `https://dev.mysql.com/downloads/installer/`, print these exact guided choices, and exit without partial database configuration:

```text
Select MySQL Installer 8.0.46.
Install MySQL Server 8.0 only.
Use port 3306 and Windows service name MySQL80.
Choose a strong root password and keep it available for the next run.
Rerun setup-native-windows.ps1 with -ResumeAfterMySql.
```

Do not accept MySQL 8.4 or MariaDB as satisfying this gate.

- [ ] **Step 6: Create the database and application user without leaking secrets**

Read the root credential through `Read-Host -AsSecureString`. Generate the application password as 32 random bytes encoded as lowercase hexadecimal. Create a temporary MySQL option file and SQL file under a new task-specific temporary directory; restrict the directory ACL to the current user before writing secrets.

The SQL here-string must perform only idempotent creation/grant operations:

```sql
CREATE DATABASE IF NOT EXISTS `seongon_lms` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'seongon'@'localhost' IDENTIFIED BY '<generated-hex-password>';
ALTER USER 'seongon'@'localhost' IDENTIFIED BY '<generated-hex-password>';
GRANT ALL PRIVILEGES ON `seongon_lms`.* TO 'seongon'@'localhost';
FLUSH PRIVILEGES;
```

Invoke `mysql.exe --defaults-extra-file=<validated-path> < <validated-sql-path>` through `cmd.exe` only for this non-filesystem database import. Delete the temporary directory in `finally`.

- [ ] **Step 7: Configure Laravel and install project dependencies**

Back up an existing `BE/.env` to `BE/.env.native-backup-<timestamp>` before script-owned edits. Set these exact values through a `Set-DotEnvValue` helper that replaces a full key line or appends it:

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=seongon_lms
DB_USERNAME=seongon
DB_PASSWORD=<generated-hex-password>
SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
```

Then execute with explicit working directories and nonzero-exit checks:

```powershell
composer install --no-interaction --working-dir $backendRoot
php (Join-Path $backendRoot 'artisan') key:generate --force
php (Join-Path $backendRoot 'artisan') migrate --force
php (Join-Path $backendRoot 'artisan') app:seed-demo-once
npm.cmd ci --prefix $frontendRoot
```

- [ ] **Step 8: Verify GREEN for setup contracts**

Run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\verify-native-windows-scripts.ps1'
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\setup-native-windows.ps1' -PreflightOnly
```

Expected: the static test advances past setup assertions; preflight exits without installing, editing, or deleting anything and reports each dependency state.

---

### Task 3: Implement the Scoped Native Runtime Controller

**Files:**
- Create: `Infra/run-native-windows.ps1`
- Test: `Infra/tests/verify-native-windows-scripts.ps1`

**Interfaces:**
- Consumes: configured `BE/.env`, PHP, Node/npm, MySQL80 service.
- Produces: repository-owned backend/frontend processes, logs, PID metadata, and `Infra/.native-runtime/native-verified.json`.
- Command: `& '.\Infra\run-native-windows.ps1' <start|stop|restart|status|logs>`.

- [ ] **Step 1: Add action routing and state paths**

Use this public interface:

```powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
    [string]$Action = 'status'
)
```

Store `backend.pid.json`, `frontend.pid.json`, `backend.stdout.log`, `backend.stderr.log`, `frontend.stdout.log`, `frontend.stderr.log`, and `native-verified.json` only under `Infra/.native-runtime`.

- [ ] **Step 2: Implement process ownership checks**

For every PID operation, query `Win32_Process` and require both:

- command line contains the resolved repository root;
- backend command contains `artisan serve`, or frontend command contains `vite`/`npm` plus `FE\DEMO`.

If either check fails, remove only the stale PID metadata and do not stop that process. Never use `Stop-Process -Name php`, `node`, or `mysql`.

- [ ] **Step 3: Implement local-only start and readiness checks**

Before start, ensure MySQL80 is running and ports are free or already owned by matching recorded processes. Start with `Start-Process -PassThru -WindowStyle Hidden` and explicit working directories:

```text
php artisan serve --host=127.0.0.1 --port=8000
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Poll `http://127.0.0.1:8000/up` and `http://localhost:5173/` for at most 60 seconds. On timeout, stop only newly created owned processes and print the stderr log paths.

- [ ] **Step 4: Implement verification marker and remaining actions**

After both endpoints return success, write JSON containing:

```json
{
  "projectRoot": "<resolved repository root>",
  "verifiedAtUtc": "<ISO-8601 UTC timestamp>",
  "backendUrl": "http://127.0.0.1:8000",
  "frontendUrl": "http://localhost:5173",
  "mysqlVersion": "8.0.x"
}
```

`status` validates ownership and probes both endpoints. `logs` tails all existing log files. `stop` removes the verification marker first, stops only owned frontend/backend processes, then removes their PID files. `restart` calls scoped stop then start.

- [ ] **Step 5: Verify GREEN for runner contracts**

Run the static test, then run `status` while stopped:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\verify-native-windows-scripts.ps1'
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\run-native-windows.ps1' status
```

Expected: static runner assertions pass. A stopped status reports both processes as stopped without killing or starting anything.

---

### Task 4: Implement Preview-First Docker and WSL Destruction

**Files:**
- Create: `Infra/remove-docker-wsl-windows.ps1`
- Test: `Infra/tests/verify-native-windows-scripts.ps1`
- Test: `Infra/tests/test-remove-docker-wsl-preview.ps1`

**Interfaces:**
- Consumes: a valid native verification marker and explicit user confirmation.
- Produces: Docker Desktop absent, Docker data removed, all WSL distributions unregistered, WSL Store package removed, and WSL/VMP optional features disabled.
- Preview: `& '.\Infra\remove-docker-wsl-windows.ps1'`.
- Destructive: `& '.\Infra\remove-docker-wsl-windows.ps1' -DestroyAllData`, followed by typed confirmation.

- [ ] **Step 1: Implement guaranteed non-destructive default mode**

Use:

```powershell
#Requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param([switch]$DestroyAllData)
```

Without the switch, print a PREVIEW of Docker resources, WSL distributions, explicit residual paths, Store package state, and optional-feature state. Do not call any mutating command.

- [ ] **Step 2: Implement the hard gates**

With `-DestroyAllData`, require Administrator privileges, parse `native-verified.json`, require its normalized `projectRoot` to equal the current repository, require both native endpoints to respond now, require MySQL major/minor 8.0, then prompt:

```powershell
$confirmation = Read-Host 'Type DELETE DOCKER AND WSL DATA to continue'
if ($confirmation -cne 'DELETE DOCKER AND WSL DATA') {
    throw 'Confirmation did not match. Nothing was removed.'
}
```

- [ ] **Step 3: Implement resource and application removal in fixed order**

Perform only after both gates:

1. Stop Docker Desktop processes and `com.docker.service` when present.
2. If Docker engine responds, enumerate exact resource IDs and remove containers, volumes, unused networks, images, and builder cache.
3. Run `wsl.exe --shutdown`.
4. Enumerate `wsl.exe --list --quiet`, remove NUL characters/blank lines, and call `wsl.exe --unregister <exact-name>` once per distribution.
5. Uninstall Winget package `Docker.DockerDesktop`; if absent, use only the registered Docker Desktop uninstall string.
6. Remove the WSL Store package `MicrosoftCorporationII.WindowsSubsystemForLinux` for the current user.
7. Remove validated Docker residual directories.
8. Disable `Microsoft-Windows-Subsystem-Linux` and `VirtualMachinePlatform` with DISM `/NoRestart`.

Print explicit `EXECUTED:` markers only after each mutating command actually returns success.

- [ ] **Step 4: Implement safe residual-directory deletion**

The only accepted candidates are exact children constructed from nonempty values of:

```powershell
$env:ProgramData
$env:ProgramFiles
$env:LOCALAPPDATA
$env:APPDATA
$env:USERPROFILE
```

Implement `Safe-RemoveDirectory -LiteralPath <path> -ExpectedParent <parent>` using `[IO.Path]::GetFullPath`. Reject drive roots, the expected parent itself, the user-profile root, the repository root, and any target not starting with `expectedParent + DirectorySeparatorChar`. `Remove-Item -LiteralPath ... -Recurse -Force` may appear only inside this function.

- [ ] **Step 5: Verify RED-to-GREEN without destruction**

Run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\verify-native-windows-scripts.ps1'
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\test-remove-docker-wsl-preview.ps1'
```

Expected: both pass. Do not run `-DestroyAllData` in the development workspace.

---

### Task 5: Document the Operator Flow and Run Full Verification

**Files:**
- Modify: `Infra/README.md`
- Test: all PowerShell verification scripts plus existing application tests.

**Interfaces:**
- Consumes: all three scripts and their verified command interfaces.
- Produces: a beginner-facing runbook with installation, normal use, recovery, and destructive warnings.

- [ ] **Step 1: Add native installation documentation**

Document this exact order:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& '.\Infra\setup-native-windows.ps1' -PreflightOnly
& '.\Infra\setup-native-windows.ps1'
# Complete MySQL Installer 8.0 when prompted, then:
& '.\Infra\setup-native-windows.ps1' -ResumeAfterMySql
& '.\Infra\run-native-windows.ps1' start
Start-Process 'http://localhost:5173'
```

Explain `.env`, process, service, PID, and health check using the beginner-facing three-level explanation style required by the workspace instructions.

- [ ] **Step 2: Add daily operation and removal documentation**

Document `start`, `status`, `logs`, `restart`, and `stop`. Put the destructive command in a separate warning section and state that it deletes every WSL distribution without backup:

```powershell
& '.\Infra\remove-docker-wsl-windows.ps1'
& '.\Infra\remove-docker-wsl-windows.ps1' -DestroyAllData
```

State that the second command still requires the exact interactive confirmation and a passing native verification marker.

- [ ] **Step 3: Run fresh parser and safety verification**

Run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\verify-native-windows-scripts.ps1'
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\test-remove-docker-wsl-preview.ps1'
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\verify-run-docker-bootstrap.ps1'
```

Expected: all pass with exit code `0`; the preview test proves no destructive action ran.

- [ ] **Step 4: Run application regression tests**

Run from the actual package roots:

```powershell
Set-Location '.\FE\DEMO'
npm.cmd test -- --reporter=dot
npm.cmd run build
Set-Location '..\..\BE'
php artisan test --testdox
```

Expected: all frontend tests pass, frontend production build exits `0`, and all backend tests pass. Record exact current counts instead of copying historical counts.

- [ ] **Step 5: Review the final filesystem diff**

Because Git is unavailable in the current workspace, enumerate only the five planned files, verify no unrelated file changed, and report the limitation. Do not claim destructive removal was executed; hand off the exact target-machine acceptance sequence from the design spec.

## Plan Self-Review Result

- All approved scope items map to Tasks 2-5.
- All production scripts begin with a failing contract in Task 1.
- The destructive path is never executed during development verification.
- The native runtime must be live and currently healthy before destructive removal can begin.
- No placeholder steps or silent database substitutions remain.
