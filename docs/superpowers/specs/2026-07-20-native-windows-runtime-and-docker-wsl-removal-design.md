# Native Windows Runtime and Docker/WSL Removal Design

**Date:** 2026-07-20

## Goal

Provide a beginner-safe Windows workflow that installs the Seongon LMS dependencies directly on Windows, runs the application only on `localhost`, verifies the native stack, and only then removes Docker Desktop, all Docker data, every WSL distribution, and the WSL 2 Windows features.

## Approved Scope

- Target: Windows 11 Pro x64.
- Access: local machine only; no LAN or Internet exposure.
- Backend: PHP 8.3 and Composer 2.
- Frontend: Node.js 22 and npm.
- Database: MySQL Community Server 8.0, matching the current `mysql:8.0` Docker contract.
- Docker removal: delete all containers, images, volumes, build cache, Docker Desktop data, and residual Docker files.
- WSL removal: unregister every WSL distribution, disable `Windows Subsystem for Linux`, and disable `Virtual Machine Platform`.
- BIOS virtualization remains enabled because it is firmware configuration shared by other software and does not materially consume disk space.
- The user confirmed there is no Docker or WSL data to preserve.

## Existing Project Contract

| Item | Current source contract | Native design |
|---|---|---|
| PHP | `BE/composer.json` requires `^8.3` | Install PHP 8.3 x64 |
| PHP extensions | Docker image enables `bcmath`, `dom`, `gd`, `intl`, `mbstring`, `opcache`, `pdo_mysql`, `zip` | Enable the same modules and verify with `php -m` |
| Node.js | Frontend Docker build uses Node 22 | Install `OpenJS.NodeJS.22` |
| Database | Compose uses `mysql:8.0` | Install MySQL Community Server 8.0 |
| Backend URL | Native frontend fallback targets `http://localhost:8000/api/v1` | Run Artisan on `127.0.0.1:8000` |
| Frontend URL | CORS default allows `http://localhost:5173` | Run Vite on `127.0.0.1:5173` and open via `localhost` |
| Demo data | `app:seed-demo-once` is idempotent | Run migrations, then `app:seed-demo-once` |

## Deliverables

### `Infra/setup-native-windows.ps1`

This script prepares and validates the native environment. It will:

1. Resolve the repository root from the script location instead of assuming a drive letter.
2. Require an elevated PowerShell session before machine-level installation.
3. Verify that Windows Package Manager (`winget`) is available.
4. Install PHP 8.3 using package ID `PHP.PHP.8.3`.
5. Install Node.js 22 using package ID `OpenJS.NodeJS.22`.
6. Refresh the current process `PATH` after installation.
7. Create or update the active `php.ini` and enable the required PHP modules.
8. Verify PHP version and required modules before continuing.
9. Install Composer programmatically from `getcomposer.org`, compare the installer against the current official SHA-384 signature, and stop on a mismatch.
10. Detect MySQL Server 8.0 and the `mysql` client. If missing, open the official MySQL Installer 8.0.46 download/installation flow and stop with exact configuration instructions rather than silently substituting MySQL 8.4 or MariaDB.
11. Ask for the MySQL root password through `Read-Host -AsSecureString`; it must never be printed or written to logs.
12. Generate a separate random password for the `seongon` application user.
13. Create the `seongon_lms` database and least-privilege application user restricted to `localhost`.
14. Create `BE/.env` from `BE/.env.example` when absent, then set local application, MySQL, session, queue, cache, and frontend-origin values without exposing secrets in console output.
15. Run `composer install` in `BE` and `npm ci` in `FE/DEMO`.
16. Run `php artisan key:generate`, `php artisan migrate --force`, and `php artisan app:seed-demo-once`.
17. Run focused readiness checks and print the next command without automatically deleting Docker.

MySQL installation remains a guided installer step because the official MySQL Installer is the supported 8.0 path on Windows and requires the user to establish the initial root credential. The setup script resumes safely after the installer completes.

### `Infra/run-native-windows.ps1`

This script is the operator entrypoint for native mode. It will support:

- `start`: start Laravel and Vite in separate hidden PowerShell processes, record their process IDs under `Infra/.native-runtime`, and wait for readiness.
- `status`: report process state and probe backend/frontend endpoints.
- `logs`: show the paths of native runtime logs and tail them.
- `stop`: stop only processes whose recorded IDs and command lines match this repository.
- `restart`: perform a scoped stop followed by start.

Bindings remain local:

- Laravel: `127.0.0.1:8000`.
- Vite: `127.0.0.1:5173`.

The script must not kill unrelated `php`, `node`, or `mysql` processes. Stale PID files are detected and removed only after command-line ownership checks.

