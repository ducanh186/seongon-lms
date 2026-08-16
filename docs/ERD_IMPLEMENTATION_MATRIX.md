# ERD Implementation Matrix

Tracks each of the 15 approved ERD tables from `docs/ERD_P1.png` through to Admin and Student/Public usage.

Every row must eventually read **IMPLEMENTED**.

**Status legend**

| Status | Meaning |
|---|---|
| `PENDING` | Nothing exists yet for this table. |
| `PARTIAL` | An equivalent exists under a different name/shape; migration + refactor required. |
| `IMPLEMENTED` | Migration, model, service, admin route, admin screen, and student/public usage all done and verified. |

**Current state:** P0 step C is complete, and step D is complete through **D3** (Users/Roles, Courses/Categories, Assessment domain). Remaining: **D4** Learning domain, **D5** Orders/Enrollments. All of step D uses expand → migrate → contract sequencing; no contract phase has run yet, so every legacy column and relation alias is still in place. See the step logs below.

---

## Matrix

| ERD Table | Backend Model | Migration | Service | Admin Route | Admin Screen | Student/Public Usage | Status |
|---|---|---|---|---|---|---|---|
| **Roles** | `Role` ✅ | `2026_08_16_000001_create_roles_table` ✅ | `RoleService` | `/admin/roles` | Vai trò — list, create, edit, delete | none (backing store for authorization) | `PARTIAL` |
| **Users** | `User` ✅ `role()` | `2026_08_16_000005_add_role_id_to_users_table` ✅ (expand). Contract pending: `role` drop, `role_id` NOT NULL, `name`→`full_name` | `UserService` | `/admin/users` | Người dùng — list, search, filter by role/status, lock/unlock | register, login, profile, password | `PARTIAL` |
| **Carts** | `Cart` ✅ | `2026_08_16_000002_create_carts_table` ✅ | `CartService` | `/admin/carts` | Giỏ hàng — read-only list | student cart, replaces `localStorage` | `PARTIAL` |
| **Cart_items** | `CartItem` ✅ | `2026_08_16_000003_create_cart_items_table` ✅ | `CartService` | `/admin/cart-items` | Chi tiết giỏ hàng — read-only list | student cart line items | `PARTIAL` |
| **Orders** | `Order` | alter: drop `course_id`, `amount`→`total_amount`, keep `status`/`paid_at`/`payment_method` | `OrderService` | `/admin/orders` | Đơn hàng — read-only list + detail | checkout, payment | `PARTIAL` |
| **Categories** | `Category` | alter: align columns (`created_at` only per ERD; keep `slug` for public filtering) | `CategoryService` | `/admin/categories` | Danh mục — full CRUD | catalog filter, home category counts | `PARTIAL` |
| **Course_categories** | `CourseCategory` ✅ | `2026_08_16_000004_create_course_categories_table` ✅ (backfilled, dual-written by `Course`) | `CourseService` | `/admin/course-categories` | Phân loại khóa học — assign categories to a course | ✅ catalog filter + category counts read the pivot | `PARTIAL` |
| **Courses** | `Course` | alter: drop `category_id`, add `avg_rating`, `total_lessons`; keep `slug`/`instructor_*`/`level`/`price`/`status` | `CourseService` | `/admin/courses` | Khóa học — full CRUD, publish/hide, nested lessons + exam | catalog, course detail, home | `PARTIAL` |
| **Enrollments** | `Enrollment` | alter: keep `expires_at`/`status` (unused this phase). **No snapshot columns.** Keep `user_id`; keep `order_id` nullable per ADR 0001 | `EnrollmentService` | `/admin/enrollments` | Ghi danh — read-only list + detail | My Courses, learning access guard | `PARTIAL` |
| **Exams** | `Exam` ✅ | `2026_08_16_000007` ✅ rename + `duration_minutes`, `total_questions` | `ExamGradingService` ✅ (CRUD `ExamService` pending) | `/admin/exams` | Bài kiểm tra — config pass score, attempts | ✅ final quiz reads `exams` | `PARTIAL` |
| **Questions** | `Question` ✅ | `2026_08_16_000007` ✅ `quiz_id`→`exam_id`, `sort_order` | `ExamGradingService` ✅ | `/admin/questions` | Câu hỏi — CRUD, reorder, nested under Exam | ✅ quiz rendering | `PARTIAL` |
| **Answers** | `Answer` ✅ | `2026_08_16_000006` ✅ rename | `ExamGradingService` ✅ | `/admin/answers` | Đáp án — CRUD, mark correct, nested under Question | ✅ quiz options | `PARTIAL` |
| **Learning_progress** | `LearningProgress` ✅ | `2026_08_16_000010` ✅ rename `lesson_progress`→`learning_progress` | `ProgressService` ✅ | `/admin/learning-progress` | Tiến độ học tập — read-only list | ✅ lesson completion, progress %, certificate eligibility | `PARTIAL` |
| **Attempts** | `Attempt` ✅ | `2026_08_16_000008` ✅ rename + `attempt_number`, `correct_count`, `wrong_count`, `answers` JSON · `2026_08_16_000009` ✅ folded and dropped `quiz_attempt_answers` | `ExamGradingService` ✅ | `/admin/attempts` | Lượt làm bài — read-only list + per-question detail | ✅ submission, result, past-attempt review | `PARTIAL` |
| **Lessons** | `Lesson` ✅ | `2026_08_16_000010` ✅ `position`→`sort_order`; `material_url` pending | `LessonService` | `/admin/lessons` | Bài học — CRUD, reorder, nested under Course | ✅ learning workspace | `PARTIAL` |

