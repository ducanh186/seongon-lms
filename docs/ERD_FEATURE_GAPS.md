# ERD Feature Gaps

Features that exist in the current implementation but have **no table** in the final approved ERD (15 tables).

Per brief §23: do not add tables for them, do not silently delete them. Keep the working UI, but do not present it as part of the approved database model.

- **ERD source:** `docs/ERD_P1.png` (approved, tracked in Git).
- **Approved table set:** Roles, Users, Carts, Cart_items, Orders, Categories, Course_categories, Courses, Enrollments, Exams, Questions, Answers, Learning_progress, Attempts, Lessons.
- **None of the gaps below blocks the 15-table core implementation.** They are isolated from P0 by decision.

---

## 1. Reviews (rating + comment + moderation)

| | |
|---|---|
| **Feature** | Student rates and comments on an enrolled course; Admin filters, hides/shows, deletes. Spec FR-REV-01, FR-REV-02. |
| **Current implementation** | `Review` model; `Api\Student\ReviewController@store`, `Api\Admin\ReviewController@{index,updateStatus,destroy}`; `ReviewResource`. |
| **Current UI** | Public: `CoursePage.tsx` lists visible reviews. Student: `LearnCoursePage.tsx:115` submits rating + comment. Admin: reviews management screen. |
| **Current storage** | Existing table `reviews` — `user_id`, `course_id`, `rating`, `comment?`, `status[visible,hidden]`, `UNIQUE(user_id, course_id)`. |
| **Final ERD representation** | **Partial only.** `Enrollments.rating` holds a numeric rating. No column for `comment`, no moderation `status`, no per-review row identity. |
| **Decision** | **RESOLVED — keep the feature as-is.** Comment is real, shipped UI and is not dropped. No rating-only downgrade. No new `Reviews` table is created; the existing `reviews` table is preserved as an out-of-ERD auxiliary. The **final persistence model for `comment` is unresolved by the ERD and is deliberately deferred** — it is isolated so it cannot block P0 core schema work. |

---

## 2. News / Blog

| | |
|---|---|
| **Feature** | Public news list + detail by slug; Admin draft/publish/unpublish/delete lifecycle. Spec FR-NEWS-01, FR-NEWS-02. |
| **Current implementation** | `NewsPost` model; `Api\NewsController@{index,show}`; `Api\Admin\NewsController` (full `apiResource`); `NewsPostResource`. |
| **Current UI** | Public: `NewsPage.tsx`, `NewsDetailPage.tsx`, news highlights on Home. Admin: news management with search + status filter. |
| **Current storage** | Existing table `news_posts` — `title`, `slug U`, `category`, `excerpt`, `content`, `thumbnail`, `status[draft,published]`, `published_at?`. |
| **Final ERD representation** | **None.** No news/blog/post/article table in the ERD. |
| **Decision** | **RESOLVED — IN SCOPE, not removed.** Customer transcript requires both Public News and Admin Blog/News Management. Existing prototype functionality is preserved. No 16th table is created; the existing `news_posts` table is preserved as an out-of-ERD auxiliary and stays an ERD_GAP. |

---

## 3. Certificate

| | |
|---|---|
| **Feature** | Certificate available after course completion; PDF download. Spec FR-CERT-01, FR-CERT-02. |
| **Current implementation** | `Certificate` model; `CertificateService`; `Api\Student\CertificateController@download`; dompdf (`barryvdh/laravel-dompdf`). |
| **Current UI** | Student: certificate download from the learning flow. Admin: `certificates` section in `adminNavigation.ts`; certificate count on `AdminOverview.tsx:62`. |
| **Current storage** | Existing table `certificates` — `enrollment_id`, `certificate_code U`, `issued_at`, `pdf_path?`. |
| **Final ERD representation** | **None as a table.** `Enrollments.certificate_code` is drawn on the diagram. |
| **Decision** | **RESOLVED — certificate is a derived feature.** Eligibility is computed, not stored as its own entity: `Learning_progress` fully completed **+** a passing `Attempt` ⇒ certificate can be generated. No `Certificates` table is created. The existing certificate demo flow is preserved. |

---

## 4. Quiz attempt answers (per-question detail)

| | |
|---|---|
| **Feature** | Show correct/incorrect **per question**, and re-open a past attempt. Spec FR-QUIZ-02, FR-QUIZ-03. |
| **Current implementation** | `QuizAttemptAnswer` model; written by `QuizGradingService`. |
| **Current UI** | Attempt result rendering in the student quiz flow. |
| **Current storage** | Existing table `quiz_attempt_answers` — `quiz_attempt_id`, `question_id`, `selected_option_id?`, `is_correct`. |
| **Final ERD representation** | **None.** ERD `Attempts` stores aggregates only: `score`, `correct_count`, `wrong_count`, `attempt_number`, `submitted_at`. |
| **Decision** | **RESOLVED — requirement stands, `Attempts` becomes the aggregate root for one exam sitting.** No 16th table. Inspection result: the current `quiz_attempts` table has **no** payload/JSON column that could carry the selected answers (`id`, `enrollment_id`, `quiz_id`, `score`, `passed`, `attempt_no`, `submitted_at`, timestamps). A minimal column addition is therefore required — see **Pending column change** below. It is reported, **not applied**. |

