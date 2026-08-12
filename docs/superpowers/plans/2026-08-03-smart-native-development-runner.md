# Smart Native Development Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one Windows PowerShell script that intelligently prepares, migrates, seeds, builds, restarts, verifies, and opens the native Seongon LMS development stack.

**Architecture:** Keep preparation and runtime ownership in `Infra/run-native-windows.ps1`, with repository-scoped state under `Infra/.native-runtime`. Direct PHP and Node child processes own their ports and are controlled only after PID plus command-line ownership validation. Behavioral tests use a temporary fixture repository and fake localhost PHP/Node servers on high ports.

**Tech Stack:** Windows PowerShell 5.1, PHP 8.3/Laravel Artisan, Composer 2, Node.js/npm/Vite, MySQL Community Server 8.0.

## Global Constraints

- Default action is `restart`; supported actions are `start`, `stop`, `restart`, `status`, and `logs`.
- Bind only to `127.0.0.1`; production defaults are backend port `8000` and frontend port `5173`.
- Never print or persist `.env` secrets.
- Never invoke `migrate:fresh`, `composer update`, `npm audit fix`, or `npm audit fix --force`.
- Stop only a PID whose `Win32_Process.CommandLine` contains the resolved repository root and expected absolute Artisan or Vite entrypoint.
- Preserve unrelated working-tree changes and do not edit files outside this task.
- Use `apply_patch` for edits and Windows PowerShell syntax in all user-facing commands.

---

### Task 1: Implement and Verify the Smart Native Development Runner

**Files:**
- Create: `Infra/run-native-windows.ps1`
- Create: `Infra/tests/test-run-native-windows.ps1`
- Modify: `docs/NATIVE_WINDOWS_SETUP.md`

**Interfaces:**
- Consumes: configured `BE/.env`, `BE/composer.lock`, `FE/DEMO/package-lock.json`, PHP, Composer, Node/npm, Vite, and service `MySQL80`.
- Produces: repository-owned localhost processes, bounded logs, PID JSON, smart stamps, and `native-verified.json` under `Infra/.native-runtime`.
- Public command: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\Infra\run-native-windows.ps1' [start|stop|restart|status|logs] [-NoBrowser]`.

- [ ] **Step 1: Write the failing behavioral and static tests**

Create `Infra/tests/test-run-native-windows.ps1` with temporary fixture cleanup in `finally`. The test must:

1. Fail initially because `Infra/run-native-windows.ps1` is absent.
2. Parse the runner and test through `System.Management.Automation.Language.Parser`.
3. Assert the runner contains no broad name-based process termination and no forbidden dependency/database commands.
4. Invoke `status` against a stopped fixture and require exit code zero plus backend/frontend stopped output.
5. Create a fake fixture containing `BE/artisan`, `BE/.env`, Composer files, `FE/DEMO/package-lock.json`, source/config files, and a fake Vite entrypoint.
6. Use test-only high ports, `-NoBrowser`, `-SkipMySqlCheck`, and `-SkipPreparationCommands` to exercise real `start`, `status`, `restart`, and `stop` process ownership without changing MySQL or installing dependencies.
7. Verify endpoint readiness, PID metadata, verification marker creation, scoped restart with changed PIDs, and removal of PID/verification metadata on stop.
8. Write a mismatched PID record referencing a live unrelated process; require `stop` to leave that process alive and remove only stale metadata.
9. Exercise deterministic frontend and lock-file fingerprints by dot-sourcing the runner in `status` mode and calling exported helper functions twice, then after a fixture source change.
10. Print one final `PASS:` line only after every assertion succeeds.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\test-run-native-windows.ps1'
```

Expected: nonzero exit with `Required production script is missing`.

- [ ] **Step 3: Implement the PowerShell 5.1 runner**

Use this public parameter surface:

```powershell
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
```

Implement focused helpers with these responsibilities:

- `Resolve-RequiredFile` and `Resolve-NativeCommandPath`: exact path validation.
- `Invoke-NativeCommandCapture`: PowerShell 5.1-safe native stdout/stderr capture that treats exit code, not informational stderr, as success/failure.
- `Get-FileSha256` and `Get-FrontendFingerprint`: deterministic lowercase SHA-256 values; source fingerprint uses sorted normalized relative paths plus file hashes and excludes `node_modules`/`dist`.
- `Read/Write-RuntimeJson`: UTF-8 JSON metadata only under the resolved `Infra/.native-runtime` path.
- `Get-OwnedProcess`: query `Win32_Process` by PID and validate executable/command-line ownership against repository and expected entrypoint.
- `Stop-OwnedRuntime`: remove verification marker first, stop only validated backend/frontend PIDs, wait boundedly, and remove PID metadata while preserving logs/stamps.
- `Assert-PortAvailable`: reject listeners not represented by valid owned runtime metadata.
- `Ensure-MySqlReady`: require MySQL 8.0 and `MySQL80`; start and wait when stopped.
- `Invoke-SmartPreparation`: validate non-root/nonempty `.env` DB values without printing the password; use lock hashes for Composer/npm; run `config:clear`, migrate, idempotent seed; fingerprint and conditionally build frontend; stamp only successful operations.
- `Start-NativeRuntime`: launch direct PHP Artisan and Node Vite entrypoint processes hidden with separate stdout/stderr logs, save PID metadata, wait up to 60 seconds for backend `/up` and frontend `/`, write verification JSON, and open `http://localhost:<FrontendPort>` unless `-NoBrowser`.
- `Show-NativeStatus` and `Show-NativeLogs`: read-only bounded reporting.

Route actions so `restart` performs scoped stop then full preparation/start, `start` is idempotent for an already healthy owned pair, and status/logs never mutate processes.

- [ ] **Step 4: Run the test and verify GREEN**

Run the full test command from Step 2. Expected: exit code zero and the final PASS line confirms parser, fingerprints, lifecycle, ownership refusal, and cleanup.

- [ ] **Step 5: Document the one-command client workflow**

At the top of `docs/NATIVE_WINDOWS_SETUP.md`, add a concise daily section for the client path `C:\Users\Admin\Documents\GitHub\seongon-lms` with the default one-command restart, explicit action examples, log/state location, and the warning that `.env` must use the non-root `seongon` account before first run.

- [ ] **Step 6: Run fresh completion verification**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\Infra\tests\test-run-native-windows.ps1'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\Infra\run-native-windows.ps1' status -NoBrowser
```

Also parse `Infra/run-native-windows.ps1` and its test explicitly. Expected: test/parser exit zero; actual repository status is read-only and reports stopped or accurately reports currently owned services without starting or killing anything.

- [ ] **Step 7: Commit only task-owned files**

Stage only the runner, its test, documentation update, this plan, and the approved design spec. Do not stage database state, `.ua`, SPEC artifacts, or unrelated untracked files.

## Plan Self-Review

- Spec coverage: smart dependency invalidation, database migration/seed, conditional build, direct owned processes, localhost binding, readiness, browser open, actions, logs, and tests all map to Task 1.
- Placeholder scan: no `TBD`, `TODO`, deferred implementation, or unspecified test behavior remains.
- Interface consistency: action names, default ports, filenames, helper responsibilities, and test-only switches match the approved design.
