# Smart Native Development Runner Design

## Goal

Provide one beginner-safe Windows PowerShell entrypoint that prepares the current Seongon LMS code, updates the database safely, validates a changed frontend build, restarts the localhost development services, and opens the frontend automatically.

## Approved Mode

- Mode: Development.
- Operating system: Windows 11 with Windows PowerShell 5.1 compatibility.
- Backend: Laravel on `127.0.0.1:8000`.
- Frontend: Vite development server on `127.0.0.1:5173`, opened as `http://localhost:5173`.
- Database: existing MySQL Community Server 8.0 service `MySQL80` on `127.0.0.1:3306`.
- The production frontend build is a validation step. Vite remains the runtime server so source edits keep hot reload.

## Public Interface

Create `Infra/run-native-windows.ps1` with this interface:

```powershell
# Full smart preparation, scoped restart, readiness checks, and browser open.
.\Infra\run-native-windows.ps1

# Explicit actions.
.\Infra\run-native-windows.ps1 start
.\Infra\run-native-windows.ps1 restart
.\Infra\run-native-windows.ps1 status
.\Infra\run-native-windows.ps1 logs
.\Infra\run-native-windows.ps1 stop

# Useful for automation or testing without opening the browser.
.\Infra\run-native-windows.ps1 restart -NoBrowser
```

The default action is `restart`. `start` and `restart` run smart preparation before launching services. `start` is idempotent when both repository-owned services are already healthy. `restart` performs a scoped stop and then a full start.

## Smart Preparation

The script stores only generated runtime metadata under `Infra/.native-runtime`. No password or other `.env` secret is written there.

### Dependency invalidation

- Run `composer install --no-interaction` when `BE/vendor/autoload.php` is absent or the SHA-256 hash of `BE/composer.lock` differs from the last successful Composer stamp.
- Run `composer check-platform-reqs` on every `start` or `restart`.
- Run `npm.cmd ci` when `FE/DEMO/node_modules` is absent or the SHA-256 hash of `FE/DEMO/package-lock.json` differs from the last successful npm stamp.
- Write a dependency stamp only after its command exits successfully.

### Database preparation

On every `start` or `restart`:

1. Require `BE/.env` and reject an effective MySQL configuration that uses an empty username, `root`, or an empty password.
2. Require MySQL Server 8.0 and service name `MySQL80`.
3. If `MySQL80` is stopped, attempt to start it and wait for the service to report `Running`; if Windows denies access, stop with an instruction to run PowerShell as Administrator once.
4. Run `php artisan config:clear`, not `php artisan optimize:clear`, because the configured cache store may itself require the database.
5. Run `php artisan migrate --force`.
6. Run the idempotent `php artisan app:seed-demo-once` command.

The runner never invokes `migrate:fresh`, never drops data, and never prints database credentials.

### Frontend change detection

Compute a deterministic SHA-256 fingerprint from relative paths and file hashes for:

- `FE/DEMO/src/**`;
- `FE/DEMO/index.html`;
- `FE/DEMO/package.json` and `package-lock.json`;
- existing `FE/DEMO/vite.config.*`, `tsconfig*.json`, and `.env` files.

Exclude `node_modules`, `dist`, runtime logs, and generated files. Run `npm.cmd run build` when `FE/DEMO/dist/index.html` is absent, the fingerprint differs from the last successful build stamp, or npm dependencies were refreshed. Write the build stamp only after a successful build.

## Runtime Process Control

Store these files under `Infra/.native-runtime`:

- `backend.pid.json` and `frontend.pid.json`;
- `backend.stdout.log` and `backend.stderr.log`;
- `frontend.stdout.log` and `frontend.stderr.log`;
- dependency/build stamp JSON files;
- `native-verified.json` after both health checks pass.

Launch the backend as a hidden direct PHP process using the resolved full path to `BE/artisan`:

```text
php <absolute-BE/artisan> serve --host=127.0.0.1 --port=8000
```

Launch the frontend as a hidden direct Node process using the resolved full path to Vite's JavaScript entrypoint under `FE/DEMO/node_modules`:

