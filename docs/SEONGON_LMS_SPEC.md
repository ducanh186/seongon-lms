# SEONGON LMS — Product Specification and Reference Flow

## 1. Document control

| Item | Value |
|---|---|
| Product | SEONGON Learning / SEONGON LMS |
| Purpose | Single product specification for implementation, review, testing, and future ERD alignment |
| Language | Vietnamese |
| Status | Working specification; database mapping remains `ERD_PENDING` |
| Original business source | `SPEC/draft (1).docx` from Git revision `1c9a971^` |
| Original interaction source | `SPEC/seongon_learning_prototype_v3.html` from Git revision `1c9a971^` |
| Normalized on | 2026-08-13 |

### 1.1 Source precedence

1. The DOCX is authoritative for actors, product scope, functional requirements, use cases, and business intent.
2. The prototype is authoritative only for reference screen flow, navigation, interaction, validation, and visible states.
3. Prototype-only data, credentials, `localStorage`, fake chart series, simulated downloads, and simulated payment are not production requirements.
4. The approved customer ERD, when received, will be authoritative for tables, fields, PK/FK, constraints, and relationships.
5. If the sources conflict, preserve the DOCX business requirement and record the prototype difference for clarification; do not silently invent behavior.

## 2. Product objective and scope

SEONGON LMS is a web platform for publishing Search Marketing courses, allowing visitors to discover courses, students to purchase and complete learning paths, and administrators to manage learning content and operations.

The platform covers:

- Public course discovery and news.
- Registration, authentication, profile, and role-based access.
- Student cart, checkout, enrollment, learning progress, final quiz, review, and certificate.
- Admin management for students, categories, courses, lessons, quizzes, reviews, news, and dashboard metrics.
- A repository/API boundary so UI behavior can be remapped safely after the final ERD is approved.

## 3. Actors and permissions

### 3.1 Guest

A Guest can:

- View the home page.
- Browse published courses.
- Search and filter courses.
- View published course details and reviews.
- View published news and news details.
- Register a Student account.
- Log in.

A Guest cannot access cart, checkout, My Courses, learning, quiz, certificate, review submission, profile, or Admin functions.

### 3.2 Student

A Student can:

- Log in and log out.
- View and update profile information.
- Change password.
- Use all Guest discovery functions.
- Add available courses to a personal cart.
- Checkout one or more eligible courses according to the implemented payment contract.
- View enrolled courses and progress.
- Open lessons in course order and mark lessons complete.
- Take the final quiz after completing all lessons.
- View quiz results and retry when allowed.
- Submit or update one review per enrolled course.
- View and download a certificate after meeting completion conditions.

A Student cannot access Admin routes or Admin data operations.

### 3.3 Administrator

An Administrator can:

- Log in and log out.
- Access the Admin Portal and view the public site.
- View dashboard metrics.
- Search, view, lock, and unlock Student accounts.
- Create, update, and delete categories subject to usage constraints.
- Create, update, publish, hide, and delete courses.
- Create, update, delete, and reorder lessons inside a course.
- Configure quizzes, pass score, attempt limit, questions, options, and correct answers.
- View, hide/show, and delete reviews.
- Create, update, publish/unpublish, filter, and delete news posts.

An Administrator cannot use Student-only cart, checkout, My Courses, learning, quiz, review submission, or certificate flows.

## 4. Functional requirements

### 4.1 Authentication and account

#### FR-AUTH-01 — Register Student

- Required fields: full name, email, phone, password, password confirmation.
- Email must have a valid format and be unique.
- Phone must have an accepted Vietnamese phone format.
- Password must contain at least 8 characters.
- Password confirmation must match.
- A successful registration creates an active Student account and directs the user to login.

#### FR-AUTH-02 — Login

- The system authenticates by email and password.
- Invalid credentials show a clear error without revealing which field is wrong.
- A locked account cannot log in.
- Successful Student login goes to My Courses.
- Successful Admin login goes to the Admin dashboard.