### Approved column change

```
Table:  attempts   (ERD name; currently quiz_attempts)
Add:    answers    JSON  NULL
Shape:  [
          {
            "question_id":        int,
            "selected_answer_id": int|null,
            "is_correct":         bool
          }
        ]
```

**Status: DONE in P0 step D3.** One column, no new table. `quiz_attempt_answers` held 1 row on the dev database; it was folded into `attempts.answers` and the table was dropped after the fold verified.

`ExamGradingService` writes the column directly, and `QuizAttemptResource` maps `selected_answer_id` back to the legacy `selected_option_id` field name so the HTTP payload is unchanged.

---

## 5. Notifications

| | |
|---|---|
| **Feature** | Notification bell in the student header. Spec §7.1 lists it as a Student-only header control; requested by the customer. |
| **Current implementation** | None — no model, no endpoint, no table. |
| **Current UI** | `components/NotificationMenu.tsx` — static stub rendering one disabled item: `Bạn chưa có thông báo mới.` |
| **Current storage** | None. |
| **Final ERD representation** | **None.** |
| **Decision** | **RESOLVED — feature is wanted, stays an ERD_GAP.** No `Notifications` table in P0. The existing stub is preserved as presentation-only. |

---

## 6. Enrollment access expiry and lifecycle status

| | |
|---|---|
| **Feature** | Enrollment access expiry; an expired enrollment blocks learning, quiz, review, and certificate. Spec FR-ENR-01, FR-LEARN-01, FR-CERT-01. |
| **Current implementation** | `EnrollmentService`, `Support\InteractsWithEnrollment` guards. |
| **Current UI** | `MyCoursesPage.tsx` shows expiry and disables CTA when expired. |
| **Current storage** | `enrollments.enrolled_at`, `expires_at`, `status[active,expired]`. |
| **Final ERD representation** | **No columns.** ERD `Enrollments` has `created_at` but no `expires_at` and no `status`. |
| **Decision** | **RESOLVED — expiration is NOT implemented in this phase.** No 1-year expiry rule is encoded. **Documented conflict:** the older written material states one-year access, while the current prototype behaves as unlimited access. This contradiction is unresolved and must not be silently decided in either direction. |

---

## Deliberate deviations from the ERD diagram

Instructed exceptions where we do **not** follow a column drawn on `ERD_P1.png`. Recorded so they stay traceable.

| ERD-drawn column | Decision | Reason |
|---|---|---|
| `Enrollments.title` | **Not created** | No snapshot data on Enrollment. Resolve live via `Enrollment → Course.title`. |
| `Enrollments.pass_score` | **Not created** | Resolve live via `Enrollment → Course → Exam.pass_score`. |
| `Enrollments.max_attempts` | **Not created** | Resolve live via `Exam.max_attempts`. |
| `Enrollments.total_questions` | **Not created** | Resolve live by counting `Questions` for the exam. |
| `Enrollments.duration_minutes` | **Not created** | Resolve live via `Exam.duration_minutes`. |
| `Enrollments.certificate_code` | **Deferred** | Certificate is derived (gap 3); not part of P0. |
| `Enrollments.rating` | **Deferred** | Review persistence is deferred and isolated (gap 1); not part of P0. |
| `Attempts` has no exam FK | **Kept as `exam_id`** | ERD draws Attempts with only `enrollment_id`, but `QuizAttemptResource` publishes `quiz_id` and `ExamGradingService` counts attempts per exam. Dropping it would break the API while code still depends on it. Renamed `quiz_id` → `exam_id` in D3; revisit at contract time. |
| `Attempts.passed` | **Kept** | Derivable from `score >= pass_score`, but both the API payload and the certificate flow read it. |

Rationale: denormalised snapshots would fork the truth between `Enrollments` and `Courses`/`Exams` with no defined recompute rule. Resolving live keeps a single source per fact.

---

## Resolved structural decision — Enrollment → User

**Resolved on 2026-08-16.** `Enrollment` belongs directly to `User`. Keep `enrollments.user_id`; keep `order_id` nullable so an Administrator can grant course access without inventing a zero-amount `Order`.

This is a deliberate column-level deviation from the ERD's visible `Users → Orders → Enrollments` path. It preserves the database-level `UNIQUE(user_id, course_id)` duplicate-enrollment guard and makes `Order` optional purchase provenance rather than the owner of student access.

**Cart/Checkout runtime decision (2026-08-16):** authenticated Cart state is authoritative in `carts`/`cart_items`. A Cart may hold many Courses, but checkout creates one `Order` per Course because the approved ERD has no `order_items`. A failed payment keeps its single-Course `Order` plus the matching `CartItem`; a successful payment creates/reactivates `Enrollment` and removes only that purchased `CartItem` in the same transaction. Checkout reuses the oldest pending/failed Order for that Student/Course, stores a server-generated stable payment idempotency key in the existing `orders.transaction_ref`, and rejects legacy duplicate pending Orders before charging.

The remaining contract question is whether `orders.course_id` can ever be removed. It cannot be contracted while the approved ERD has no order-line table and failed Orders must retain their intended Course.