```text
node <absolute-vite-entrypoint> --host 127.0.0.1 --port 5173
```

Using direct PHP and Node processes ensures each recorded PID is the process that owns its server and that its command line contains the repository path.

## Ownership and Port Safety

- Before using a PID, query `Win32_Process` and require the command line to contain the resolved repository root and the expected absolute Artisan or Vite path.
- `stop` may terminate only processes that pass both ownership checks.
- Stale or mismatched PID metadata is removed without stopping the referenced process.
- Never use broad commands such as `Stop-Process -Name php`, `Stop-Process -Name node`, or `taskkill /IM`.
- Before launch, fail if port `8000` or `5173` is owned by an unrelated process.
- Bind only to `127.0.0.1`; do not create firewall rules or expose either service to the LAN.

## Readiness and Browser Flow

Poll for at most 60 seconds:

- Backend: `http://127.0.0.1:8000/up`.
- Frontend: `http://127.0.0.1:5173/`.

If either service exits or times out, stop only processes created by the current start attempt, preserve logs, remove incomplete PID metadata and the verification marker, and print the relevant stderr log paths.

After both endpoints respond successfully, write `native-verified.json` with the project root, UTC verification time, URLs, MySQL version, and process IDs. Unless `-NoBrowser` is present, open `http://localhost:5173` in the default browser.

## Remaining Actions

- `status`: validate recorded ownership, report process state, and probe both endpoints without starting or stopping anything.
- `logs`: print all runtime log paths and display a bounded tail of each existing log.
- `stop`: remove the verification marker first, stop only owned frontend/backend processes, and remove their PID metadata while preserving logs and build/dependency stamps.
- `restart`: run scoped `stop`, smart preparation, `start`, readiness checks, and browser opening.

## Error Handling

- Use terminating errors and return a nonzero exit code for failed prerequisites, dependency installation, migration, seed, build, launch, or readiness.
- Include the failing command description and relevant log path without echoing secrets.
- Composer/npm warnings do not fail the runner when their process exit code is zero.
- Do not run `composer update`, `npm audit fix`, or `npm audit fix --force`.
- PowerShell 5.1 native stderr is captured without converting informational stderr with exit code zero into a terminating exception.

## Verification Strategy

Create `Infra/tests/test-run-native-windows.ps1` and verify:

1. Both PowerShell files pass the Windows PowerShell parser.
2. A stopped `status` reports both services stopped without starting or killing anything.
3. A fixture with fake PHP and Node localhost servers can execute `start`, `status`, `restart`, and `stop` on test-only high ports with `-NoBrowser` and without MySQL mutation.
4. PID metadata contains the fixture repository path and correct process IDs.
5. `stop` refuses to terminate a live process whose command line does not match the fixture repository.
6. Dependency and frontend fingerprints are deterministic; stamps update only after successful commands.
7. The default action resolves to the full `restart` flow.
8. Source, lock-file, or `.env` changes invalidate the appropriate stamp, while unchanged inputs skip unnecessary install/build work.

The final verification includes a real parser run, the behavioral test, and a read-only `status` against the actual repository. A live start on the client remains the final acceptance check because its MySQL credentials and `.env` are intentionally unavailable to tests.

## Trade-offs

- Hashing frontend source adds a small startup cost but avoids a full build on every launch.
- Running migrations and the idempotent demo seed on every start is slightly slower but keeps a changed checkout ready without a separate manual step.
- Direct Node invocation is more coupled to the installed Vite package layout than `npm run dev`, but it provides reliable PID ownership and scoped shutdown on Windows.
- The script is for local development only; it is not a production process manager.

## Acceptance Criteria

- From the repository root, running `.\Infra\run-native-windows.ps1` prepares changed dependencies/code, safely updates and seeds the database, restarts both localhost services, waits for them, and opens the frontend.
- Re-running it with unchanged code skips unnecessary dependency installation and frontend production build.
- `status`, `logs`, and `stop` work after the launching terminal is closed.
- No unrelated PHP, Node, MySQL, or port-owning process is terminated.
- No password appears in runtime state, logs produced by the runner, or normal console output.