#### FR-AUTH-03 — Logout

- Logout invalidates the authenticated session/token.
- The user returns to the public flow.

#### FR-AUTH-04 — Profile and password

- Authenticated users can view their profile.
- Supported profile fields are name, phone, and avatar according to the active API contract.
- Password change requires current-password verification and valid new-password confirmation.

### 4.2 Public catalog

#### FR-CAT-01 — Home

- Show the SEONGON Learning value proposition.
- Show course categories with published-course counts.
- Show popular or featured published courses.
- Show published news highlights.
- Provide clear calls to browse courses and register.

#### FR-CAT-02 — Course listing

- Only published courses are visible to Guest and Student users.
- Support keyword search by course title.
- Support category, level, and price filtering when those filters are available in the active contract.
- Support pagination for server-paginated results.
- Show loading, empty, error, and retry states.

#### FR-CAT-03 — Course detail

- Show title, description, category, level, thumbnail, instructor, price, duration, outcomes, audience, lesson outline, and visible reviews when provided.
- A missing course shows a not-found state.
- An unpublished or hidden course is not visible publicly.
- CTA depends on role and enrollment/cart state.

### 4.3 Cart, order, payment, and enrollment

#### FR-CART-01 — Add to cart

- Only an authenticated Student can add a course.
- The course must exist and be published.
- An already enrolled course cannot be added.
- A course already present in the same Student's cart is not duplicated.
- Cart data is isolated by authenticated Student identity.

#### FR-CART-02 — Reconcile cart

- On cart load, each item is reconciled with the authoritative course source.
- A confirmed unavailable course can be removed with an explanation.
- A transient API error must not silently delete the item.
- Price and availability used for checkout come from the authoritative source, not stale browser data.

#### FR-CART-03 — Checkout and payment

- Checkout summarizes the selected course/order and payment method.
- The order is created before payment is confirmed.
- Successful payment creates or activates the Enrollment and removes only the paid cart item(s).
- Failed payment preserves the cart and does not create a successful enrollment.
- After success, navigate to My Courses or the success destination defined by the active product flow.

#### FR-ENR-01 — Enrollment

- An Enrollment connects one Student to one Course.
- Duplicate active enrollment for the same Student/Course is not allowed.
- A new enrollment starts with zero completed lessons.
- Enrollment date and access expiry are displayed when available.

### 4.4 My Courses and learning

#### FR-LEARN-01 — My Courses

- Show all courses enrolled by the current Student.
- Default grouping/filter order: In progress, Completed, All, unless a later approved design changes it.
- Show total, in-progress, and completed counts from the complete server summary, not only the current page.
- Each card shows course identity, lesson progress, percentage, access expiry, status, and eligible CTA.
- Expired enrollment blocks learning, quiz, review, and certificate CTA.

#### FR-LEARN-02 — Lesson access

- Only an enrolled, non-expired Student can open a lesson.
- When no lesson is specified, open the first incomplete lesson; if all are complete, open the first lesson.
- Show previous/next lesson navigation and the course lesson list.
- Marking a lesson complete is idempotent.
- After completion, advance to the next lesson when one exists.

#### FR-LEARN-03 — Progress

- Progress percentage is `completed lesson count / total lesson count * 100`.
- Re-completing a lesson does not increase the count twice.
- At 100%, the Student becomes eligible to start the final quiz.

### 4.5 Quiz and result

#### FR-QUIZ-01 — Quiz eligibility

- The Student must be enrolled and have completed 100% of lessons.
- The quiz must be published/available according to the active API contract.
- The maximum number of attempts must be enforced when configured.

#### FR-QUIZ-02 — Quiz submission

- All required questions must be answered before submission.
- Score is calculated from correct answers as a percentage.
- Passed means `score >= pass_score`.
- Persist attempt number, score, correct count, wrong count, passed status, and submitted time when supported by the final model.

#### FR-QUIZ-03 — Result

