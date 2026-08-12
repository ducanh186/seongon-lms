# Curated Catalog, Watch Build, and Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unfinished demo course data, add a Windows frontend watch-build command, and redesign `/admin` around a full-width top navigation.

**Architecture:** Laravel seeders own deterministic curated demo identities and reconcile the supported local database without `migrate:fresh`. A narrow batch wrapper owns only dependency checks and Vite watch-build execution. React keeps Material UI and existing Admin data orchestration while `AdminShell`, `AdminSectionHeader`, and `AdminOverview` own the redesigned visual hierarchy.

**Tech Stack:** Laravel 12/PHP 8, Pest, React 19, TypeScript, Material UI, Vitest/Testing Library, Vite 8, Windows Batch/PowerShell tests, Playwright/browser-use.

## Global Constraints

- No visible seeded course title may contain Faker Latin words, `Completed Demo Course`, or a generated sequence suffix.
- Do not use `migrate:fresh`.
- Preserve enrollments, progress, quiz attempts, certificate flow, Admin APIs, filters, editors, confirmations, and role authorization.
- `Infra/watch-build-web-windows.bat` must not run Composer, migrations, seeders, or web servers.
- Remove the `248px` fixed Admin sidebar; do not add a second UI library.
- Admin remains desktop-only below `1280px` through the existing gate.
- Verify UI at `1280×800` and `1440×900`, zoom `100%`.
- Do not commit, stage, or push unless the user explicitly requests it.

---

### Task 1: Curated course blueprint and completed fixture

**Files:**
- Create: `BE/app/Support/CuratedDemoCatalog.php`
- Modify: `BE/database/seeders/GeneratedDemoCatalogSeeder.php`
- Modify: `BE/database/seeders/CompletedCourseDemoSeeder.php`
- Modify: `BE/tests/Feature/GeneratedDemoCatalogSeederTest.php`
- Modify: `BE/tests/Feature/CompletedCourseDemoSeederTest.php`

**Interfaces:**
- Produces: `CuratedDemoCatalog::courses(): array`, where each course has stable slug, title, track, description, lessons, level, price, instructor, and thumbnail sequence.
- Consumes: `DemoCourseThumbnail::forTrack(string $track, int $sequence): string` and existing Laravel models.

- [ ] **Step 1: Write failing catalog assertions**

Assert the seeded catalog has exactly 100 unique curated titles, representative approved titles in all three tracks, no three-word Faker Latin titles, no `Demo`, and no `\d{2}:` title template.

- [ ] **Step 2: Run RED catalog test**

Run: `php artisan test tests/Feature/GeneratedDemoCatalogSeederTest.php`

Expected: FAIL because `GeneratedDemoCatalogSeeder` still creates numbered repeated templates.

- [ ] **Step 3: Add `CuratedDemoCatalog`**

Define explicit topic/action/outcome title patterns that produce 100 human-authored Vietnamese Marketing titles without numeric suffixes. Store complete per-track title lists and return deterministic blueprints. Keep every visible title meaningful when read independently.

- [ ] **Step 4: Make the main seeder consume blueprints**

Replace `sprintf('%s %02d: %s', ...)` with curated blueprint fields. Pass blueprint lesson titles into `createCourseContent`; preserve 100 courses, prices, videos, reviews, enrollments, and deterministic thumbnails.

- [ ] **Step 5: Run GREEN catalog test twice**

Run twice: `php artisan test tests/Feature/GeneratedDemoCatalogSeederTest.php`

Expected: PASS both times, proving deterministic/idempotent behavior required by the test fixture.

- [ ] **Step 6: Write RED completed-fixture assertions**

Assert category, course, instructor, lessons, quiz, and descriptions expose no `Demo` placeholder and equal the approved SEO Foundation identity.

- [ ] **Step 7: Run RED completed test**

Run: `php artisan test tests/Feature/CompletedCourseDemoSeederTest.php`

Expected: FAIL on `Completed Demo Course` or related English demo copy.

- [ ] **Step 8: Update completed fixture in place**

Keep stable lookup slugs and relational keys, but update all learner-facing text to the approved SEO Foundation course identity. Preserve progress, passed attempt, certificate issue, and idempotency.