### `Infra/remove-docker-wsl-windows.ps1`

This script is intentionally separate from native setup. It will:

1. Require Administrator privileges.
2. Default to preview mode and display every destructive category.
3. Require both `-DestroyAllData` and the exact typed confirmation `DELETE DOCKER AND WSL DATA` before mutation.
4. Stop Docker Desktop and its Windows service when present.
5. Remove all Docker containers, images, volumes, networks, and build cache when the Docker engine is reachable.
6. Enumerate WSL distributions and unregister each exact returned distribution name, including Docker-managed distributions.
7. Uninstall Docker Desktop through Winget when registered, with a fallback to the registered Windows uninstaller.
8. Delete only explicit, resolved Docker residual directories under `ProgramData`, `Program Files`, `LocalAppData`, `AppData`, and the current user's `.docker` directory.
9. Verify each deletion target is equal to or below its expected parent before recursive removal.
10. Disable the `Microsoft-Windows-Subsystem-Linux` and `VirtualMachinePlatform` optional features.
11. Leave BIOS virtualization unchanged.
12. Report remaining Docker commands, WSL distributions, optional-feature states, and whether a restart is required.

The script must not use broad globs, delete a profile directory, or delete any path derived from an empty/unresolved environment variable.

## Data and Runtime Flow

```text
Browser http://localhost:5173
        |
        v
Vite frontend process
        |
        | HTTP /api/v1
        v
Laravel http://127.0.0.1:8000
        |
        | PDO MySQL on 127.0.0.1:3306
        v
MySQL80 Windows service -> seongon_lms database
```

The setup flow is intentionally ordered:

```text
Install dependencies
        -> configure PHP and MySQL
        -> install project packages
        -> migrate and seed
        -> start native services
        -> pass readiness checks
        -> user explicitly runs destructive removal
```

## Error Handling

- Every script uses terminating errors and returns a nonzero exit code on failure.
- Dependency installation is idempotent: already-compatible versions are reused.
- A missing or incorrect PHP module blocks Composer and migrations with a precise module list.
- MySQL 8.4/MariaDB is not silently accepted as MySQL 8.0.
- Existing `BE/.env` is backed up before script-owned edits.
- Database creation is idempotent; existing application data is not dropped.
- Native start fails if ports `8000` or `5173` belong to unrelated processes.
- Docker/WSL removal does not begin unless native verification has passed in the current repository and the explicit destructive confirmation is supplied.
- Failure to remove one residual path is reported and does not widen the deletion scope.

## Verification Strategy

### Static script tests

A PowerShell verification script will parse the scripts and assert:

- required package IDs and versions are present;
- local-only bind addresses are used;
- all required PHP modules are validated;
- secret values are never printed;
- destructive execution requires two independent confirmations;
- WSL feature names are exact;
- no recursive deletion targets unresolved variables, the user profile root, a drive root, or the repository root;
- no Docker volume deletion occurs in the setup or native-run scripts.

### Non-destructive runtime checks

- PowerShell parser validation for every new script.
- Preview execution of Docker/WSL removal without destructive flags.
- Setup preflight mode that reports dependencies without installing them.
- Native runner status against stopped services.

### Full acceptance on the target machine

1. `php --version` reports PHP 8.3.
2. `php -m` contains all required modules.
3. `composer --version` and `node --version` succeed; Node reports major version 22.
4. `mysql --version` reports MySQL 8.0.
5. Laravel migrations and `app:seed-demo-once` exit successfully.
6. Backend health/API responds from `127.0.0.1:8000`.
7. Frontend responds from `localhost:5173` and can call `/api/v1` through its configured base URL.
8. Only after those checks, the destructive script removes Docker and WSL.
9. After restart, Docker Desktop is absent, `wsl --status` reports WSL unavailable, and the native LMS still starts successfully.

## Trade-offs

- Native mode uses less disk and memory but introduces machine-level dependency and service management.
- MySQL's interactive first configuration prevents a truly unattended one-click setup, but avoids embedding or logging a root password.
- Removing WSL also affects non-Docker Linux tooling. This is accepted explicitly for this machine.
- The PHP built-in server and Vite dev server are appropriate for the approved localhost-only use case; they are not a production Internet deployment architecture.

## Out of Scope

- LAN or public Internet exposure.
- Native Nginx/IIS configuration.
- Automatic firewall rules.
- Migration of Docker volumes or WSL distributions.
- Replacing MySQL with MariaDB or SQLite.
- Disabling CPU virtualization in BIOS/UEFI.
- Refactoring application code unrelated to native operation.