- Show score, correct/total answers, pass score, and Passed/Not Passed state immediately after submission.
- A failed Student can review lessons and retry when attempts remain.
- A passed Student can continue to certificate and review.

### 4.6 Certificate

#### FR-CERT-01 — Eligibility

A Student is eligible only when:

- Enrollment is valid and not expired.
- Course progress is 100%.
- At least one final quiz attempt has passed.

#### FR-CERT-02 — Issue and download

- Certificate issuance is idempotent for one Student/Course enrollment.
- Certificate contains a unique code and issue date.
- Download returns a valid PDF response.
- Missing or ineligible certificate shows an explicit error and does not trigger a fake download.

### 4.7 Review

#### FR-REV-01 — Submit or update review

- Only an enrolled Student can review the course.
- Rating uses a 1–5 scale.
- Comment is required unless the approved business rule says otherwise.
- One Student/Course pair has one logical review; a later submission updates it instead of duplicating it.

#### FR-REV-02 — Public visibility and moderation

- Only visible reviews appear publicly.
- Admin can filter, hide/show, and delete reviews.
- Deletion requires confirmation.

### 4.8 News

#### FR-NEWS-01 — Public news

- List only published posts.
- Support category filtering and pagination.
- Changing category resets pagination to page 1.
- Detail pages resolve by stable slug.

#### FR-NEWS-02 — Admin news management

- Support draft and published status.
- Support search and status filters.
- Create/update editor closes and resets only after a successful save.
- Published-to-published editing preserves the original publication timestamp.
- Moving to draft removes the post from public results.
- Delete requires confirmation.

### 4.9 Admin management

#### FR-ADM-01 — Dashboard

- Show Student count, Course count, Enrollment count, completion rate, revenue, monthly enrollment trend, and popular courses when accurately supported.
- Any metric whose final business definition depends on the pending ERD remains labeled `DEMO / ERD_PENDING`.
- Dashboard loads through service/repository boundaries and does not pre-load unrelated Admin tabs.

#### FR-ADM-02 — Students

- List name, email, phone, enrolled-course count, creation date, status, and actions.
- Support search and status filter with an explicit Apply action.
- Locking blocks future login.
- Unlocking restores active status.
- DOCX mentions lock reason and audit history; these remain pending unless supported by the approved ERD/API.

#### FR-ADM-03 — Categories

- Name is required and unique.
- Create and update category data.
- Renaming must not orphan related courses.
- A category in use cannot be deleted unless an approved reassignment/deletion rule exists.

#### FR-ADM-04 — Courses and content

- Course management is list-first with search, status filters, pagination, and actions.
- New courses start as Draft.
- Create/update fields include title, description, category, thumbnail, level, instructor, price, duration, outcomes, and audience when supported.
- Course detail management owns lessons and quiz content.
- Lesson ordering is stable and persisted.
- A course with enrollments cannot be hard-deleted unless the approved business rule allows it; hiding is the safe alternative.
- Publishing requires valid basic information, at least one lesson, a configured quiz, sufficient questions, and a correct answer for every question according to the approved validation contract.

#### FR-ADM-05 — ERD-pending entities

- Enrollment, Quiz Attempt, and Certificate have dedicated navigation placeholders.
- Until their final contract exists, show exactly:
  - `Chức năng đang chờ đối chiếu ERD chính thức.`
  - `Dữ liệu hiện tại chỉ phục vụ prototype.`
- Do not fabricate fields, tables, endpoints, or CRUD behavior.

## 5. Reference screen and route map

The prototype uses hash routes; the production product may use browser routes. Route semantics, not the hash implementation, are the reference.