- [ ] **Step 9: Run GREEN completed test twice**

Run twice: `php artisan test tests/Feature/CompletedCourseDemoSeederTest.php`

Expected: PASS twice with unchanged aggregate counts.

---

### Task 2: Windows frontend watch-build command

**Files:**
- Create: `Infra/watch-build-web-windows.bat`
- Create: `Infra/tests/watch-build-web-windows.Tests.ps1`
- Modify: `Infra/README.md`

**Interfaces:**
- Produces: `Infra/watch-build-web-windows.bat [--verify]`.
- `--verify` prints resolved frontend directory and intended watch command, performs dependency/tool checks, and exits without entering the infinite watcher; normal mode runs `npm run build -- --watch`.

- [ ] **Step 1: Write failing PowerShell contract test**

Assert the batch file exists, resolves `%~dp0..\FE\DEMO`, checks `node`/`npm`, conditionally installs missing dependencies with `npm install --no-audit --no-fund`, invokes `npm run build -- --watch`, propagates `%ERRORLEVEL%`, and excludes Composer/migrate/seed/server commands.

- [ ] **Step 2: Run RED script test**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File Infra/tests/watch-build-web-windows.Tests.ps1`

Expected: FAIL because the batch file is missing.

- [ ] **Step 3: Implement the minimal batch wrapper**

Use `setlocal`, `%~dp0`, quoted paths, `where node`, `where npm`, conditional `node_modules`, `call npm ...`, and captured exit status. Implement `--verify` for bounded automated verification.

- [ ] **Step 4: Document exact usage**

Add commands for `watch-build-web-windows.bat`, explain that Laravel PHP changes need no build, and distinguish it from `start-local-web-windows.bat`.

- [ ] **Step 5: Run GREEN script test and verify mode**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Infra/tests/watch-build-web-windows.Tests.ps1
Infra\watch-build-web-windows.bat --verify
```

Expected: tests PASS and verify mode exits `0` without leaving a watcher process.

---

### Task 3: Admin top-navigation shell

**Files:**
- Modify: `FE/DEMO/src/app/components/AdminShell.tsx`
- Create: `FE/DEMO/src/app/components/AdminShell.test.tsx`
- Create: `FE/DEMO/src/app/components/AdminSectionHeader.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`

**Interfaces:**
- Preserves: `AdminShell({ active, onChange, children })` and `AdminSection` union.
- Adds: optional Admin identity sourced from existing `useAuth`, and `AdminSectionHeader({ title, description, action? })`.

- [ ] **Step 1: Write failing shell tests**

Assert no `aside` exists; Admin brand/header, identity, public-site link, six ordered navigation buttons, active `aria-pressed`, one-line navigation, full-width main frame, and no document-level overflow contract.

- [ ] **Step 2: Run RED shell tests**

Run: `npm test -- src/app/components/AdminShell.test.tsx --maxWorkers=1`

Expected: FAIL because the shell still renders a fixed sidebar.

- [ ] **Step 3: Implement top Admin header and navigation**

Replace the two-column grid with header → nav → main flow. Use existing Material UI and SEONGON tokens, a `72px` navy header, semantic nav buttons, teal active underline, visible focus, and centered `1440px` content frame.

- [ ] **Step 4: Add compact section headers**

Create `AdminSectionHeader` and replace the generic `ADMIN PORTAL / Vận hành SEONGON Academy` block with the approved section-specific heading and description. Move create actions into header actions where they exist without changing mutation logic.

- [ ] **Step 5: Run GREEN shell and AdminPage tests**

Run: `npm test -- src/app/components/AdminShell.test.tsx src/app/pages/AdminPage.test.tsx --maxWorkers=1`

Expected: PASS with all existing Admin operations intact.

---

### Task 4: Admin dashboard visual hierarchy

**Files:**
- Modify: `FE/DEMO/src/app/pages/AdminOverview.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminOverview.test.tsx`

**Interfaces:**
- Preserves: `AdminOverview({ stats }: { stats: ApiAdminStats })`.
- Produces: four-KPI strip, two-column analytics region, and ranked real-data popular courses table.

