# SEONGON LMS Full UI Integration Handoff

**Created:** 2026-07-11  
**Workspace:** `D:\CODE\seongon-lms`  
**Repository status:** This workspace is not a Git repository. Do not use Git commands or infer a branch/commit history.

## Objective

Finish the full Guest, Student, and Admin UI in `FE\DEMO` so it uses the real Laravel API in `BE`, then prove it through frontend unit tests, Laravel contract tests, builds, and real local browser flows.

## Approved decisions

1. Scope is **FULL**: Guest + Student + Admin.
2. Keep React Router + MUI 7 and the existing light/teal design (`#007E87`, 12px radius). Do not replace the design system.
3. The Laravel backend remains the business-rule source of truth. Do not rename public API contracts or duplicate backend rules in React.
4. The user explicitly approved one required backend extension: only `GET /api/v1/admin/courses/{course}` returns admin-only editable `quiz.questions.options`, including `is_correct`. Public/student endpoints must never expose correct answers.
5. Use TDD for changes. The Admin resource, API client, shared async UI, profile refresh, Student loading states, and Admin content editing were all added only after focused tests demonstrated missing behavior.

## Implemented work

### Laravel backend

- Added `BE/app/Http/Resources/AdminCourseResource.php`.
  - Extends `CourseResource`.
  - Adds `quiz` only for the admin course-detail response.
  - Serializes quiz id/configuration, questions, options, and `is_correct`.
- Updated `BE/app/Http/Controllers/Api/Admin/CourseController.php`.
  - `show()` still eager-loads `category`, `lessons`, and `quiz.questions.options`.
  - It now returns `AdminCourseResource`.
- Extended `BE/tests/Feature/Api/AdminManagementTest.php`.
  - Admin quiz-detail contract plus public-answer confidentiality.
  - Lesson reorder contract.
  - Category/course/lesson/question update/delete contracts.
  - Student denial for admin course detail.

### Frontend API/contracts

- Updated `FE/DEMO/src/app/lib/contracts.ts` with:
  - `ApiAdminQuestionOption`
  - `ApiAdminQuestion`
  - `ApiAdminQuiz`
  - `ApiAdminCourse`
- Updated `FE/DEMO/src/app/lib/api.ts` with:
  - Correct `adminCourse` detail type.
  - `reorderLessons`.
  - Typed admin quiz/question responses.
  - `updateQuestion` and `deleteQuestion`.
- Added API regression test in `FE/DEMO/src/app/lib/api.test.ts` for reorder payload and question update route/method.

### Shared and Guest UI

- Added `FE/DEMO/src/app/components/AsyncState.tsx`:
  - `PageSkeleton`
  - `EmptyState`
  - `RequestError`
- Added `AsyncState.test.tsx`.
- Updated `AuthPage.tsx` to show Laravel 422 field errors on matching inputs.
- Updated `AuthContext.tsx` with `refreshUser()`:
  - Retrieves `/auth/me` with the stored Sanctum token.
  - Replaces stale user state.
  - Clears session on a failed refresh.
- Updated `CatalogPage.tsx` and `CoursePage.tsx` to use the reusable skeleton and retryable error UI.
- Added/updated tests:
  - `AuthPage.test.tsx`
  - `AuthContext.test.tsx`
  - `CatalogPage.test.tsx`
  - `CoursePage.test.tsx`

### Student UI

- Updated `ProfilePage.tsx`:
  - Calls `refreshUser()` after a successful profile save.
  - Shows field-level validation errors for profile and password fields.
- Updated `CheckoutPage.tsx`, `MyCoursesPage.tsx`, and `LearnCoursePage.tsx` to use `PageSkeleton` while their first API request is pending.
- Added tests:
  - `CheckoutPage.test.tsx`: failed payment remains retryable and does not navigate; loading skeleton.
  - `MyCoursesPage.test.tsx`: expired enrollment cannot navigate to learning; loading skeleton.
  - `LearnCoursePage.test.tsx`: quiz is unavailable until backend `can_take_exam`; loading skeleton.
  - `ProfilePage.test.tsx`: refreshed profile state and Laravel password field error.

