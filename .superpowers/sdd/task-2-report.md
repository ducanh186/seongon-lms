# Task 2 — Native Windows setup script report

## Scope completed

- Added `Infra/setup-native-windows.ps1` for Windows PowerShell 5.1.
- Kept `-PreflightOnly` read-only. It reports administrator state, Winget, PHP and modules, Composer, Node, npm, MySQL, ports 3306/8000/5173, and both lock files.
- Added non-preflight paths for exact PHP 8.3 / Node 22 Winget packages, PHP configuration and module validation, Composer SHA-384 verification, MySQL 8.0 installer gate, secure temporary MySQL initialization, Laravel `.env` configuration, and backend/frontend dependency commands.
- Recursive temporary-directory deletion is restricted to `Safe-RemoveDirectory`, which only accepts paths under `%TEMP%`.

## Design decisions

- Composer expected and actual SHA-384 values are reduced to lowercase hexadecimal before comparison; no password or hash-derived secret is printed.
- MySQL is accepted only when `mysql.exe --version` contains `8.0.x`; MariaDB and MySQL 8.4 cannot satisfy the gate.
- Root and generated application credentials exist only in a task-specific temporary directory with an ACL restricted to the current user, then are removed in `finally`.
- `-PreflightOnly` returns before any package install, configuration edit, credential prompt, database action, or Docker/WSL action.

## Verification evidence

| Check | Result |
|---|---|
| PowerShell AST parser for `Infra/setup-native-windows.ps1` | PASS |
| Task 1 setup required-pattern contract | PASS |
| Recursive deletion static safety check | PASS |
| `pwsh -NoProfile -ExecutionPolicy Bypass -File .\Infra\tests\verify-native-windows-scripts.ps1` | Expected RED at missing `Infra\run-native-windows.ps1` (Task 3), after setup file existence/parser stage |
| `pwsh -NoProfile -ExecutionPolicy Bypass -File .\Infra\setup-native-windows.ps1 -PreflightOnly` | PASS twice; reported PHP 8.3.26, Composer, Node 22.22.2, npm 11.12.1; did not install/configure anything |
| `git status --porcelain` immediately before/after second preflight | Identical: only Task 2 script was untracked; no `BE/.env`, dependency, database, Docker, or WSL mutation |
| `git diff --check` | PASS |

## Commit

`99d7f40` (`feat(infra): add native Windows setup script`; amended below to include this report hash).

## Concerns / follow-up

- This task intentionally did not execute the install/configuration branch, prompt for MySQL credentials, create a database, or run Laravel/npm commands.
- MySQL client was not found during preflight. A real setup run will stop at the documented official MySQL 8.0 installer gate until MySQL 8.0 is installed.
- The full static verifier remains RED until Task 3 adds `Infra/run-native-windows.ps1` and Task 4 adds `Infra/remove-docker-wsl-windows.ps1`.

## Reviewer-fix follow-up

- Added post-refresh executable gates for the actual `php.exe` (`PHP 8.3.x`) and `node.exe` (`v22.x`) selected from `PATH`; package presence alone is no longer sufficient.
- Split MySQL client and server checks. The client banner rejects MariaDB and non-8.0 versions; after the root credential is read, the script queries `SELECT VERSION()` over `--host=127.0.0.1 --port=3306 --protocol=tcp` and requires authenticated server 8.0 before importing SQL. The import is pinned to the same TCP endpoint.
- Added quoted MySQL option-file value serialization. It escapes backslashes and double quotes, preserves spaces/hashes/semicolons inside quotes, and rejects line breaks. No secret is logged or moved to a command line.
- Routed `-WhatIf` to the read-only preflight branch before any installer/configuration/database command. Port probing now uses .NET listeners rather than PowerShell module auto-import.
- Replaced permissive signature cleanup with exact 96-hex-character SHA-384 validation. `-ResumeAfterMySql` now explicitly announces its recheck semantics.
- Added `Infra/tests/verify-native-windows-setup-behavior.ps1`: it exercises PHP/Node rejection, MySQL/MariaDB rejection, password serialization, localhost TCP argument construction, malformed SHA rejection, exit-code propagation, and an isolated child-process `-WhatIf` run.

### Reviewer-fix verification

| Check | Result |
|---|---|
| Behavioral setup safety suite | PASS |
| PowerShell AST parser | PASS |
| `-PreflightOnly` | PASS and read-only |
| `-WhatIf` | PASS; printed `WhatIf mode: preflight only` and read-only preflight output |
| Full static suite | Expected RED only at missing Task 3 `Infra\\run-native-windows.ps1` |
| Git status before/after preflight and WhatIf | Identical: only Task 2 source/test changes |

## Re-review follow-up

- Preflight now reports the local MySQL **server binary** version without authentication: it resolves `mysqld.exe` first, then the `MySQL80` `Win32_Service` executable path, and invokes `--version`. Authenticated `SELECT VERSION()` remains the stronger setup-time server gate.
- The mutating branch is now behind one explicit `$PSCmdlet.ShouldProcess(...)` gate, so `-Confirm` is honored. `-WhatIf` remains an earlier preflight-only branch.
- The MySQL 8.0 parser now recognizes only an anchored MySQL client banner (`mysql Ver 8.0.x`) or a standalone server `8.0.x` token, and rejects MariaDB plus unrelated compatibility substrings.
- The behavioral `-WhatIf` child-process test now requires exit code 0, snapshots relevant repository files before/after, and places guarded Composer/npm shims on the child PATH. They create a sentinel if an install/CI mutation command is reached; the test requires no sentinel.

### Re-review verification

| Check | Result |
|---|---|
| Updated behavioral setup safety suite | PASS |
| PowerShell AST parser | PASS |
| Direct `-PreflightOnly` | PASS; reports `MySQL server binary: not found` on this host without prompting for a secret |
| Full static suite | Expected RED only at missing Task 3 `Infra\\run-native-windows.ps1` |