| Reference route | Screen | Access |
|---|---|---|
| `/` | Home | Public |
| `/courses` | Course catalog | Public |
| `/course/:id-or-slug` | Course detail | Public for published courses |
| `/login` | Login | Public |
| `/register` | Registration | Public |
| `/news` or prototype `/blog` | News list | Public |
| `/news/:slug` or prototype `/blog-detail/:id` | News detail | Public |
| `/cart` | Student cart | Student |
| `/checkout/:course` | Checkout | Student |
| `/my-courses` | My Courses | Student |
| `/learn/:course/:lesson?` | Learning workspace | Student with valid enrollment |
| `/quiz/:course` | Final quiz | Eligible Student |
| `/certificate/:course` | Certificate | Eligible Student |
| `/review/:course` | Review form | Enrolled Student |
| `/profile` | Profile | Authenticated user subject to role UI |
| `/admin` | Admin dashboard | Admin |
| Admin sections | Students, Categories, Courses, Reviews, News, ERD placeholders | Admin |

## 6. Reference flow logic from prototype

### 6.1 Global route guard

```text
Open route
  -> Is it Student-protected?
     -> No session: show warning -> Login
  -> Is it Admin route?
     -> Role is not Admin: show permission error -> Home
  -> Resolve screen
  -> Unknown route: Home/not-found behavior
```

Role protection must also be enforced by the backend; hiding a menu is not authorization.

### 6.2 Registration and login

```text
Register
  -> Validate name/email/phone/password/confirmation
  -> Reject invalid or duplicate email
  -> Create active Student
  -> Show success
  -> Login

Login
  -> Validate credentials
  -> Reject invalid credentials
  -> Reject locked account
  -> Establish session
  -> Admin -> Admin dashboard
  -> Student -> My Courses
```

### 6.3 Course discovery

```text
Home category/course CTA
  -> Catalog
  -> Apply keyword/category/level/price filters
  -> Empty result or course cards
  -> Course detail
  -> CTA derived from Guest/Student/Admin + enrollment + cart + availability
```

### 6.4 Purchase and enrollment

```text
Student selects available course
  -> Already enrolled? -> Open learning
  -> Already in cart? -> Open cart
  -> Otherwise add once
  -> Cart reconciles authoritative course data
  -> Create order
  -> Pay order
  -> Payment success?
     -> Yes: create enrollment -> remove paid item -> My Courses
     -> No: retain item/order error state -> stay in checkout
```

The prototype simulates payment by immediately creating enrollments. Production must use the backend order/payment contract.

### 6.5 Learning, quiz, certificate, and review

```text
My Courses
  -> Select enrolled course
  -> Open first incomplete lesson
  -> Mark lesson complete (idempotent)
  -> More lessons? -> Next lesson
  -> 100% complete -> Final quiz available
  -> Answer all questions -> Submit
  -> Calculate score and persist attempt
  -> Failed -> Review lessons / retry if allowed
  -> Passed -> Issue/view certificate + submit/update review
```

### 6.6 Admin course publishing

```text
Admin opens Course management
  -> Create/edit Draft
  -> Save basic information
  -> Add/reorder lessons
  -> Configure quiz/pass score/attempts
  -> Add questions/options/correct answers
  -> Validate publishing readiness
  -> Invalid: show first/all missing requirements; remain Draft
  -> Valid: Publish
  -> Public catalog includes course
  -> Hide: public catalog excludes course; existing data is retained
```

### 6.7 Admin news lifecycle

```text
Create Draft
  -> Save
  -> Publish
  -> Visible on public News
  -> Edit while published (preserve published_at)
  -> Move to Draft
  -> Absent from public News
  -> Confirm Delete
  -> Removed from Admin list
```

## 7. UI and interaction requirements

### 7.1 Header

- Public header contains logo, Home, Courses, News, search where designed, and role-derived account controls.
- Course/product mega menus open on `mouseenter`/hover, not click, on desktop.
- Opening animation: fade-in plus slide-down in 150–250 ms.
- Moving from trigger into the menu keeps it open.
- Leaving both trigger and menu closes after a 150–300 ms delay.
- Student account menu contains My Courses; Student header exposes notification and cart where required.
- Admin public header does not expose Student cart/My Courses/notification.
- Admin Portal provides `Xem site public` and `Đăng xuất`.

