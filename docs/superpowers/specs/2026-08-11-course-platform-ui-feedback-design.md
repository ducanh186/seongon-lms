# Course Platform UI Feedback Implementation Design

Date: 2026-08-11
Status: Approved in conversation; pending written-spec review
Primary product specification: `SPEC/course_platform_ui_feedback_ai_spec.md`
Primary visual reference: `SPEC/seongon_learning_prototype_v3.html`

## Goal

Implement every requirement and acceptance criterion in the product specification without redesigning unrelated areas. Preserve the existing Laravel API, React/MUI application, payment mock, enrollment flow, learning flow, quiz flow, and certificate PDF generation.

The work must also fix the currently reproduced home-page failure. The frontend is configured to call `http://localhost:8001/api/v1`, while the native launcher starts Laravel on `127.0.0.1:8000`. The frontend and native runtime must use the same API origin.

## Locked Decisions

- Deliver all 15 acceptance criteria as one reviewed implementation, split into small testable steps.
- Implement Blog/News with persistent Laravel storage and real public/admin APIs.
- Store the cart in browser `localStorage`, scoped by authenticated user.
- Keep checkout single-course. Each cart item opens the existing checkout flow and is removed after successful payment.
- Show a student notification control with an explicit empty state. Do not invent a notification backend.
- Seed a fully completed demo enrollment and issued certificate for `student@seongon.vn`.
- Store Blog/News body content as plain text with line breaks, not arbitrary HTML.
- Use `Tin tức` in the Vietnamese UI, route it at `/news`, and label the admin section `Quản lý tin tức`.
- Migrations and additive seed operations may run against the local database. Never use `migrate:fresh` or delete existing user data.
- Validate the main desktop layouts at 1280 px and 1440 px widths.

## Architecture

### Runtime and API Configuration

The frontend API base URL will be aligned with the native launcher at `http://127.0.0.1:8000/api/v1`. The implementation must retain environment-based configuration, but the checked local `.env` and launcher defaults must agree.

The home page continues to load public categories and popular courses from the backend. A regression test must cover the configured URL, and live verification must prove that both requests return successfully and the error banner is absent.

### Blog/News Domain

Add one focused Laravel domain:

- `news_posts` table
- `NewsPost` model
- public controller/resource for published list and detail
- admin controller/resource for create, read, update, publish/hide, and delete
- public routes under `/api/v1/news`
- admin routes under `/api/v1/admin/news`

Fields:

- `id`
- `title`
- `slug`, unique
- `category`
- `excerpt`
- `content`, plain text
- `thumbnail`, nullable URL
- `status`: `draft` or `published`
- `published_at`, nullable
- timestamps

Public endpoints return only published posts. Admin endpoints require the existing `auth:sanctum` and `role:admin` middleware. Slugs are generated and kept unique by the backend. Validation rejects missing titles/categories/content and invalid statuses or thumbnail URLs.

The React application adds public news list/detail pages and an Admin News section. The interface follows the prototype's information hierarchy while using existing MUI tokens and components.

### Cart

Create a small frontend cart module with a typed storage adapter and React context. The storage key is scoped by user id so accounts on the same browser do not share carts.

The cart stores only stable course identifiers and the minimum display snapshot needed to render immediately. The cart page refreshes course data through the public API before checkout and removes unavailable or unpublished entries gracefully.

Flow:

1. Student adds a published course from its detail page.
2. Header cart badge reflects the number of unique items.
3. Cart page lists items and totals.
4. `Thanh toán` opens the existing `/checkout/:slug` route for one course.
5. Successful payment removes that course from the current user's cart and redirects to My Courses.

Admin and guest accounts do not receive student cart behavior. Guests are directed to login before student-only actions.

### Notification Control

Show a notification icon only for authenticated students. It opens a dropdown containing the explicit empty state `Bạn chưa có thông báo mới.` No persistence, unread counter, polling, or backend endpoint is added.

### Role-Aware Header

The desktop and mobile header use one role-aware navigation source.

- Guest: `Trang chủ`, `Khóa học`, `Tin tức`, search, login.
- Student: public links, notification, cart, avatar.
- Student avatar menu: `Hồ sơ`, `Khóa học của tôi`, logout.
- Admin: public links plus `Quản trị`, avatar, logout.
- Admin never sees `Khóa học của tôi`, notification, or cart.
- Student never sees a standalone `Khóa học của tôi` primary-navigation button.

### Admin Student Information

Extend the existing admin user response with `enrollments_count` using an aggregate query rather than per-row queries. The table follows the prototype and shows:

