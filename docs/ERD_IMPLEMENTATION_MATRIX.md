# ERD Implementation Matrix

Tracks each of the 15 approved ERD tables from `docs/ERD_P1.png` through to Admin and Student/Public usage.

Every row must eventually read **IMPLEMENTED**.

**Status legend**

| Status | Meaning |
|---|---|
| `PENDING` | Nothing exists yet for this table. |
| `PARTIAL` | An equivalent exists under a different name/shape; migration + refactor required. |
| `IMPLEMENTED` | Migration, model, service, admin route, admin screen, and student/public usage all done and verified. |

**Current state:** Admin coverage is complete for all 15 approved ERD entities. The schema remains in its safe expand/migrate deployment: D4, D5, legacy compatibility columns, and the final contract removals are intentionally pending.

---

## Matrix

| ERD Entity | Actual DB | Model / Relationships | Migration | Service | API | Admin | Public / Student | Status |
|---|---|---|---|---|---|---|---|---|
| **Roles** | `roles` ✅ | `Role::users`, `User::role` ✅ | `000001` ✅ | `RoleService` admin read ✅ | `/admin/roles` read ✅ | real read-only list ✅ | authorization backing only | `PARTIAL` |
| **Users** | `users` ✅ | `User::role/orders/enrollments` ✅ | `000005` expand ✅; legacy `role` retained | missing `UserService` | `/auth/*`, `/admin/users` ✅ | real list/status UI ✅ | auth/profile ✅ | `PARTIAL` |
| **Carts** | `carts` ✅ | `Cart::user/items` ✅ | `000002` ✅ | `CartService` Student operations + admin read ✅ | `/cart*` + `/admin/carts` read ✅ | real read-only list/aggregates ✅ | authenticated Cart is DB-authoritative ✅ | `PARTIAL` |
| **Cart_items** | `cart_items` ✅ | `CartItem::cart/course/user` ✅ | `000003`; unique `(cart_id, course_id)` ✅ | `CartService` sync/reconcile/admin read ✅ | `/cart/items*` + `/admin/cart-items` read ✅ | real read-only list ✅ | Header/Cart/Checkout use shared API state ✅ | `PARTIAL` |
| **Orders** | `orders` ✅ | `Order::user/course/enrollment` ✅ | `000011` expand ✅; `amount`/`course_id` retained | `OrderService` admin read ✅ | Student create/pay + `/admin/orders*` read ✅ | real read-only list ✅ | single-Course checkout + stable idempotency key ✅ | `PARTIAL` |
| **Categories** | `categories` ✅ | `Category::courses` through pivot ✅ | existing | missing `CategoryService` | `/categories`, `/admin/categories` ✅ | real CRUD UI ✅ | catalog filter ✅ | `PARTIAL` |
| **Course_categories** | `course_categories` ✅ | `CourseCategory`; `Course::categories` ✅ | `000004` + backfill ✅ | `CourseService` sync/admin read ✅ | `/admin/course-categories` + Course write ✅ | real read-only pivot list + multi-select ✅ | public filter reads pivot ✅ | `PARTIAL` |
| **Courses** | `courses` ✅ | category/categories, lessons, exam, enrollments ✅ | existing; legacy `category_id` retained as mirror | `CourseService` create/update/publish/read ✅ | `/courses`, `/admin/courses` ✅ | 13 real/aggregate columns + nested content ✅ | catalog/detail ✅ | `PARTIAL` |
| **Enrollments** | `enrollments` ✅ | user/course/order/progress/attempts ✅ | existing; direct `user_id`, nullable `order_id` retained | `EnrollmentService` create/admin read ✅ | `/my/courses*` + `/admin/enrollments*` read ✅ | real top-level read-only list ✅ | learning access ✅ | `PARTIAL` |
| **Exams** | `exams` ✅ | `Exam::course/questions/attempts` ✅ | `000007` expand ✅ | `ExamGradingService` + admin index ✅ | nested write + `/admin/exams` read ✅ | real top-level list + nested Course editor ✅ | quiz flow ✅ | `PARTIAL` |
| **Questions** | `questions` ✅ | `Question::exam/answers` ✅ | `000007` ✅ | `LearningOperationsService` admin read ✅ | nested write + `/admin/questions` read ✅ | real top-level list + nested editor ✅ | quiz rendering ✅ | `PARTIAL` |
| **Answers** | `answers` ✅ | `Answer::question` ✅ | `000006` ✅ | `LearningOperationsService` admin read ✅ | nested write + `/admin/answers` read ✅ | real top-level list + nested editor ✅ | quiz answer options ✅ | `PARTIAL` |
| **Learning_progress** | `learning_progress` ✅ plus transition `lesson_progress` | `LearningProgress::enrollment/lesson` ✅ | `000010` expand/backfill ✅; contract pending | `ProgressService` + admin read ✅ | lesson progress + `/admin/learning-progress` read ✅ | real top-level read-only list ✅ | learning progress ✅ | `PARTIAL` |
| **Attempts** | `attempts` ✅ | `Attempt::enrollment/exam` ✅ | `000008`/`000009` ✅ | `ExamGradingService` + admin read ✅ | submit/result + `/admin/attempts` read ✅ | real top-level read-only list ✅ | exam attempts ✅ | `PARTIAL` |
| **Lessons** | `lessons` ✅ | `Lesson::course/learningProgress` ✅ | `000010` expand/backfill ✅; `position` retained | `LearningOperationsService` admin read ✅ | nested write + `/admin/lessons` read ✅ | real top-level list + nested Course editor ✅ | learning workspace ✅ | `PARTIAL` |

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

