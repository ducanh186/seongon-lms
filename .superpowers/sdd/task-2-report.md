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

Pending final commit hash.

## Concerns / follow-up

- This task intentionally did not execute the install/configuration branch, prompt for MySQL credentials, create a database, or run Laravel/npm commands.
- MySQL client was not found during preflight. A real setup run will stop at the documented official MySQL 8.0 installer gate until MySQL 8.0 is installed.
- The full static verifier remains RED until Task 3 adds `Infra/run-native-windows.ps1` and Task 4 adds `Infra/remove-docker-wsl-windows.ps1`.
