# Production Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a production Docker Compose stack where one Nginx serves the Vite SPA and proxies Laravel API traffic to PHP-FPM, backed by MySQL 8 with automatic migrations, seed-once behavior, and optional phpMyAdmin.

**Architecture:** Nginx is the only public service. It contains the compiled `FE/DEMO` assets and sends `/api/*` to a separate Laravel PHP-FPM container; Laravel connects to an internal MySQL 8 service. A tested Artisan command seeds demo data only when `users` is empty, and phpMyAdmin is isolated behind an opt-in Compose profile.

**Tech Stack:** Docker Compose, Nginx Alpine, PHP 8.3 FPM Alpine, Laravel 13, Composer 2, Node 22 Alpine, Vite 8, MySQL 8.0, PHPUnit/Pest-compatible Laravel feature tests, PowerShell verification.

## Global Constraints

- Work from the approved design at `docs/superpowers/specs/2026-07-12-production-docker-design.md`.
- Do not alter public Laravel API contracts or Frontend application behavior.
- Do not commit real secrets or any generated `Infra/.env` file.
- Only Nginx may publish a public port; MySQL and PHP-FPM stay internal.
- phpMyAdmin must require the `admin` profile and bind only to `127.0.0.1`.
- Use `VITE_API_BASE_URL=/api/v1` in the production Frontend build.
- Use automatic `php artisan migrate --force` and fail startup on migration errors.
- Seed only when the `users` table is empty; never run the existing factory seeder unconditionally on restart.
- Use valid PowerShell for host commands and POSIX `sh` only inside Linux container scripts.
- Preserve all unrelated workspace changes.

---

## File Map

| File | Responsibility |
|---|---|
| `BE/app/Console/Commands/SeedDemoOnce.php` | Seed an empty database and skip a database that already contains users |
| `BE/tests/Feature/Console/SeedDemoOnceCommandTest.php` | Behavioral proof for both seed branches |
| `Infra/tests/verify-production-compose.ps1` | Static assertions over the resolved Compose model |
| `Infra/docker-compose.yml` | Production service topology, health checks, networks, profiles, and volumes |
| `Infra/.env.example` | Safe environment template |
| `Infra/docker/php/Dockerfile` | Optimized Laravel PHP-FPM image |
| `Infra/docker/php/entrypoint.sh` | Migration, seed-once, optimize, and process handoff |
| `Infra/docker/php/opcache.ini` | Production OPcache settings |
| `Infra/docker/nginx/Dockerfile` | Frontend build and Nginx runtime image |
| `Infra/docker/nginx/default.conf` | Same-origin API proxy, SPA fallback, caching, and health endpoint |
| `.dockerignore` | Minimal and secret-safe Docker build context |
| `.gitignore` | Ignore runtime `Infra/.env` |
| `Infra/README.md` | Production operation and verification guide |

---

### Task 1: Add seed-once behavior with TDD

**Files:**
- Create: `BE/tests/Feature/Console/SeedDemoOnceCommandTest.php`
- Create: `BE/app/Console/Commands/SeedDemoOnce.php`

**Interfaces:**
- Consumes: existing `Database\Seeders\DatabaseSeeder` and `App\Models\User`.
- Produces: Artisan command `app:seed-demo-once` returning exit code `0` after either seeding an empty database or skipping a non-empty database.

- [ ] **Step 1: Write the failing feature tests**