- student name/avatar
- email
- phone
- enrolled course count
- account creation date
- status
- lock/unlock action

Existing search and status filtering remain available. Existing information is not removed.

### Admin Course Management

The course page prioritizes the list. The creation/edit form is collapsed behind an explicit `Tạo khóa học mới` action and opens only when creating or editing.

The table columns follow the prototype as closely as the current backend contract supports:

- course
- category
- level
- price
- lesson count
- question count when available
- enrollment count when available
- status
- actions

Backend admin course resources and queries will expose missing aggregate counts without N+1 queries. Header and body cells are generated from the same column definition. The table uses stable widths, wrapping for titles, compact actions, and intentional overflow only below the supported desktop width. At 1280 px and 1440 px, important columns must not be accidentally clipped and the Actions header must align with its cells.

Search and status controls retain the existing `Áp dụng` behavior. Search submission, status filtering, pagination, create/edit, content management, publish/hide, and delete behavior remain intact.

### My Courses

The summary section becomes a contained white card with clear spacing and boundaries. Each statistic uses vertical order:

1. label
2. numeric value

The filter order and initial selection become:

1. `Tất cả`
2. `Đang học`
3. `Đã hoàn thành`

Filtering semantics remain unchanged. `Khám phá thêm` uses the existing primary-button treatment rather than an outlined low-contrast style.

Completed cards visibly expose the certificate path. A completed enrollment with a certificate provides a direct `Tải chứng chỉ` action; incomplete courses retain the existing continue-learning behavior.

### Demo Data and Certificate Flow

Add an idempotent additive seeding path for `student@seongon.vn`:

- retain all current courses and enrollments
- select or create one published demo course with lessons and a quiz
- create an active enrollment if missing
- mark every lesson complete
- create a passing quiz attempt consistent with the quiz contract
- issue a certificate through `CertificateService`

The result must support:

`Student -> Khóa học của tôi -> Đã hoàn thành -> Completed Demo Course -> Tải chứng chỉ`

Repeated seeding must not duplicate the enrollment, progress rows, attempt, or certificate.

## Error Handling

- Public home and news pages use the existing loading, empty, retry, and request-error patterns.
- Cart storage parsing tolerates invalid or stale JSON and falls back to an empty cart.
- Cart items whose courses are no longer available are removed with an explanatory message.
- News admin mutations use the existing confirmation and success/error feedback patterns.
- Certificate download reports the existing API error when no certificate exists.
- Runtime configuration errors must be diagnosable from the requested API URL; no silent mock fallback is introduced.

## Testing and Verification

### Frontend Automated Tests

- API base URL regression and public home requests
- header variants for guest, student, and admin
- student avatar menu, notification empty state, and cart badge
- cart user scoping, duplicate prevention, stale storage recovery, and checkout removal
- public news list/detail and admin news management behavior
- student information columns
- course table header/body parity and required columns
- My Courses statistic order, filter order, default filter, CTA style, and completed certificate action

### Backend Automated Tests

- public News list/detail exposes only published posts
- admin News CRUD authorization and validation
- admin users include enrollment counts without changing existing fields
- admin course aggregate fields required by the table
- additive completed-demo seeding is idempotent
- seeded certificate downloads as a PDF for the demo student

### Live Verification

1. Start MySQL, Laravel on `127.0.0.1:8000`, and Vite on `127.0.0.1:5173` with the native launcher.
2. Verify `/up`, `/api/v1/categories`, `/api/v1/courses?sort=popular`, and public News endpoints.
3. Confirm the home page renders categories and popular courses without `Không thể tải nội dung trang chủ.`
4. Test guest, student, and admin header behavior.
5. Test Cart -> Checkout -> My Courses with the mock payment flow.
6. Test Admin student, course, and News pages.
7. Test the completed demo course and download the certificate PDF.
8. Inspect desktop UI at 1280 px and 1440 px for clipping, header spacing, white-section boundaries, and horizontal overflow.

## Scope Boundaries

- No notification backend.
- No multi-course order or payment schema.
- No rich-text/HTML editor.
- No unrelated visual redesign.
- No replacement of the existing authentication, payment, enrollment, quiz, or certificate architecture.
- No destructive database reset.
- No commit or push without explicit user instruction.

## Completion Criteria

Completion requires all 15 acceptance criteria in `SPEC/course_platform_ui_feedback_ai_spec.md`, passing focused frontend/backend tests, successful production builds, successful additive migration/seeding, and live browser evidence that the reproduced home-page error is gone.
