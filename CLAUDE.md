# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product spec is normative

`docs/SEONGON_LMS_SPEC.md` is the single normative specification for SEONGON LMS (actors, functional requirements FR-*, route map, flow logic, acceptance checklist). Read it before changing behavior. Its source precedence rules:

1. Business requirements come from the original DOCX (actors, scope, FRs, use cases).
2. The old prototype is authoritative only for screen flow, interaction, and visible states — never for data, credentials, or persistence.
3. **The customer ERD has not been approved.** No final table, column, PK/FK, constraint, or endpoint may be invented ahead of it.
4. When sources conflict, keep the DOCX requirement and record the difference; do not silently invent behavior.

`docs/` is gitignored except that spec file. Root, `BE/`, and `Infra/` `README.md` are gitignored too — don't expect them or add them.

## Repository layout

| Path | What it is |
|---|---|
| `BE/` | Laravel 13 / PHP 8.3 JSON API (Sanctum). No Blade UI — API only. |
| `FE/DEMO/` | The production frontend: React 18 + Vite 8 + MUI 7 + Radix/shadcn, react-router 7, Vitest. Despite the name it is not a throwaway demo. |
| `Infra/` | Docker Compose stack, plus native-Windows PowerShell runners and their tests. |
| `docs/SEONGON_LMS_SPEC.md`, `docs/ERD_P1.png` | Spec and draft ERD image. |
| `.claude/worktrees/`, `.worktrees/` | Existing git worktrees for `codex/*` branches. Gitignored. |

## Commands

### Backend — run from `BE/`

```bash
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed                       # admin@seongon.vn + student@seongon.vn + demo catalog

composer dev                              # serve + queue:listen + pail + vite, concurrently
php artisan serve                         # API alone on :8000

composer test                             # config:clear then artisan test
php artisan test                          # Pest 4 / PHPUnit 12
php artisan test tests/Feature/Api/StudentLearningFlowTest.php   # single file
php artisan test --filter="quiz"                                 # single test by name
php artisan test --testsuite=Unit

./vendor/bin/pint                         # format (no pint.json — default Laravel preset)
./vendor/bin/pint --test                  # check only

php artisan app:seed-demo-once            # seeds only when users table is empty (used by container entrypoint)
php artisan app:replace-demo-catalog --force   # destructive: rebuilds catalog + learning data
```

`phpunit.xml` pins tests to sqlite `:memory:`, so the suite runs without MySQL regardless of your `.env`.

**Never run `migrate:fresh` for routine development or maintenance** (spec §9.3).

### Frontend — run from `FE/DEMO/`

```bash
npm install
npm run dev                               # Vite dev server
npm run build                             # vite build -> dist/

npm test                                  # vitest run (jsdom, maxWorkers: 1)
npx vitest run src/app/pages/CartPage.test.tsx    # single file
npx vitest run -t "adds course to cart"           # single test by name
npx vitest                                        # watch mode
```

There is **no `tsconfig.json` and no `typescript` dependency**. Vite/esbuild strips types without checking them, so `npm run build` will not catch type errors and there is no typecheck command to run. Tests are the only automated safety net — rely on them.

`VITE_API_BASE_URL` lives in `FE/DEMO/.env` (`http://127.0.0.1:8000/api/v1` for local dev). The Docker image bakes `/api/v1` at build time via a Dockerfile ARG.

### Infra — run from `Infra/` (PowerShell)

```powershell
Copy-Item .env.example .env               # then set APP_KEY, MYSQL_* — compose fails fast on missing vars
./run-docker.ps1 up|down|restart|logs|status|admin    # 'admin' enables the phpmyadmin profile

# Native Windows alternative to Docker
./setup-native-windows.ps1                # one-time: PHP/MySQL/Node preflight + install
./run-native-windows.ps1 start|stop|restart|status|logs
./start-local-web-windows.bat             # double-clickable launcher
```

`Infra/tests/` holds standalone PowerShell verification scripts plus two Pester specs (`*.Tests.ps1`); run them individually with `pwsh ./tests/<script>.ps1` or `Invoke-Pester`.

## Backend architecture

Request path: `routes/api.php` → `app/Http/Controllers/Api/{,Student,Admin}/` → `app/Services/` → Eloquent models, serialized through `app/Http/Resources/`.

Every route is under the `v1` prefix and falls into one of three tiers, mirroring the spec's actors:

- Public: register/login, categories, courses, course reviews, news.
- `auth:sanctum`: logout, me, profile, password.
- `role:student` / `role:admin`: everything else.

`role:` is the `EnsureRole` middleware alias registered in `bootstrap/app.php`. It 403s on a role mismatch **and** on `status === 'locked'`, so account locking is enforced there rather than per-controller. `withExceptions` forces JSON rendering for `api/*`.