```php
<?php

namespace Tests\Feature\Console;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeedDemoOnceCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_demo_data_when_users_table_is_empty(): void
    {
        $this->artisan('app:seed-demo-once')
            ->expectsOutput('Demo data seeded.')
            ->assertSuccessful();

        $this->assertDatabaseHas('users', ['email' => 'admin@seongon.vn']);
        $this->assertDatabaseHas('users', ['email' => 'student@seongon.vn']);
    }

    public function test_it_skips_demo_seed_when_a_user_already_exists(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $this->artisan('app:seed-demo-once')
            ->expectsOutput('Users already exist; demo seed skipped.')
            ->assertSuccessful();

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseMissing('users', ['email' => 'admin@seongon.vn']);
    }
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from PowerShell:

```powershell
$RepoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $RepoRoot 'BE')
php artisan test tests/Feature/Console/SeedDemoOnceCommandTest.php
```

Expected: FAIL because `app:seed-demo-once` is not defined.

- [ ] **Step 3: Implement the minimal Artisan command**

```php
<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class SeedDemoOnce extends Command
{
    protected $signature = 'app:seed-demo-once';

    protected $description = 'Seed demo data only when the users table is empty';

    public function handle(): int
    {
        if (User::query()->exists()) {
            $this->info('Users already exist; demo seed skipped.');

            return self::SUCCESS;
        }

        $exitCode = Artisan::call('db:seed', ['--force' => true]);

        if ($exitCode !== self::SUCCESS) {
            $this->error('Demo data seed failed.');

            return $exitCode;
        }

        $this->info('Demo data seeded.');

        return self::SUCCESS;
    }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

```powershell
$RepoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $RepoRoot 'BE')
php artisan test tests/Feature/Console/SeedDemoOnceCommandTest.php
```

Expected: 2 tests pass with 0 failures.

- [ ] **Step 5: Run the complete Backend suite**

```powershell
$RepoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $RepoRoot 'BE')
php artisan test
```

Expected: all Backend tests pass with 0 failures.

- [ ] **Step 6: Commit the tested behavior**

```powershell
$RepoRoot = git rev-parse --show-toplevel
Set-Location $RepoRoot
git add -- 'BE/app/Console/Commands/SeedDemoOnce.php' 'BE/tests/Feature/Console/SeedDemoOnceCommandTest.php'
git commit -m 'feat: seed demo data only on empty database'
```

---

### Task 2: Define a testable production Compose contract

**Files:**
- Create: `Infra/tests/verify-production-compose.ps1`
- Modify: `Infra/docker-compose.yml`
- Create: `Infra/.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: environment values from `Infra/.env` or `--env-file Infra/.env`.
- Produces: services `nginx`, `app`, `mysql`, and profiled `phpmyadmin`; volumes `mysql_data` and `app_storage`.

- [ ] **Step 1: Write the failing Compose contract verification**

```powershell
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$composeFile = Join-Path $repoRoot 'Infra\docker-compose.yml'
$envFile = Join-Path $repoRoot 'Infra\.env'

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing $envFile. Copy Infra/.env.example before verification."
}

$json = docker compose --env-file $envFile -f $composeFile config --format json
if ($LASTEXITCODE -ne 0) {
    throw 'docker compose config failed.'
}

$config = $json | ConvertFrom-Json
$serviceNames = @($config.services.PSObject.Properties.Name)

foreach ($required in @('nginx', 'app', 'mysql', 'phpmyadmin')) {
    if ($required -notin $serviceNames) {
        throw "Missing required service: $required"
    }
}

if (@($config.services.app.ports).Count -ne 0) {
    throw 'app must not publish host ports.'
}

if (@($config.services.mysql.ports).Count -ne 0) {
    throw 'mysql must not publish host ports.'
}

if ('admin' -notin @($config.services.phpmyadmin.profiles)) {
    throw 'phpmyadmin must use the admin profile.'
}

$pmaHostIp = $config.services.phpmyadmin.ports[0].host_ip
if ($pmaHostIp -ne '127.0.0.1') {
    throw 'phpmyadmin must bind to 127.0.0.1.'
}

$volumeNames = @($config.volumes.PSObject.Properties.Name)
foreach ($required in @('mysql_data', 'app_storage')) {
    if ($required -notin $volumeNames) {
        throw "Missing required volume: $required"
    }
}