### 7.2 Common states

Every data screen must support applicable states:

- Loading or skeleton.
- Content.
- Empty.
- Validation error.
- Request error with retry where safe.
- Mutation success notice.
- Confirmation before destructive action.

### 7.3 Admin presentation shell

The reusable Admin entity shell supports:

- Page title and description.
- Search/filter area.
- Table/content region.
- Pagination.
- Row actions.
- Loading, empty, error, and `ERD_PENDING` placeholder states.

## 8. Conceptual domain model — ERD_PENDING

This table lists only domain objects proven by the DOCX, prototype, or current product. It is not the final database schema.

| Domain object | Business purpose | Final table/PK/FK/relationships | Admin screen | Status |
|---|---|---|---|---|
| User | Authentication, role, status, profile | TBD from approved ERD | Students | `ERD_PENDING` |
| Category | Classifies courses | TBD | Categories | `ERD_PENDING` |
| Course | Sellable/learnable course | TBD | Courses | `ERD_PENDING` |
| Lesson | Ordered course learning unit | TBD | Inside Course / placeholder | `ERD_PENDING` |
| Enrollment | Student access to a Course | TBD | Enrollment placeholder | `ERD_PENDING` |
| Lesson Progress | Completion state per lesson/enrollment | TBD | Learning/Admin TBD | `ERD_PENDING` |
| Cart Item | Student's pending course selection | TBD; currently browser-backed per user | No dedicated Admin screen | `ERD_PENDING` |
| Order | Purchase intent and total | TBD | Admin TBD | `ERD_PENDING` |
| Payment | Order payment result/method | TBD | Admin TBD | `ERD_PENDING` |
| Quiz | Final assessment configuration | TBD | Inside Course / placeholder | `ERD_PENDING` |
| Question | Quiz prompt | TBD | Inside Course | `ERD_PENDING` |
| Answer Option | Selectable/correct answer | TBD | Inside Course | `ERD_PENDING` |
| Quiz Attempt | Student submission/result | TBD | Result placeholder | `ERD_PENDING` |
| Certificate | Completion proof | TBD | Certificate placeholder | `ERD_PENDING` |
| Review | Student rating/comment and moderation state | TBD | Reviews | `ERD_PENDING` |
| News Post | Public editorial content | TBD | News | `ERD_PENDING` |

Conceptual relationships requiring ERD confirmation:

- User has many Enrollments; Course has many Enrollments.
- Course belongs to Category and has ordered Lessons.
- Enrollment has Lesson Progress records.
- Course has one or more Quiz definitions according to the approved model.
- Quiz has Questions; Question has Answer Options.
- User/Course/Enrollment relates to Quiz Attempts, Reviews, and Certificates.
- User has Cart Items and Orders; Order has one or more course/order items according to the approved payment model.

## 9. Architecture and persistence constraints

### 9.1 Required direction

```text
Approved Customer ERD
  -> Entity registry and mapping
  -> Database migrations/models
  -> Repository/API contracts
  -> Application services
  -> Admin/Public/Student UI
```

### 9.2 Current implementation seam

- Business UI accesses data through `applicationRepositories` or `adminRepositories`.
- Dashboard accesses metrics through `DashboardService`.
- Browser persistence is isolated behind `LocalStorageAdapter`.
- The current production source is Laravel JSON API + MySQL; the prototype's monolithic `STATE` is not production architecture.
- `ApiAdapter.placeholder` must not receive invented endpoint URLs before contract approval.

### 9.3 Security and integrity

- Backend enforces role authorization for every protected operation.
- Passwords are hashed and never returned in API payloads.
- Validate and authorize all mutation inputs server-side.
- Prevent duplicate enrollment, duplicate cart items, duplicate certificate issuance, and duplicate logical reviews.
- Destructive Admin actions require confirmation and must preserve referential integrity.
- Do not use `migrate:fresh` for routine development or deployment maintenance.