Business logic lives in services, not controllers:

- `EnrollmentService`, `ProgressService` — enrollment creation and idempotent lesson completion.
- `QuizGradingService` — score, pass threshold, attempt persistence.
- `CertificateService` — issuance + dompdf rendering.
- `Services/Payment/` — `PaymentGateway` interface with `MockGateway`/`PaymentResult`. Payment is deliberately behind an interface because the real gateway is an open decision (spec §12). Add new gateways as implementations; don't inline payment logic into `OrderController`.
- `Support/InteractsWithEnrollment` — shared enrollment guards for student controllers.

## Frontend architecture

The layering below is a spec requirement (§9.2 and acceptance checklist §11.4), not a style preference:

```
pages/ + components/
   ├─→ data/repositories/applicationRepositories.ts   (public + student surface)
   ├─→ data/repositories/adminRepositories.ts         (admin surface)
   ├─→ application/services/DashboardService.ts       (injected with DashboardRepository)
   └─→ data/adapters/LocalStorageAdapter.ts           (the only browser-persistence path)
              ↓
        lib/api.ts  (fetch client, ApiError, bearer token)  →  lib/contracts.ts (Api* response types)
```

Hard rules:

- **Business UI must not import `lib/api.ts` directly** — go through a repository. The repositories are thin re-export maps precisely so the API boundary can be remapped in one place once the ERD lands.
- **Business UI must not touch `localStorage` directly** — use `LocalStorageAdapter`. Cart persistence is `cart/cartStorage.ts` layered on it, keyed per user (`seongon-cart:user:<id>`) with validation and courseId dedupe.
- `data/adapters/ApiAdapter.placeholder.ts` throws on every call by design. Do not put invented endpoint URLs in it.

### ERD_PENDING convention

`ERD_PENDING` is a deliberately greppable marker across `domain/entityRegistry.ts`, `admin/adminNavigation.ts`, and both repository files. `domain/entityRegistry.ts` is temporary metadata, **not** a schema — do not derive migrations from it.

Admin sections without an approved contract render `AdminEntityPage status="placeholder"`, which emits exactly:

```
Chức năng đang chờ đối chiếu ERD chính thức.
Dữ liệu hiện tại chỉ phục vụ prototype.
```

That copy is asserted in tests — don't reword it, and don't replace a placeholder with fabricated CRUD.

### UI shell and routing

- `src/app/routes.tsx` — browser routes (the old prototype's hash routes are history). `RequireAuth` guards authenticated routes; `RequireAuth role="student"` / `role="admin"` guard the role tiers. `/admin` sits outside the public `Layout`. Route guards are UX only — the backend `role:` middleware is the real authorization.
- Admin screens compose `AdminShell` → `AdminEntityPage` (title / filters / content / pagination + loading, error, empty, placeholder states) → `AdminDataTable`. `AsyncState.tsx` supplies the shared skeleton/empty/error primitives. New admin screens should reuse this shell rather than hand-rolling states.
- `admin/adminNavigation.ts` drives the sidebar and keys its items to `DomainEntityKey` from the entity registry — add sections in both places.
- `DesktopOnlyGate` blocks viewports under 1280px with a Vietnamese notice. Mobile is out of scope per spec §10; don't add responsive work without re-approval.

### Frontend stack quirks

- `FE/DEMO` originated as a Figma Make export (`"name": "@figma/my-make-file"`). `vite.config.ts` registers a `figmaAssetResolver` mapping `figma:asset/<file>` imports to `src/assets/`. `@/` aliases `src/`.
- MUI 7 and Tailwind v4 coexist: `components/ui/` is shadcn/Radix, application screens are predominantly MUI. Follow whichever the file you're editing already uses.
- UI copy is Vietnamese. Code, comments, and commit messages are English.

## Docker topology

`nginx` is the only service publishing a port (`HTTP_PORT`, default 80). It serves the built frontend from `dist/` and proxies `^/api` over FastCGI to `app:9000` (php-fpm). `mysql` and `app` are internal-only (`expose`). `phpmyadmin` is gated behind the `admin` compose profile and bound to `127.0.0.1`. The frontend is built inside `Infra/docker/nginx/Dockerfile`, so a frontend change requires rebuilding the nginx image, not the app image.

## Integrity invariants

Enforce server-side, not just in UI: no duplicate active enrollment, no duplicate cart entry, idempotent lesson completion, idempotent certificate issuance, one logical review per student/course. Destructive admin actions require confirmation and must preserve referential integrity — a course with enrollments is hidden, not hard-deleted.