Write-Output 'Production Compose contract verified.'
```

- [ ] **Step 2: Create a temporary local environment file**

Create `Infra/.env.example` with:

```dotenv
APP_KEY=base64:REPLACE_WITH_A_REAL_LARAVEL_APP_KEY
APP_URL=http://localhost
HTTP_PORT=80
MYSQL_DATABASE=seongon_lms
MYSQL_USER=seongon
MYSQL_PASSWORD=change_me
MYSQL_ROOT_PASSWORD=change_root_me
PHPMYADMIN_PORT=8081
```

Then run:

```powershell
$RepoRoot = git rev-parse --show-toplevel
Copy-Item -LiteralPath (Join-Path $RepoRoot 'Infra\.env.example') -Destination (Join-Path $RepoRoot 'Infra\.env')
```

- [ ] **Step 3: Run the contract test and verify RED**

```powershell
$RepoRoot = git rev-parse --show-toplevel
& (Join-Path $RepoRoot 'Infra\tests\verify-production-compose.ps1')
```

Expected: FAIL because the current Compose file does not define `nginx` and `app`.

- [ ] **Step 4: Replace Compose with the minimal production topology**

```yaml
name: seongon-lms

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${MYSQL_DATABASE:?Set MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER:?Set MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:?Set MYSQL_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?Set MYSQL_ROOT_PASSWORD}
    expose:
      - "3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h localhost -u root -p\"$$MYSQL_ROOT_PASSWORD\""]
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 20s

  app:
    build:
      context: ..
      dockerfile: Infra/docker/php/Dockerfile
    restart: unless-stopped
    environment:
      APP_NAME: SEONGON LMS
      APP_ENV: production
      APP_KEY: ${APP_KEY:?Set APP_KEY}
      APP_DEBUG: "false"
      APP_URL: ${APP_URL:?Set APP_URL}
      LOG_CHANNEL: stderr
      LOG_LEVEL: info
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: "3306"
      DB_DATABASE: ${MYSQL_DATABASE:?Set MYSQL_DATABASE}
      DB_USERNAME: ${MYSQL_USER:?Set MYSQL_USER}
      DB_PASSWORD: ${MYSQL_PASSWORD:?Set MYSQL_PASSWORD}
      SESSION_DRIVER: database
      CACHE_STORE: database
      QUEUE_CONNECTION: database
      FILESYSTEM_DISK: local
    expose:
      - "9000"
    volumes:
      - app_storage:/var/www/html/storage
    depends_on:
      mysql:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "php-fpm -t && kill -0 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  nginx:
    build:
      context: ..
      dockerfile: Infra/docker/nginx/Dockerfile
      args:
        VITE_API_BASE_URL: /api/v1
    restart: unless-stopped
    ports:
      - "${HTTP_PORT:-80}:80"
    depends_on:
      app:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O - http://127.0.0.1/healthz | grep -q '^ok$'"]
      interval: 10s
      timeout: 5s
      retries: 5

  phpmyadmin:
    image: phpmyadmin:5
    profiles: ["admin"]
    restart: unless-stopped
    environment:
      PMA_HOST: mysql
      PMA_PORT: "3306"
    ports:
      - "127.0.0.1:${PHPMYADMIN_PORT:-8081}:80"
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql_data:
  app_storage:
```

Add this exact line to `.gitignore`:

```gitignore
/Infra/.env
```

- [ ] **Step 5: Verify the resolved Compose model**

```powershell
$RepoRoot = git rev-parse --show-toplevel
& (Join-Path $RepoRoot 'Infra\tests\verify-production-compose.ps1')
docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') config --quiet
```

Expected: `Production Compose contract verified.` and both commands exit `0`. Image builds may still fail until Task 3 and Task 4 create their Dockerfiles.

---

### Task 3: Build the optimized Laravel PHP-FPM runtime

**Files:**
- Create: `Infra/docker/php/Dockerfile`
- Create: `Infra/docker/php/entrypoint.sh`
- Create: `Infra/docker/php/opcache.ini`

**Interfaces:**
- Consumes: `BE/composer.lock`, Laravel source, MySQL environment values, and Artisan command `app:seed-demo-once`.
- Produces: `app` image listening on internal port `9000`; startup fails fast before PHP-FPM if migration, seed, or optimize fails.

- [ ] **Step 1: Verify the app image target is RED**

```powershell
$RepoRoot = git rev-parse --show-toplevel
docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') build app
```

Expected: FAIL because `Infra/docker/php/Dockerfile` does not exist.

- [ ] **Step 2: Add the PHP-FPM Dockerfile**

```dockerfile
FROM composer:2.8 AS composer-bin