---

## Admin information architecture (brief §7)

**Reference scope approved on 2026-08-16:** use the WooCommerce sample only for Admin information architecture and CRUD interaction patterns. Public/Student UI continues to follow the SEONGON LMS spec and existing product direction.

```
SEONGON ADMIN
Dashboard
ACCOUNT      → Users, Roles
COMMERCE     → Carts, Cart_items, Orders
COURSE MGMT  → Courses, Categories, Course_categories, Lessons
LEARNING     → Enrollments, Learning_progress
ASSESSMENT   → Exams, Questions, Answers, Attempts
SYSTEM       → Xem site public, Đăng xuất
```

All screens reuse the existing shell: `AdminShell` → `AdminEntityPage` → `AdminDataTable`, with `AsyncState` supplying loading/empty/error. The `placeholder` status of `AdminEntityPage` becomes unused once every table is `IMPLEMENTED`, and the `ERD_PENDING` markers in `domain/entityRegistry.ts`, `admin/adminNavigation.ts`, and both repository files are removed at that point.

Read-only screens (no create/edit/delete) are intentional per §9 — transactional and history records: **Carts, Cart_items, Orders, Enrollments, Learning_progress, Attempts**.

---

## Execution order (blocking edges)

```
P0  Roles → Users(role_id)
    Categories → Course_categories → Courses(drop category_id)
    Exams → Questions → Answers
    Lessons, Learning_progress renames
    Carts → Cart_items
    Orders → Enrollments (user_id retained; Enrollment→User is an open question)
         ↓
P1  Models + Services + API resources + endpoints
         ↓
P2  Admin routes + 15 admin screens + sidebar IA
         ↓
P3  Student/Public rewired: cart to backend, progress, attempts
         ↓
P4/P5  UI fixes, polish
```

### P0 step C — done

Strictly additive: four new tables, four new models, backfill of `course_categories`. Nothing dropped, no behaviour changed.

| Item | Result |
|---|---|
| Migrations | 4 applied (`2026_08_16_000001`–`000004`) |
| Models | `Role`, `Cart`, `CartItem`, `CourseCategory`; `Course::categories()` `BelongsToMany` added alongside the legacy `Course::category()` |
| Seeder | `RoleSeeder` (`admin`, `student`, idempotent via `updateOrCreate`), called first in `DatabaseSeeder` |
| Backfill | 101 courses → 101 `course_categories` rows; pivot resolves identically to the legacy `category()` |
| Tests | `php artisan test` — **67 passed**, 381 assertions |
| Lint | `pint --test` — passed |

**Roles deployment dependency — resolved in D1.** Migration correctness must not depend on anyone having run a seeder. The D1 migration provisions the canonical `admin`/`student` roles itself, idempotently and inside the same transaction as the backfill. `RoleSeeder` is retained for dev/test/demo convenience only.

### P0 step D1 — Users / Roles — done (expand only)

| Item | Result |
|---|---|
| Migration | `2026_08_16_000005_add_role_id_to_users_table` |
| Roles provisioning | Done **inside the migration**, idempotently, in a transaction. Existing rows are never overwritten. No seeder dependency. |
| Column | `users.role_id` nullable + FK `restrictOnDelete` |
| Backfill | one `UPDATE` per role (portable across MySQL and SQLite; `UPDATE … JOIN` is not) |
| Verification | migration throws if any user is left with a null `role_id`, naming the unmapped `users.role` values |
| Model | `User::role()` `BelongsTo`; `saving` hook syncs `role` ⇄ `role_id` both ways. `role_id` is **not** mass assignable — see below |
| Tests | `UserRoleBackfillTest` (8) + `UserMassAssignmentTest` (2). Full suite **77 passed**, 400 assertions |
| Lint | `pint --test` — passed |