All screens reuse `AdminShell`, the grouped persistent sidebar, `AdminDataTable`, and explicit loading/empty/error states. Mutable business entities reuse existing editors; transactional/history entities use filtered read-only indexes backed by their own Admin API.

Read-only screens (no create/edit/delete) are intentional per §9 — transactional and history records: **Carts, Cart_items, Orders, Enrollments, Learning_progress, Attempts**.

---

## Execution order (blocking edges)

```
P0  Roles → Users(role_id)
    Categories → Course_categories → Courses(drop category_id)
    Exams → Questions → Answers
    Lessons, Learning_progress renames
    Carts → Cart_items
    Orders → Enrollments (user_id retained; order_id stays nullable per ADR 0001)
         ↓
P1  Models + Services + API resources + endpoints
         ↓
P2  Admin routes + 15 admin screens + sidebar IA
         ↓
P3  Student/Public rewired: cart to backend ✅; progress, attempts pending
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

### P0 step D4 — Learning domain — expand/migrate deployed; contract pending

Migration `2026_08_16_000010` is additive:

- creates `learning_progress` and backfills every row from `lesson_progress`
- adds `lessons.sort_order` and backfills it from `lessons.position`
- retains the legacy table, column, indexes, and relationships required by old application versions

The migration deployment keeps legacy storage authoritative. `LearningProgress` reads `lesson_progress` and mirrors every model save or delete to `learning_progress`. `Lesson` synchronises model writes across `position` and `sort_order`; bulk reorder writes both columns explicitly. Ordering and API payloads still read `position`, so an older application instance can keep writing during a rolling deployment without making current reads stale.

During this transition, do not use bulk `LearningProgress` query updates or deletes: Laravel bypasses model events for those operations, so the mirror would not be updated.

Before the later read cutover, drain old application instances and run a final catch-up backfill. Only after the new table and column have been authoritative through a verification window may a separate contract deployment drop `lesson_progress` and `lessons.position`. The temporary extra table is rollout compatibility infrastructure, not a change to the approved final 15-table ERD.

**Dev DB parity**

| Check | Before | After |
|---|---:|---:|
| Legacy progress rows | 1,268 | 1,268 |
| New progress rows | — | 1,268 |
| Lesson rows | 402 | 402 |
| Lesson ordering sum | 1,003 | 1,003 |
| Orphan progress → enrollment | — | 0 |
| Orphan progress → lesson | — | 0 |

**Verification:** `LearningProgressContractTest` was observed red against the destructive rename and green after the additive migration and dual-write compatibility were added. Delete mirroring was separately observed red before the `deleted` hook and green after it. The live MySQL migration and rollback both preserved 1,268 progress rows, 402 lessons, and an ordering sum of 1,003. Full backend suite: **90 passed, 458 assertions**. Pint passes on every D4-touched PHP file.

### P0 step D5 — Orders/Enrollments — safe expand/migrate deployed; contract blocked

Migration `2026_08_16_000011` adds nullable `orders.total_amount` and backfills it from `orders.amount`. `Order` keeps `amount` authoritative during the rolling transition and synchronises model writes in either field to both columns. Existing request routes and `OrderResource` output remain single-course and continue exposing `course_id` and `amount`.

After a successful gateway response, the paid Order update and Enrollment creation run in one database transaction. If Enrollment persistence fails, the Order does not remain paid without access.

`Enrollment` remains the Student-to-Course access owner. `enrollments.user_id` is retained and `order_id` stays nullable per `docs/adr/0001-keep-direct-enrollment-ownership.md`; no zero-amount Order is invented for an Administrator grant. Existing `expires_at` and `status` behavior is preserved, and no ERD snapshot columns are added.

**Dev DB parity**

| Check | Before | After |
|---|---:|---:|
| Orders | 634 | 634 |
| `amount` sum | 281,166,000.00 | 281,166,000.00 |
| `total_amount` sum | — | 281,166,000.00 |
| Amount mismatches | — | 0 |
| Enrollments | 635 | 635 |
| Administrator grants (`order_id IS NULL`) | 1 | 1 |
| Orphan enrollment orders | 0 | 0 |

**Deliberately not contracted:** `orders.amount` and `orders.course_id` remain. Failed Orders currently need `course_id` to retain purchase intent because no approved order-line table exists. Multi-course checkout and failed-order line-item persistence require a mentor decision before read cutover or contract; D5 does not invent either model.

During this transition, do not use bulk `Order` query updates for `amount` or `total_amount`: Laravel bypasses model events for bulk operations, so the paired column would not be updated.

**Verification:** `OrderEnrollmentContractTest` was observed red before the additive migration and dual-write model compatibility, then green. The payment atomicity test was separately observed red with a persisted paid Order after Enrollment failure, then green after the transaction boundary. The live MySQL migration and rollback both preserved 634 Orders, 635 Enrollments, one Administrator grant, and the total amount sum. After the Course Management milestone and Admin commerce read endpoints, full backend suite: **97 passed, 513 assertions**. Pint passes on every touched PHP file.

---

## Out of scope for this matrix

`reviews`, `news_posts`, `certificates`, `quiz_attempt_answers`, and the notification stub have no ERD table. They are tracked in `docs/ERD_FEATURE_GAPS.md` and are **not** rows here. All of them are preserved; none blocks the 15-table core.
