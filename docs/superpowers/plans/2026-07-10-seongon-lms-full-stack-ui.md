# SEONGON LMS Full-stack UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Figma DEMO mock-data experience with a responsive SPA that exercises every guest, student, and admin API in the current Laravel backend.

**Architecture:** Keep Laravel as the authoritative REST API under `/api/v1` and keep the React/Vite app as a separate client. The frontend has one typed HTTP client, a persisted Sanctum-token auth context, route guards, and feature pages that consume only response fields exposed by Laravel Resources. The existing, uncommitted BE controllers are treated as the current contract and are first protected by feature tests before UI integration.

**Tech Stack:** Laravel 13, Sanctum, Pest/PHPUnit, React 18, TypeScript, Vite, Tailwind 4, existing Material UI, React Router 7.

## Global Constraints

- Do not alter any public `/api/v1` route path, request field, resource field, or role value already present in `BE/routes/api.php`.
- Preserve the existing dirty BE implementation unless a newly added failing contract test proves a defect.
- The frontend must contain no `mockData` imports for production routes.
- Use `Authorization: Bearer <token>` for protected calls and clear local auth state after logout.
- UI copy is Vietnamese; code identifiers and API names remain English.
- Unsupported Figma DEMO concepts (combos, internships, jobs, recruiter) are removed from the production navigation because BE and SPEC do not define them.
- Every new behavior follows red-green-refactor: a failing test precedes production code.

---

### Task 1: Lock the Laravel API contract with feature tests

**Files:**
- Create: `BE/tests/Feature/Api/AuthAndCatalogTest.php`
- Create: `BE/tests/Feature/Api/StudentLearningFlowTest.php`
- Create: `BE/tests/Feature/Api/AdminManagementTest.php`
- Modify only if a test exposes a defect: `BE/routes/api.php`, `BE/app/**`

**Interfaces:**
- Consumes: current `/api/v1` routes, factories, `PaymentGateway`, `ProgressService`, and `QuizGradingService`.
- Produces: executable proof of guest catalogue, authentication, payment/enrollment, progress, quiz/certificate/review, and admin role restrictions.

- [ ] **Step 1: Write failing guest/auth tests.** Cover public category/course listing and filtering, registration token, login rejection for invalid credentials and locked user, profile update, and logout token revocation.
- [ ] **Step 2: Run the focused test file.** `php artisan test tests/Feature/Api/AuthAndCatalogTest.php`; confirm it fails because the contract tests do not yet exist.
- [ ] **Step 3: Add only missing factories or contract fixes revealed by the tests.** Do not replace existing controllers with a second implementation.
- [ ] **Step 4: Re-run the focused test file.** Verify all its cases pass.
- [ ] **Step 5: Write failing learning-flow tests.** Assert pending order creation, failed-payment retry, successful payment creating a one-year enrollment, course ownership, lesson progress idempotency, blocked quiz before 100%, grading/certificate, and review upsert.
- [ ] **Step 6: Run and make the learning-flow tests pass.** `php artisan test tests/Feature/Api/StudentLearningFlowTest.php`.
- [ ] **Step 7: Write failing admin tests.** Assert student is rejected, admin dashboard statistics render, user lock works, and CRUD actions for categories, courses, lessons, quiz questions, and review moderation work.
- [ ] **Step 8: Run and make the admin tests pass.** `php artisan test tests/Feature/Api/AdminManagementTest.php`.

### Task 2: Build typed API and authentication foundations in the SPA

**Files:**
- Create: `FE/DEMO/src/app/lib/api.ts`
- Create: `FE/DEMO/src/app/lib/contracts.ts`
- Create: `FE/DEMO/src/app/lib/format.ts`
- Modify: `FE/DEMO/src/app/contexts/AuthContext.tsx`
- Modify: `FE/DEMO/src/app/routes.tsx`
- Modify: `FE/DEMO/src/app/components/Layout.tsx`
- Test: `FE/DEMO/src/app/lib/api.test.ts`
- Test: `FE/DEMO/src/app/contexts/AuthContext.test.tsx`

**Interfaces:**
- Consumes: API base URL from `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`) and Laravel JSON envelopes.
- Produces: `apiRequest<T>()`, typed resources, persisted `AuthSession`, `login`, `register`, `logout`, `refreshUser`, and role-aware guards.