**Dev DB data check**

| | Before | After |
|---|---|---|
| `users` | 117 | 117 |
| `roles` | 2 | 2 |
| `users.role_id` IS NULL | — (column absent) | **0** |
| `admin` → `admin` | — | 1 ✅ |
| `student` → `student` | — | 116 ✅ |
| Orphan `role_id` with no `roles` row | — | **0** |

**Deliberately deferred to the contract phase, not done here:**

- `users.role_id` stays **nullable**. Enforcing `NOT NULL` during expand would break any still-running old code that writes only `users.role` — for example during a rolling deploy. It is enforced once no deployed writer sets `role` alone.
- `users.role` is **preserved**. Every current reader (`EnsureRole`, `UserResource`, `User::isAdmin()`, `DashboardController`, `Admin\UserController`, `GeneratedDemoCatalogSeeder`) still reads the string and is untouched.
- `name` → `full_name` is **not** renamed. Destructive rename waits until application code is compatible.
- Known and intentional: the legacy `role` string column shadows the `role()` relation accessor, so `$user->role` keeps returning `'admin'`/`'student'`. `$user->role()` and `with('role')` reach the relation. This resolves itself when the column is dropped.

**Role assignment is server-controlled.** `role_id` is deliberately excluded from `User`'s `#[Fillable]`, matching how the legacy `role` column was already handled. `AuthController::updateProfile()` pipes request input into `User::update()`, so a mass-assignable `role_id` would be a self-service privilege-escalation path the moment its validation allowlist changes. Role is set directly (`$user->role_id = …`) or derived by the `saving` hook, never through `fill()`. Covered by `UserMassAssignmentTest`.

### P0 step D2 — Courses / Categories — done (expand only)

No migration. Code-only: the pivot created in step C becomes the read path while `courses.category_id` stays as the write path.

| Change | Detail |
|---|---|
| `Course` dual-write | `created` / `updated` model events mirror `category_id` into `course_categories`. Every existing writer — `Admin\CourseController`, `CourseFactory`, both demo seeders, all tests — populates the pivot untouched. |
| `Category::courses()` | `HasMany` → `BelongsToMany` through the pivot. Moves `withCount('courses')` in `Api\CategoryController` and `Api\Admin\CategoryController` onto the approved ERD relationship. |
| `CourseController@index` | Category filter now `whereHas('categories', …)` against the pivot. |
| Tests | `CourseCategoryParityTest` — 6 cases. Full suite **83 passed**, 409 assertions |
| Lint | `pint --test` — passed |

**Dev DB parity (101 courses)**

| Check | Result |
|---|---|
| `courses` / `course_categories` rows | 101 / 101 |
| Legacy `category_id` with no matching pivot row | **0** |
| Pivot rows with no matching course | **0** |
| Pivot rows with no matching category | **0** |

**Write-path probe** (run inside a transaction, rolled back — dev DB unchanged at 101/101):

| Operation | Legacy | Pivot | |
|---|---|---|---|
| create course in category A | 7 | `[7]` | ✅ |
| change to category B | 8 | `[8]` | ✅ |
| attach extra A, then edit title | 8 | `[7,8]` | ✅ extra preserved |

**Bug caught by the parity tests.** The first hook keyed off `wasRecentlyCreated` inside a `saved` listener. That flag stays `true` for the life of the instance, so a later `update()` on the same object re-synced and silently deleted any category attached directly through the pivot. Replaced with separate `created` / `updated` listeners, and the `updated` path detaches only the *previous* primary instead of `sync()`ing the whole set.

**Deliberately not done here:**

- `courses.category_id` is **not** dropped, and `Course::category()` still exists. Both remain until every caller is migrated.
- `CourseResource` output is **unchanged** — still emits `category_id` and a singular `category` object. Changing it to a `categories` array is an API contract break that belongs with the frontend work in P3, not P0.
- `Admin\CourseController` still validates and writes a single `category_id`. A multi-category admin assignment UI is P2.

### P0 step D3 — Assessment domain — done (expand only)

Four migrations, landed with their code so schema and application never disagree.