- [ ] **Step 1: Write failing visual-contract tests**

Assert KPI strip role/test id, non-generic surface treatment, horizontal month labels, completion context, ranked table, and bounded visually hidden chart text.

- [ ] **Step 2: Run RED overview test**

Run: `npm test -- src/app/pages/AdminOverview.test.tsx --maxWorkers=1`

Expected: FAIL on old generic-card/vertical-month layout.

- [ ] **Step 3: Implement dashboard hierarchy**

Use bordered KPI segments, readable chart labels, one teal scale, compact completion panel, and a clean ranked table. Preserve all API-derived values and accessible equivalents.

- [ ] **Step 4: Run GREEN overview tests**

Run: `npm test -- src/app/pages/AdminOverview.test.tsx src/app/pages/AdminPage.test.tsx --maxWorkers=1`

Expected: PASS.

---

### Task 5: Management toolbar and contained tables

**Files:**
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Modify: `FE/DEMO/src/app/components/AdminDataTable.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.test.tsx`

**Interfaces:**
- Preserves all existing API filter/mutation calls.
- Produces consistent `data-admin-toolbar` regions and labelled table-scroll wrappers.

- [ ] **Step 1: Write failing toolbar/table assertions**

Assert Students, Courses, Reviews, and News render consistent toolbars; create actions align right; Course/News editors remain closed initially; wrappers own overflow while shell/main prohibit page overflow.

- [ ] **Step 2: Run RED AdminPage tests**

Run: `npm test -- src/app/pages/AdminPage.test.tsx --maxWorkers=1`

Expected: FAIL on absent shared toolbar contract.

- [ ] **Step 3: Apply the consistent layout**

Normalize spacing, control heights, action placement, surface radius, and wrapper overflow with Material `Box/Stack`; do not rewrite data orchestration.

- [ ] **Step 4: Run GREEN Admin tests**

Run: `npm test -- src/app/components/AdminShell.test.tsx src/app/pages/AdminOverview.test.tsx src/app/pages/AdminPage.test.tsx --maxWorkers=1`

Expected: PASS.

---

### Task 6: Full verification, local reconciliation, and visual audit

**Files:**
- Modify: `SPEC/course_platform_ui_feedback_tracker_vi.md`
- Create outside repository: `D:\CODE\seongon-lms-feedback-v2-evidence\2026-08-12\admin-redesign\*.png`

**Interfaces:**
- Consumes all Task 1–5 deliverables.
- Produces fresh automated/runtime evidence and tracker entries.

- [ ] **Step 1: Run complete backend verification**

Run:

```powershell
cd BE
php artisan test
```

Expected: all tests PASS.

- [ ] **Step 2: Reconcile current supported local demo data**

Run the approved focused seeders without `migrate:fresh`, then query visible titles for Latin/demo/numeric-template violations. Run the completed seeder a second time to prove idempotency.

- [ ] **Step 3: Run complete frontend verification**

Run from `FE/DEMO`:

```powershell
npm test -- --maxWorkers=1
npm run build
```

Expected: all tests and production build PASS; only the existing chunk-size advisory may remain.

- [ ] **Step 4: Verify real watch rebuild**

Start `Infra/watch-build-web-windows.bat` in a hidden/background process with logs redirected outside the repository, wait for the first successful build, touch a harmless watched source file, confirm a second successful build, then stop only the exact verified watcher process.

- [ ] **Step 5: Browser-test current data and Admin flows**

Using browser-use/Playwright, verify Home, Catalog, My Courses, Admin Courses titles; then verify Overview, Students, Courses, News list/editor, and one empty/error state with real API responses.

- [ ] **Step 6: Capture and inspect visual evidence**

Capture Admin Overview/Students/Courses at `1280×800` and `1440×900`, plus News editor. Open every image and verify the SPEC checklist; reject and recapture any skeleton, clipped, repeated, or stale-state image.

- [ ] **Step 7: Update tracker and final integrity checks**

Record only evidence actually inspected. Run `git diff --check`, confirm no staged files, and report current uncommitted working-tree status without committing or pushing.