- [ ] **Step 1: Write failing client tests.** Test Bearer header addition, Laravel 422 message mapping, and token removal after a 401 response.
- [ ] **Step 2: Run client tests and observe the expected missing-module failure.** `pnpm test --run src/app/lib/api.test.ts`.
- [ ] **Step 3: Implement the minimal typed request client and resource types.**
- [ ] **Step 4: Re-run client tests.**
- [ ] **Step 5: Write failing auth-context tests.** Test session restoration, login persistence, logout cleanup, and student/admin route selection.
- [ ] **Step 6: Implement auth context and protected route components; then re-run tests.**

### Task 3: Implement guest and student learning interfaces

**Files:**
- Create: `FE/DEMO/src/app/pages/CatalogPage.tsx`
- Create: `FE/DEMO/src/app/pages/CoursePage.tsx`
- Create: `FE/DEMO/src/app/pages/MyCoursesPage.tsx`
- Create: `FE/DEMO/src/app/pages/LearnCoursePage.tsx`
- Create: `FE/DEMO/src/app/pages/CheckoutPage.tsx`
- Create: `FE/DEMO/src/app/pages/ProfilePage.tsx`
- Modify: `FE/DEMO/src/app/pages/Home.tsx`
- Modify: `FE/DEMO/src/app/pages/Login.tsx`
- Modify: `FE/DEMO/src/app/routes.tsx`
- Test: `FE/DEMO/src/app/pages/*.test.tsx`

**Interfaces:**
- Consumes: `GET /categories`, catalogue/course/reviews endpoints, and authenticated student endpoints.
- Produces: real catalogue filtering, details/review display, mock-payment checkout, enrolled-course dashboard, video learning/progress, quiz/results/certificate download, review form, and profile/password forms.

- [ ] **Step 1: Write failing catalogue/detail tests with MSW/fetch stubs.** Assert loading, empty, error, filter query, and API-resource rendering states.
- [ ] **Step 2: Run focused tests; then implement the catalogue and course detail screens.**
- [ ] **Step 3: Write failing checkout and my-course tests.** Assert order creation, payment success/failure rendering, progress calculation display, and protected redirection.
- [ ] **Step 4: Implement checkout and enrolled-course views; rerun tests.**
- [ ] **Step 5: Write failing learning/quiz/profile tests.** Assert completion state, exam lock until progress is complete, result rendering, certificate download request, review submission, profile/password errors.
- [ ] **Step 6: Implement the learning and profile views; rerun their tests.**

### Task 4: Implement the admin workspace and remove mock-only routes

**Files:**
- Create: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Create: `FE/DEMO/src/app/components/admin/CourseEditor.tsx`
- Create: `FE/DEMO/src/app/components/admin/CategoryManager.tsx`
- Create: `FE/DEMO/src/app/components/admin/StudentManager.tsx`
- Create: `FE/DEMO/src/app/components/admin/ReviewManager.tsx`
- Modify: `FE/DEMO/src/app/components/Layout.tsx`
- Modify: `FE/DEMO/src/app/routes.tsx`
- Test: `FE/DEMO/src/app/pages/AdminPage.test.tsx`

**Interfaces:**
- Consumes: `/admin/dashboard/stats`, users, category/course/lesson/quiz/question, and review endpoints.
- Produces: a role-guarded admin workspace that can read metrics and manage the entities defined in SPEC.

- [ ] **Step 1: Write the failing admin-page tests.** Assert student redirect, metrics cards, request payloads for lock/publish/status, and inline API error states.
- [ ] **Step 2: Run the test, implement the smallest admin workspace, and rerun it.**
- [ ] **Step 3: Remove DEMO-only public navigation/routes and mock-data imports.** Preserve only routes backed by BE/SPEC.
- [ ] **Step 4: Run the complete frontend test suite and production build.**

### Task 5: Integrate and verify against a live local stack

**Files:**
- Modify when required: `FE/DEMO/.env.example`, `BE/config/cors.php`
- Create: `docs/superpowers/verification/2026-07-10-seongon-lms-full-stack-verification.md`

**Interfaces:**
- Consumes: migration database, Laravel server on `:8000`, Vite server on `:5173`.
- Produces: reproducible evidence of browser navigation and API calls for guest, student, and admin flows.

- [ ] **Step 1: Configure a local test database and run fresh migrations.**
- [ ] **Step 2: Execute all Laravel tests.** `php artisan test`.
- [ ] **Step 3: Execute all SPA tests and the Vite production build.** `pnpm test --run` and `pnpm build`.
- [ ] **Step 4: Start Laravel and Vite, then make live HTTP checks for public, student, and admin API calls.**
- [ ] **Step 5: Use browser automation to verify responsive navigation, real catalogue rendering, payment/progress/quiz behavior, and the admin guard.**
- [ ] **Step 6: Record each command, route, assertion, and observed result in the verification artifact.**