## 10. Non-functional requirements

The DOCX does not define numeric production SLAs. Until approved, the product must at minimum:

- Avoid loading unrelated Admin resources on dashboard entry.
- Cache already loaded Admin tab data when safe and invalidate after mutations.
- Paginate large server collections.
- Avoid N+1 database queries for aggregate/list screens.
- Expose accessible labels, keyboard-focusable controls, and semantic loading/error states.
- Keep Vietnamese copy readable and consistent.
- Support the approved desktop experience; mobile support remains outside this normalized source unless separately re-approved.
- Avoid fake success, fake downloads, fake payment, or fake persisted data in production.

## 11. Acceptance checklist

### 11.1 Guest

- [ ] Home loads categories, popular courses, and news without retry banner.
- [ ] Course search/filter/pagination works.
- [ ] Course detail shows only published content.
- [ ] Registration validates all fields.
- [ ] Invalid and locked login are rejected.

### 11.2 Student

- [ ] Student login routes to My Courses.
- [ ] Student-only header/account controls are present; Admin controls are absent.
- [ ] Cart is isolated, deduplicated, and reconciled.
- [ ] Successful checkout enrolls only paid courses and removes only paid cart items.
- [ ] Failed checkout preserves cart and does not enroll.
- [ ] My Courses summary and pagination use global totals.
- [ ] Lesson access and idempotent completion work.
- [ ] Quiz is blocked before 100% progress.
- [ ] Quiz score/pass/retry behavior works.
- [ ] Certificate eligibility and PDF download work.
- [ ] Review create/update works and public visibility follows moderation.

### 11.3 Admin

- [ ] Admin login routes to dashboard.
- [ ] Student-only cart/My Courses/notification controls are absent.
- [ ] Dashboard loads only its metrics and labels pending metrics.
- [ ] Student search/filter/status actions work.
- [ ] Category create/update/delete constraints work.
- [ ] Course create/edit/content/reorder/publish/hide/delete constraints work.
- [ ] Review filter/moderation/delete works.
- [ ] News draft/publish/edit/unpublish/delete lifecycle works publicly.
- [ ] Enrollment/Result/Certificate placeholders do not fabricate schema.
- [ ] `Xem site public` and `Đăng xuất` work.

### 11.4 Architecture and ERD

- [ ] No production business UI directly manipulates `localStorage`.
- [ ] No production business UI calls the low-level API client directly.
- [ ] No final table, PK, FK, constraint, or endpoint is invented before ERD approval.
- [ ] All `ERD_PENDING` locations are searchable.
- [ ] Final ERD entities map to navigation and Admin screens.
- [ ] Migrations, models, resources, validation, and repositories match the approved ERD.
- [ ] Seed data respects unique constraints and is idempotent.
- [ ] ERD, database, API, Admin, and Student UI are verified as one consistent system.

## 12. Open decisions requiring approval

- Final ERD entity names, tables, PK/FK, cardinalities, and constraints.
- Whether Cart Item is persisted server-side or intentionally remains per-user browser state.
- Whether Order supports one course or multiple order items.
- Payment gateway, payment lifecycle, refund, and cancellation rules.
- Enrollment expiry, renewal, and revocation rules.
- Quiz attempt-limit reset and question randomization rules.
- Certificate revocation/reissue rules and final document template.
- Required lock reason and Admin audit-history model.
- Final dashboard definitions for revenue and completion rate.
- Whether mobile support is permanently excluded or deferred.

## Appendix A — Prototype-only details not promoted to production requirements

- Storage key `seongon_learning_state_v1` and monolithic browser `STATE`.
- Demo credentials and plaintext prototype passwords.
- Fake monthly dashboard chart values.
- Immediate simulated checkout without a real payment gateway.
- Simulated learning-material download toast.
- Hash-router implementation details.
- Hard-coded seeded course/student/review/news records.

These are useful for understanding the original interaction demo only.