### Admin UI

- Replaced `FE/DEMO/src/app/pages/AdminPage.tsx` with the full API-backed workspace.
- It now supports:
  - Dashboard counts.
  - Filtered/paginated Student, Course, and Review lists.
  - Create/edit/delete Categories.
  - Create/edit/publish/delete Courses.
  - Load a selected course’s editable detail using `api.adminCourse`.
  - Add/edit/delete/reorder Lessons.
  - Create/update quiz configuration.
  - Load/edit/delete existing Questions and manage at least two answer options with exactly one correct choice.
  - Show/hide/delete Reviews.
  - Native confirmation before destructive actions.
- Added `AdminPage.test.tsx`:
  - Existing quiz questions/options load before editing.
  - Moving Lesson 1 down sends the full new ID order `[9, 7]`.

## Specifications and plan

- Design spec: `docs/superpowers/specs/2026-07-11-seongon-lms-full-ui-integration-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-11-seongon-lms-full-ui-integration.md`

## Verification evidence

### Passed

| Check | Fresh evidence |
|---|---|
| Admin detail privacy regression | 2 Pest tests, 13 assertions passed. |
| New Admin mutation/authorization contracts | 3 Pest tests, 21 assertions passed. |
| Entire Laravel suite | 38 tests, 178 assertions passed. |
| Frontend API unit test | 3 tests passed. |
| Shared/Auth/Guest frontend group | 7 tests passed. |
| Student frontend group | 8 tests passed. |
| Admin frontend component test | 2 tests passed. |
| Vite production build | Passed. Latest generated JavaScript chunk is 577.28 kB (175.53 kB gzip). |

### Known verification blocker

`npx vitest run` / `npm run test` currently starts Vitest 4.1.10 but does not progress past:

```text
RUN  v4.1.10 D:/CODE/seongon-lms/FE/DEMO
```

No test names or failures are emitted within 30 seconds. This also occurred with `--reporter=verbose` and `--no-file-parallelism`.

This is not an assertion failure. All test files passed in the focused groups listed above. The likely issue is in full-suite collection/setup rather than an individual test behavior, but this is not proven yet.

The current run was at **Phase 1 root-cause investigation** using `superpowers:systematic-debugging`; no fix has been attempted for this hang.

## Safe next steps

1. Continue the Vitest root-cause investigation before modifying configuration:
   - Confirm whether `npx vitest list` also stalls.
   - Run explicit subsets of test filenames to find a collection-level interaction.
   - Compare a one-file command with a complete explicit-file command.
   - Check whether async `vi.mock(... importOriginal ...)` factories or unresolved promise test fixtures interact only during full test collection.
   - Form one evidence-backed hypothesis, make one minimal change, then re-run the full suite.
2. When `npm run test` exits successfully, run `npm run build` again for fresh final evidence.
3. Before browser testing, read the `browser:control-in-app-browser` skill because local browser control is required.
4. Only after tests are stable, prepare local integration services:
   - `BE`: inspect the existing local environment/database before using `php artisan migrate:fresh --seed`; that command resets the local database.
   - Run Laravel on `http://localhost:8000` and Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
5. Perform real browser flows:
   - Student: register/login → catalog → course → order/pay QR → My Courses → complete lessons → quiz → certificate download → review.
   - Admin: login with seeded admin → category/course CRUD → lesson CRUD/reorder → quiz/question CRUD → publish → user status → review moderation.
6. Do not claim completion until the full frontend suite, Laravel suite, Vite build, and both live browser flows have current success evidence.

## Important cautions

- `mockData.ts` remains in the demo tree but must not be used by API-driven routes.
- The Vite build passes but reports the existing large-chunk warning. Do not add a speculative code-splitting refactor unless requested.
- No browser-based integration test has started yet.
- Do not reset or overwrite unrelated files while continuing. The workspace is not version-controlled.