| Migration | Change |
|---|---|
| `2026_08_16_000006` | `question_options` → `answers` (pure rename; columns already matched the ERD) |
| `2026_08_16_000007` | `quizzes` → `exams` + `duration_minutes`, `total_questions`; `questions.quiz_id` → `exam_id` + `sort_order` |
| `2026_08_16_000008` | `quiz_attempts` → `attempts`; `quiz_id`→`exam_id`, `attempt_no`→`attempt_number`; + `correct_count`, `wrong_count`, `answers` JSON |
| `2026_08_16_000009` | folds `quiz_attempt_answers` into `attempts.answers`, verifies the fold, then drops the table |

| Layer | Change |
|---|---|
| Models | `Quiz`→`Exam`, `QuestionOption`→`Answer`, `QuizAttempt`→`Attempt`; `QuizAttemptAnswer` deleted. `Question::answers()`, `Enrollment::attempts()`, `Course::exam()` |
| Service | `QuizGradingService` → `ExamGradingService`; writes `attempts.answers` directly, no child rows |
| Factories | `ExamFactory`, `AnswerFactory`; `QuizFactory`/`QuestionOptionFactory` deleted |
| Tests | `ExamAnswersContractTest` — 5 cases. Full suite **88 passed**, 440 assertions |
| Lint | `pint --test` clean on every file touched |

**Dev DB counts**

| Table | Before | After |
|---|---|---|
| `quizzes` → `exams` | 101 | 101 |
| `questions` | 301 | 301 |
| `question_options` → `answers` | 1202 | 1202 |
| `quiz_attempts` → `attempts` | 1 | 1 |
| `quiz_attempt_answers` | 1 | dropped, folded into `attempts.answers` |
| Orphan `questions.exam_id` | — | **0** |
| Orphan `answers.question_id` | — | **0** |

Folded row: `[{"question_id":351,"selected_answer_id":1397,"is_correct":true}]`, `correct_count=1`, `wrong_count=0`.

**API contract fully preserved — nothing frontend-visible changed.** Route URLs (`courses/{course}/quiz`, `quizzes/{quiz}/questions`, `my/quiz-attempts/{attempt}`) and every JSON field name are untouched. Two expand-phase relation aliases exist purely because `Admin\QuizController` and `Admin\QuestionController` serialise raw models, which makes the relation name part of the payload:

- `Question::options()` → alias for `answers()`, keeps the `options` JSON key.
- `Course::quiz()` → alias for `exam()`, keeps both the `quiz` field and the `quiz` eager-load key that `CourseResource`'s `has_quiz` depends on.

`QuizAttemptResource` reads the new columns and maps them back to the legacy names: `exam_id`→`quiz_id`, `attempt_number`→`attempt_no`, `selected_answer_id`→`selected_option_id`. Both aliases and the mapping are deleted in P3 when the frontend moves to ERD names.

**Deliberately not done here:** controller class names, route URLs, and resource field names are unchanged — they are the API boundary, owned by P2/P3. A CRUD `ExamService` is P1; D3 only renamed the grading service.

### P0 step D4 — Learning domain — done

Migration `2026_08_16_000010` performs two ERD-alignment renames:

- `lesson_progress` → `learning_progress`
- `lessons.position` → `lessons.sort_order`

Application code now uses `LearningProgress` and `sort_order`. Existing request and JSON field names remain `position`, mapped by `Admin\LessonController` and `LessonResource`, so the frontend contract is unchanged.

**Dev DB parity**

| Check | Before | After |
|---|---:|---:|
| Progress rows | 1,268 | 1,268 |
| Lesson rows | 402 | 402 |
| Lesson ordering sum | 1,003 | 1,003 |
| Orphan progress → enrollment | — | 0 |
| Orphan progress → lesson | — | 0 |

**Verification:** `LearningProgressContractTest` was observed red before implementation and green after it. Full backend suite: **90 passed, 454 assertions**. Pint passes on every D4-touched PHP file; the full Pint scan still reports only the pre-existing files listed in the handoff.

### Remaining P0

`Orders`/`Enrollments` remains the highest-risk edge and is deferred. Enrollment ownership is now resolved: keep `enrollments.user_id` and nullable `order_id` per `docs/adr/0001-keep-direct-enrollment-ownership.md`. Failed-order line-item persistence remains open; D5 must not invent it. See `docs/ERD_FEATURE_GAPS.md`.

---

## Out of scope for this matrix

`reviews`, `news_posts`, `certificates`, `quiz_attempt_answers`, and the notification stub have no ERD table. They are tracked in `docs/ERD_FEATURE_GAPS.md` and are **not** rows here. All of them are preserved; none blocks the 15-table core.