FROM php:8.3-fpm-alpine AS runtime

RUN apk add --no-cache \
        fcgi \
        freetype \
        icu-libs \
        libjpeg-turbo \
        libpng \
        libxml2 \
        libzip \
        oniguruma \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        freetype-dev \
        icu-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        libxml2-dev \
        libzip-dev \
        oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        dom \
        gd \
        intl \
        mbstring \
        opcache \
        pdo_mysql \
        zip \
    && apk del .build-deps

WORKDIR /var/www/html

COPY --from=composer-bin /usr/bin/composer /usr/bin/composer
COPY BE/composer.json BE/composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --classmap-authoritative

COPY BE/ ./
COPY Infra/docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY Infra/docker/php/entrypoint.sh /usr/local/bin/app-entrypoint

RUN composer dump-autoload --no-dev --classmap-authoritative --no-scripts \
    && php artisan package:discover --ansi \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x /usr/local/bin/app-entrypoint

USER www-data

EXPOSE 9000

ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm", "-F"]
```

- [ ] **Step 3: Add the fail-fast entrypoint**

```sh
#!/bin/sh
set -eu

php artisan migrate --force
php artisan app:seed-demo-once
php artisan optimize

exec "$@"
```

- [ ] **Step 4: Add OPcache production settings**

```ini
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=192
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.save_comments=1
realpath_cache_size=4096K
realpath_cache_ttl=600
```

- [ ] **Step 5: Build and inspect the app image**

```powershell
$RepoRoot = git rev-parse --show-toplevel
docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') build app
docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') run --rm --no-deps --entrypoint php app -m
```

Expected: build exits `0`; module output includes `bcmath`, `dom`, `gd`, `intl`, `mbstring`, `PDO`, `pdo_mysql`, `Zend OPcache`, and `zip`.

---

### Task 4: Build the Vite/Nginx edge image

**Files:**
- Create: `Infra/docker/nginx/Dockerfile`
- Create: `Infra/docker/nginx/default.conf`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: `FE/DEMO/package-lock.json`, Frontend source, and internal FastCGI endpoint `app:9000`.
- Produces: immutable Frontend assets, `/healthz`, SPA fallback, and same-origin `/api/*` routing.

- [ ] **Step 1: Verify the Nginx image target is RED**

```powershell
$RepoRoot = git rev-parse --show-toplevel
docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') build nginx
```

Expected: FAIL because `Infra/docker/nginx/Dockerfile` does not exist.

- [ ] **Step 2: Add the multi-stage Frontend/Nginx Dockerfile**

```dockerfile
FROM node:22-alpine AS frontend-build

WORKDIR /frontend

COPY FE/DEMO/package.json FE/DEMO/package-lock.json ./
RUN npm ci

COPY FE/DEMO/ ./

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:1.28-alpine AS runtime

COPY Infra/docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /frontend/dist/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD wget -q -O - http://127.0.0.1/healthz | grep -q '^ok$' || exit 1
```

- [ ] **Step 3: Add the Nginx routing contract**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;
    client_max_body_size 20m;

    location = /healthz {
        default_type text/plain;
        return 200 "ok\n";
    }

    location ~ ^/api(?:/|$) {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/html/public/index.php;
        fastcgi_param SCRIPT_NAME /index.php;
        fastcgi_param HTTP_PROXY "";
        fastcgi_pass app:9000;
        fastcgi_read_timeout 60s;
    }

    location ~* \.(?:css|js|mjs|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 4: Add a minimal Docker build context**

```dockerignore
.git
.github
.worktrees
data
docs
SPEC
**/.env
**/.env.*
!**/.env.example
BE/vendor
BE/node_modules
BE/storage/logs/*
BE/storage/framework/cache/*
BE/storage/framework/sessions/*
BE/storage/framework/views/*
FE/DEMO/node_modules
FE/DEMO/dist
FE/DEMO/coverage
FE/DEMO/npm-install.log
node_modules
vendor
```

- [ ] **Step 5: Build and validate Nginx**

```powershell
$RepoRoot = git rev-parse --show-toplevel
docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') build nginx
docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') run --rm --no-deps nginx nginx -t
```

Expected: image build and `nginx -t` exit `0`.

- [ ] **Step 6: Re-run the Frontend suite outside Docker**

```powershell
$RepoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $RepoRoot 'FE\DEMO')
npm.cmd test -- --reporter=dot
npm.cmd run build
```

Expected: all Vitest tests pass and Vite production build exits `0`.

---

### Task 5: Document and verify the complete production stack

**Files:**
- Create: `Infra/README.md`
- Verify: all files from Tasks 1-4

**Interfaces:**
- Consumes: completed Compose stack and local `Infra/.env`.
- Produces: operator-ready startup, optional admin profile, logs, restart, and teardown commands with fresh end-to-end evidence.

- [ ] **Step 1: Write the production operations guide**

The guide must contain these exact PowerShell-safe workflows:

```powershell
# Prepare configuration once
Copy-Item -LiteralPath 'Infra\.env.example' -Destination 'Infra\.env'
php 'BE\artisan' key:generate --show

# Validate and build
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' config --quiet
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' build

# Start the production stack
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' up -d

# Optional database UI
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' --profile admin up -d phpmyadmin

# Inspect health and logs
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' ps
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' logs app nginx mysql

# Stop containers without deleting database data
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' down
```

The guide must explicitly warn that `down -v` deletes MySQL and Laravel storage volumes and that `Infra/.env` must contain a real generated `APP_KEY` plus changed database passwords before deployment.

- [ ] **Step 2: Create a valid local-only APP_KEY for integration verification**

```powershell
$RepoRoot = git rev-parse --show-toplevel
Push-Location (Join-Path $RepoRoot 'BE')
try {
    $appKey = php artisan key:generate --show
} finally {
    Pop-Location
}
$envPath = Join-Path $RepoRoot 'Infra\.env'
$content = Get-Content -LiteralPath $envPath -Raw
$content = $content -replace '(?m)^APP_KEY=.*$', "APP_KEY=$appKey"
Set-Content -LiteralPath $envPath -Value $content -Encoding UTF8
```

Expected: only ignored `Infra/.env` receives the generated key.

- [ ] **Step 3: Run all static and application verification**

```powershell
$RepoRoot = git rev-parse --show-toplevel
& (Join-Path $RepoRoot 'Infra\tests\verify-production-compose.ps1')

Set-Location (Join-Path $RepoRoot 'BE')
php artisan test

Set-Location (Join-Path $RepoRoot 'FE\DEMO')
npm.cmd test -- --reporter=dot
npm.cmd run build

docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') build
```

Expected: Compose contract, Backend tests, Frontend tests, Frontend build, and both Docker image builds pass with 0 failures.

- [ ] **Step 4: Start from fresh named volumes and verify data bootstrap**

This task is authorized to delete only volumes created by this new Compose project during this verification run. Confirm the resolved project name is `seongon-lms` before running the volume deletion command.

```powershell
$RepoRoot = git rev-parse --show-toplevel
$compose = @('--env-file', (Join-Path $RepoRoot 'Infra\.env'), '-f', (Join-Path $RepoRoot 'Infra\docker-compose.yml'))

docker compose @compose config --format json | ConvertFrom-Json | Select-Object -ExpandProperty name
docker compose @compose down --volumes --remove-orphans
docker compose @compose up -d
docker compose @compose ps
```

Expected: resolved name is `seongon-lms`; `mysql`, `app`, and `nginx` become healthy.

- [ ] **Step 5: Verify HTTP, API, SPA fallback, and seed stability**

```powershell
$baseUrl = 'http://127.0.0.1'

$health = Invoke-WebRequest -Uri "$baseUrl/healthz" -UseBasicParsing
if ($health.StatusCode -ne 200 -or $health.Content.Trim() -ne 'ok') { throw 'Nginx health check failed.' }

$home = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing
if ($home.StatusCode -ne 200 -or $home.Content -notmatch '<div id="root">') { throw 'SPA home failed.' }

$deepLink = Invoke-WebRequest -Uri "$baseUrl/courses" -UseBasicParsing
if ($deepLink.StatusCode -ne 200 -or $deepLink.Content -notmatch '<div id="root">') { throw 'SPA fallback failed.' }

$api = Invoke-WebRequest -Uri "$baseUrl/api/v1/courses" -UseBasicParsing
if ($api.StatusCode -ne 200) { throw 'Laravel API proxy failed.' }

$before = docker compose @compose exec -T app php artisan tinker --execute="echo App\\Models\\User::count();"
docker compose @compose restart app
docker compose @compose up -d --wait app nginx
$after = docker compose @compose exec -T app php artisan tinker --execute="echo App\\Models\\User::count();"

if ($before.Trim() -ne $after.Trim()) { throw "Seed count changed after restart: $before -> $after" }
```

Expected: health, home, deep-link, and API return `200`; user count is unchanged after app restart.

- [ ] **Step 6: Verify exposure and optional phpMyAdmin behavior**

```powershell
$config = docker compose @compose config --format json | ConvertFrom-Json
if (@($config.services.app.ports).Count -ne 0) { throw 'app exposes a host port.' }
if (@($config.services.mysql.ports).Count -ne 0) { throw 'mysql exposes a host port.' }

$defaultServices = docker compose @compose ps --services
if ('phpmyadmin' -in $defaultServices) { throw 'phpMyAdmin unexpectedly enabled by default.' }

$profileServices = docker compose @compose --profile admin config --services
if ('phpmyadmin' -notin $profileServices) { throw 'phpMyAdmin missing from admin profile.' }
```

Expected: only Nginx is public by default and phpMyAdmin appears only with `--profile admin`.

- [ ] **Step 7: Review the final diff and scan for secrets**

```powershell
$RepoRoot = git rev-parse --show-toplevel
Set-Location $RepoRoot
git diff --check
git status --short
git diff -- . ':(exclude)data/state_store.db/**'
git grep -n -I -E 'change_me|change_root_me|REPLACE_WITH_A_REAL_LARAVEL_APP_KEY' -- ':!Infra/.env.example' ':!docs/superpowers/**'
```

Expected: no whitespace errors, no unexpected files, and no placeholder or real secret outside the safe example/spec/plan context.

- [ ] **Step 8: Commit the production Docker stack**

```powershell
git add -- '.dockerignore' '.gitignore' 'Infra' 'BE/app/Console/Commands/SeedDemoOnce.php' 'BE/tests/Feature/Console/SeedDemoOnceCommandTest.php'
git commit -m 'build: add production Docker stack'
```

- [ ] **Step 9: Run final fresh verification after commit**

```powershell
$RepoRoot = git rev-parse --show-toplevel
& (Join-Path $RepoRoot 'Infra\tests\verify-production-compose.ps1')

Set-Location (Join-Path $RepoRoot 'BE')
php artisan test

Set-Location (Join-Path $RepoRoot 'FE\DEMO')
npm.cmd test -- --reporter=dot
npm.cmd run build

docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') build
docker compose --env-file (Join-Path $RepoRoot 'Infra\.env') -f (Join-Path $RepoRoot 'Infra\docker-compose.yml') up -d --wait
```

Expected: every command exits `0`, all tests pass, images build, and the default production services become healthy.
