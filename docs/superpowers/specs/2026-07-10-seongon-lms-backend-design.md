# SEONGON LMS — Backend / System Design Spec

- **Ngày:** 2026-07-10
- **Trạng thái:** Draft (chờ review)
- **Phạm vi tài liệu:** Kiến trúc hệ thống, data model, **API contract (nguồn chân lý)**, business rules, payment seam, auth, certificate, và **toàn bộ Docker/Infra**.
- **Không thuộc tài liệu này:** Chi tiết frontend React (nằm ở `2026-07-10-seongon-lms-frontend-design.md`). Ở đây frontend chỉ được gọi chung là "SPA client".
- **Đặc tả gốc:** [`SPEC/Draft.md`](../../../SPEC/Draft.md) (User Story, actors, sơ đồ Use Case Hình 3.4, Activity Hình 3.1 & 3.2).

---

## 1. Tổng quan & mục tiêu

SEONGON LMS là nền tảng **bán và học khóa học trực tuyến** cho công ty SEONGON. Backend là một **REST API** (Laravel 12) phục vụ một SPA client tách rời, dữ liệu lưu trong **MySQL 8**.

**3 tác nhân (actors):**

| Actor | Mô tả | Trạng thái auth |
|---|---|---|
| **Guest (Khách)** | Xem/tìm khóa học, xem chi tiết, đăng ký tài khoản, đăng nhập | Chưa đăng nhập (không token) |
| **Student (Học viên)** | Mua khóa (thanh toán mock), học video, theo dõi tiến độ, thi cuối khóa (đạt ≥ 75%), nhận chứng chỉ, đánh giá | Đăng nhập, `role=student` |
| **Admin (Quản trị viên)** | Quản lý tài khoản, danh mục, khóa học, bài học, bài kiểm tra/ngân hàng câu hỏi, đánh giá, dashboard thống kê | Đăng nhập, `role=admin` |

**Mục tiêu backend:** cung cấp API đầy đủ cho toàn bộ User Story trong SPEC, thực thi đúng các business rule (enrollment 1 năm, chặn thi khi chưa 100% tiến độ, ngưỡng đạt 75%, cấp chứng chỉ), và có thể test tự động được.

---

## 2. Tech stack (Backend)

| Thành phần | Lựa chọn |
|---|---|
| Ngôn ngữ / Framework | PHP 8.3 · **Laravel 12** |
| Auth | **Laravel Sanctum** (Bearer token cho SPA tách origin) |
| Database | **MySQL 8** |
| PDF chứng chỉ | `barryvdh/laravel-dompdf` |
| Test | **Pest** (trên PHPUnit) + factories + seeders |
| Chạy local | Docker Compose (mysql) + `php artisan serve`, hoặc full-docker |

---

## 3. Kiến trúc & tổ chức code

**Kiểu kiến trúc: layered chuẩn Laravel.** Luồng một request:

```
Route (/api/v1/...) → Controller (mỏng) → FormRequest (validate)
      → Service (business logic) → Eloquent Model → DB
      → API Resource (định dạng JSON response)
Authorization: middleware (auth:sanctum, role:admin) + Policy
```

Controller chỉ điều phối; **toàn bộ nghiệp vụ nằm trong Service** để tái sử dụng và test độc lập.

**Bố cục thư mục `BE/app/`:**

```
app/
├── Http/
│   ├── Controllers/Api/
│   │   ├── Public/      # Auth (register/login), Course, Category công khai
│   │   ├── Student/     # Order, Enrollment, Lesson, Quiz, Review, Certificate
│   │   └── Admin/       # User, Category, Course, Lesson, Quiz, Question, Review, Dashboard
│   ├── Requests/        # FormRequest cho từng action (validate)
│   ├── Resources/       # API Resource (CourseResource, LessonResource, ...)
│   └── Middleware/       # EnsureRole (role:admin)
├── Models/              # Eloquent models + quan hệ
├── Services/
│   ├── EnrollmentService.php
│   ├── ProgressService.php
│   ├── QuizGradingService.php
│   ├── CertificateService.php
│   └── Payment/
│       ├── PaymentGateway.php      # interface
│       ├── MockGateway.php         # implementation hiện tại
│       └── PaymentResult.php       # DTO kết quả
└── Policies/            # EnrollmentPolicy, ReviewPolicy, ...
```

**Các Service và trách nhiệm:**

| Service | Trách nhiệm |
|---|---|
| `EnrollmentService` | Sau khi order `paid`: tạo `enrollment` với `enrolled_at = now`, `expires_at = now + 1 năm`, `status = active`. Kiểm tra hết hạn. |
| `Payment\PaymentGateway` (interface) + `MockGateway` | Xử lý thanh toán giả lập, trả `PaymentResult` (success/failure). Seam để thay driver thật sau. |
| `ProgressService` | Ghi nhận hoàn thành lesson, tính `progress% = completed / total`, kiểm tra điều kiện đủ 100% để mở bài thi. |
| `QuizGradingService` | Chấm bài, tính điểm, so `pass_score`, quản lý `attempt_no` vs `max_attempts`. |
| `CertificateService` | Khi đạt: sinh `certificate_code` (unique), render PDF (dompdf), lưu `pdf_path`. |

---

## 4. Data model (MySQL)

14 bảng nghiệp vụ. Ngoài ra Laravel/Sanctum tự tạo: `personal_access_tokens` (Sanctum), `password_reset_tokens`, `sessions`, `cache`, `jobs`, `failed_jobs`.

Ký hiệu: **PK** = khóa chính (id, bigint auto-increment), **FK** = khóa ngoại, *ts* = `created_at`/`updated_at`.

### 4.1. `users`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| name | varchar | not null |
| email | varchar | **unique**, not null |
| email_verified_at | timestamp | nullable |
| password | varchar | not null (hashed) |
| role | enum('student','admin') | default 'student' |
| phone | varchar | nullable |
| avatar | varchar | nullable (URL) |
| status | enum('active','locked') | default 'active' |
| remember_token | varchar | nullable |
| *ts* | | |

### 4.2. `categories`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| name | varchar | not null |
| slug | varchar | **unique** |
| description | text | nullable |
| *ts* | | |

### 4.3. `courses`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| category_id | bigint | **FK** → categories, index |
| title | varchar | not null |
| slug | varchar | **unique** |
| description | longtext | nullable |
| thumbnail | varchar | nullable |
| price | decimal(10,2) | default 0 |
| instructor_name | varchar | nullable |
| instructor_bio | text | nullable |
| level | enum('beginner','intermediate','advanced') | nullable |
| status | enum('draft','published') | default 'draft', index |
| *ts* | | |

### 4.4. `lessons`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| course_id | bigint | **FK** → courses |
| title | varchar | not null |
| video_url | varchar | not null (embed YouTube/Vimeo) |
| description | text | nullable |
| duration | int | nullable (giây) |
| position | int | not null (thứ tự trong khóa) |
| *ts* | | index `(course_id, position)` |

### 4.5. `orders`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| user_id | bigint | **FK** → users |
| course_id | bigint | **FK** → courses |
| amount | decimal(10,2) | not null (snapshot giá lúc mua) |
| status | enum('pending','paid','failed') | default 'pending', index |
| payment_method | enum('card','qr') | nullable |
| transaction_ref | varchar | nullable |
| paid_at | timestamp | nullable |
| *ts* | | index `(user_id, status)` |

### 4.6. `enrollments`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| user_id | bigint | **FK** → users |
| course_id | bigint | **FK** → courses |
| order_id | bigint | **FK** → orders, nullable |
| enrolled_at | timestamp | not null |
| expires_at | timestamp | not null (= enrolled_at + 1 năm) |
| status | enum('active','expired') | default 'active' |
| *ts* | | **unique `(user_id, course_id)`**, index `expires_at` |

### 4.7. `lesson_progress`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| enrollment_id | bigint | **FK** → enrollments |
| lesson_id | bigint | **FK** → lessons |
| is_completed | boolean | default false |
| completed_at | timestamp | nullable |
| *ts* | | **unique `(enrollment_id, lesson_id)`** |

### 4.8. `quizzes`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| course_id | bigint | **FK** → courses, **unique** (1 bài thi cuối/khóa) |
| title | varchar | not null |
| pass_score | int | default 75 (%) |
| max_attempts | int | default 3 |
| *ts* | | |

### 4.9. `questions`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| quiz_id | bigint | **FK** → quizzes, index |
| content | text | not null |
| *ts* | | |

### 4.10. `question_options`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| question_id | bigint | **FK** → questions, index |
| content | varchar | not null |
| is_correct | boolean | default false |
| *ts* | | |

### 4.11. `quiz_attempts`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| enrollment_id | bigint | **FK** → enrollments |
| quiz_id | bigint | **FK** → quizzes |
| score | int | not null (0–100) |
| passed | boolean | not null |
| attempt_no | int | not null (lần thi thứ mấy) |
| submitted_at | timestamp | not null |
| *ts* | | index `(enrollment_id, quiz_id)` |

### 4.12. `quiz_attempt_answers`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| quiz_attempt_id | bigint | **FK** → quiz_attempts |
| question_id | bigint | **FK** → questions |
| selected_option_id | bigint | **FK** → question_options, nullable |
| is_correct | boolean | not null |
| *ts* | | |

### 4.13. `reviews`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| user_id | bigint | **FK** → users |
| course_id | bigint | **FK** → courses, index |
| rating | tinyint | 1–5, not null |
| comment | text | nullable |
| status | enum('visible','hidden') | default 'visible' |
| *ts* | | **unique `(user_id, course_id)`** |

### 4.14. `certificates`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | bigint | PK |
| enrollment_id | bigint | **FK** → enrollments, **unique** |
| certificate_code | varchar | **unique** (vd `SEONGON-2026-000123`) |
| issued_at | timestamp | not null |
| pdf_path | varchar | nullable |
| *ts* | | |

### 4.15. Quan hệ (relationships)

- **User** hasMany `orders`, `enrollments`, `reviews`.
- **Category** hasMany `courses`.
- **Course** belongsTo `category`; hasMany `lessons`, `orders`, `enrollments`, `reviews`; hasOne `quiz`.
- **Lesson** belongsTo `course`; hasMany `lesson_progress`.
- **Order** belongsTo `user`, `course`; hasOne `enrollment`.
- **Enrollment** belongsTo `user`, `course`, `order`; hasMany `lesson_progress`, `quiz_attempts`; hasOne `certificate`.
- **Quiz** belongsTo `course`; hasMany `questions`, `quiz_attempts`.
- **Question** belongsTo `quiz`; hasMany `question_options`.
- **QuizAttempt** belongsTo `enrollment`, `quiz`; hasMany `quiz_attempt_answers`.
- **Review** belongsTo `user`, `course`.
- **Certificate** belongsTo `enrollment`.

---

## 5. API contract (`/api/v1`) — AUTHORITATIVE

Đây là nguồn chân lý cho toàn bộ endpoint. Frontend spec chỉ tham chiếu, không định nghĩa lại.

**Quy ước chung:**
- Base URL: `/api/v1`. Response JSON.
- Auth: header `Authorization: Bearer <token>`.
- Danh sách có phân trang: `{ data: [...], meta: { current_page, last_page, per_page, total } }`.
- Lỗi: `422` (validation, kèm `errors`), `401` (chưa auth), `403` (không đủ quyền / khóa hết hạn), `404` (không tồn tại). Envelope lỗi: `{ message, errors? }`.

### 5.1. Public (không cần auth)
| Method | Path | Mô tả | Req | Resp |
|---|---|---|---|---|
| POST | `/auth/register` | Đăng ký học viên | `{name,email,password,password_confirmation}` | `{user, token}` |
| POST | `/auth/login` | Đăng nhập | `{email,password}` | `{user, token}` |
| GET | `/categories` | Danh sách danh mục | — | `[category]` |
| GET | `/courses` | Danh sách + tìm kiếm/lọc khóa học `published` | query: `q, category, min_price, max_price, sort, page` | paginated `[course]` |
| GET | `/courses/{slug}` | Chi tiết khóa (kèm lessons preview, quiz info, rating tổng) | — | `course` |
| GET | `/courses/{slug}/reviews` | Đánh giá của khóa (chỉ `visible`) | query: `page` | paginated `[review]` |

### 5.2. Authenticated (student | admin)
| Method | Path | Mô tả | Req | Resp |
|---|---|---|---|---|
| POST | `/auth/logout` | Thu hồi token hiện tại | — | `204` |
| GET | `/auth/me` | Thông tin user đang đăng nhập | — | `user` |
| PUT | `/auth/profile` | Cập nhật hồ sơ | `{name,phone,avatar?}` | `user` |
| PUT | `/auth/password` | Đổi mật khẩu | `{current_password,password,password_confirmation}` | `204` |

### 5.3. Student
| Method | Path | Mô tả | Req | Resp |
|---|---|---|---|---|
| POST | `/orders` | Tạo đơn mua khóa (status `pending`) | `{course_id}` | `order` |
| POST | `/orders/{id}/pay` | Thanh toán (mock) | `{payment_method:'card'|'qr', outcome?:'success'|'failure'}` | `{order, enrollment?}` |
| GET | `/my/courses` | Khóa đã đăng ký (kèm progress, trạng thái hết hạn) | query: `page` | paginated `[enrollment+course]` |
| GET | `/my/courses/{course}/lessons` | Bài học của khóa + trạng thái hoàn thành | — | `[lesson+is_completed]` |
| POST | `/my/lessons/{lesson}/complete` | Đánh dấu hoàn thành 1 lesson | — | `{progress}` |
| GET | `/my/courses/{course}/progress` | Tiến độ (%), đủ điều kiện thi chưa | — | `{completed,total,percent,can_take_exam}` |
| GET | `/my/courses/{course}/quiz` | Đề thi cuối khóa (câu hỏi + options, **ẩn** `is_correct`) | — | `quiz+questions` |
| POST | `/my/courses/{course}/quiz/attempts` | Nộp bài thi, chấm điểm | `{answers:[{question_id,option_id}]}` | `{attempt, passed, score, certificate?}` |
| GET | `/my/quiz-attempts/{attempt}` | Xem kết quả chi tiết (đúng/sai từng câu) | — | `attempt+answers` |
| POST | `/my/courses/{course}/reviews` | Đánh giá khóa (sau khi có enrollment) | `{rating,comment?}` | `review` |
| GET | `/my/courses/{course}/certificate` | Tải chứng chỉ PDF | — | `application/pdf` |

### 5.4. Admin (`/admin`, middleware `role:admin`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/admin/users` | Danh sách học viên (filter/search) |
| PATCH | `/admin/users/{id}/status` | Kích hoạt / khóa tài khoản (`{status}`) |
| GET/POST | `/admin/categories` · PUT/DELETE `/admin/categories/{id}` | CRUD danh mục |
| GET/POST | `/admin/courses` · GET/PUT/DELETE `/admin/courses/{id}` | CRUD khóa học |
| PATCH | `/admin/courses/{id}/publish` | Xuất bản / ẩn khóa (`{status}`) |
| GET/POST | `/admin/courses/{course}/lessons` · PUT/DELETE `/admin/lessons/{id}` | CRUD bài học |
| PATCH | `/admin/courses/{course}/lessons/reorder` | Sắp xếp lại thứ tự (`{order:[lesson_id...]}`) |
| POST/PUT | `/admin/courses/{course}/quiz` | Tạo/sửa bài kiểm tra (title, pass_score, max_attempts) |
| POST | `/admin/quizzes/{quiz}/questions` · PUT/DELETE `/admin/questions/{id}` | CRUD câu hỏi + đáp án (options lồng trong payload) |
| GET | `/admin/reviews` · PATCH `/admin/reviews/{id}/status` · DELETE `/admin/reviews/{id}` | Duyệt/ẩn/xóa đánh giá |
| GET | `/admin/dashboard/stats` | Thống kê: số học viên, số khóa, tỷ lệ hoàn thành, doanh thu (tổng `orders.amount` với `status=paid`) |

---

## 6. Business rules

Ánh xạ trực tiếp các sơ đồ Activity trong SPEC (Hình 3.1 – thanh toán, Hình 3.2 – học).

**BR-1 — Mua khóa & thanh toán (Hình 3.1):**
1. `POST /orders` tạo order `pending` (amount = giá khóa hiện tại).
2. `POST /orders/{id}/pay` gọi `MockGateway`.
   - **Success:** order → `paid` + `paid_at`; `EnrollmentService` tạo `enrollment` (`expires_at = now + 1 năm`, `active`); (song song, theo sơ đồ fork/join) ghi nhận và gửi thông báo + hóa đơn (mock/log/notification). Trả về `{order, enrollment}`.
   - **Failure:** order → `failed`; học viên có thể **thử lại** (`pay` lần nữa) hoặc **hủy** (dừng luồng). Trả `422/200` kèm thông báo lỗi.
3. Không cho mua nếu đã có enrollment `active` cho khóa đó (unique `(user_id,course_id)`).

**BR-2 — Gating truy cập học:** mọi endpoint `/my/courses/{course}/*` yêu cầu enrollment `active` **và** `expires_at >= now`. Nếu `expires_at < now` → đánh dấu `expired` → trả `403` ("khóa đã hết hạn"). (Hình 3.2, nhánh "Khóa học còn hạn?").

**BR-3 — Tiến độ:** `POST /my/lessons/{lesson}/complete` upsert `lesson_progress.is_completed = true`. `progress% = số lesson completed / tổng lesson của khóa`.

**BR-4 — Gating thi:** chỉ cho phép `POST .../quiz/attempts` khi `progress = 100%` (`can_take_exam = true`). Chưa đủ → `403`. (Hình 3.2, nhánh "Đạt 100% tiến độ?").

**BR-5 — Chấm điểm:** `score = (số câu đúng / tổng câu) * 100`. `passed = score >= quiz.pass_score` (mặc định **75**). `attempt_no` tăng dần; nếu `attempt_no > max_attempts` → chặn nộp thêm (`422`). Chưa đạt → thông báo cho thi lại (trong giới hạn `max_attempts`). (Hình 3.2, "Điểm thi ≥ 75%?").

**BR-6 — Cấp chứng chỉ:** lần **đầu tiên** `passed = true`, `CertificateService` tạo `certificate` (`certificate_code` unique) + render PDF. Idempotent: đã có chứng chỉ thì không tạo lại.

**BR-7 — Đánh giá:** `POST .../reviews` là **tùy chọn**, cho học viên đã có enrollment; unique `(user_id, course_id)` (mỗi khóa đánh giá 1 lần, có thể cập nhật).

> **⚠️ Mâu thuẫn trong SPEC (giữ lại để đối chiếu):** phần văn bản §3.2.2.2 nói học viên "*phải đánh giá khóa học để được nhận chứng chỉ*", nhưng **sơ đồ Hình 3.2 vẽ ngược lại**: cấp chứng chỉ **trước**, rồi đánh giá là bước **tùy chọn cuối**. → Triển khai **theo sơ đồ** (cert trước, rating optional). Nếu công ty muốn theo văn bản, chỉ cần đảo thứ tự ở BR-6/BR-7 — ghi nhận là điểm cần chốt với PM.

---

## 7. Payment seam (mock, có thể thay)

Thanh toán được trừu tượng hóa để **không khóa cứng** vào một cổng cụ thể:

```php
interface PaymentGateway {
    public function charge(Order $order, array $data): PaymentResult;
}

final class PaymentResult {
    public bool $success;
    public ?string $transactionRef;
    public ?string $message;
}
```

- **`MockGateway`** (driver hiện tại): quyết định success/failure theo input `outcome` (môi trường dev/demo); sinh `transaction_ref` giả. Không gọi mạng.
- Đăng ký qua container: `PaymentGateway::class → MockGateway::class` trong `AppServiceProvider`.
- **VNPay là driver tương lai** (`VnpayGateway implements PaymentGateway`): chỉ cần thêm class + đổi binding, **không sửa** `EnrollmentService`/controller. **Không thiết kế chi tiết VNPay ở giai đoạn này (YAGNI).**

---

## 8. Auth & phân quyền

- **Sanctum token:** `register`/`login` trả `{user, token}` (`personal_access_tokens`). Client gửi `Authorization: Bearer <token>`. `logout` thu hồi token hiện tại.
- **Roles:** `student` (mặc định khi đăng ký) và `admin` (tạo qua seeder, không đăng ký công khai). Guest = request không có token.
- **Middleware `role:admin`** (`EnsureRole`) bảo vệ nhóm `/admin/*`.
- **Policies:** `EnrollmentPolicy` (học viên chỉ truy cập enrollment/khóa của chính mình), `ReviewPolicy`. Kiểm tra trạng thái tài khoản: `status=locked` → chặn đăng nhập/từ chối request (`403`).

---

## 9. Certificate (chứng chỉ)

- Kích hoạt tại BR-6. `certificate_code` định dạng `SEONGON-{year}-{seq}` (unique).
- Render PDF bằng `barryvdh/laravel-dompdf` từ Blade template (tên học viên, tên khóa, ngày cấp, mã chứng chỉ). Lưu `pdf_path` (storage) hoặc render on-the-fly.
- `GET /my/courses/{course}/certificate` trả file PDF (chỉ chủ sở hữu enrollment).

---

## 10. Infra / Docker

`Infra/docker-compose.yml` (tài liệu này sở hữu toàn bộ phần Docker):

| Service | Image / Build | Vai trò | Port |
|---|---|---|---|
| `mysql` | `mysql:8.0` | Database. Env: `MYSQL_DATABASE=seongon_lms`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`. Volume `mysql_data`. | 3306 |
| `backend` | build `Infra/backend.Dockerfile` (PHP 8.3-fpm + composer, nginx) — hoặc dev: `php artisan serve`. Mount `../BE`. | Laravel API | 8000 |
| `frontend` | `node:22` (Vite dev) hoặc build → nginx serve. Mount `../FE`. | SPA client | 5173 (dev) / 80 (prod) |
| `phpmyadmin` *(tùy chọn)* | `phpmyadmin` | Quản trị DB qua web | 8080 |

**Biến môi trường chính (`BE/.env`):** `APP_URL=http://localhost:8000`, `DB_CONNECTION=mysql`, `DB_HOST=mysql` (trong docker) / `127.0.0.1` (local), `DB_DATABASE=seongon_lms`, `DB_USERNAME`, `DB_PASSWORD`, `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`.

**Hai cách chạy dev:**
1. **Full-docker:** `docker compose up` — cả mysql + backend + frontend.
2. **Nhẹ:** chỉ chạy `mysql` bằng Docker, còn `php artisan serve` (BE) và `npm run dev` (FE) chạy trực tiếp trên máy.

CORS cấu hình cho phép origin của FE (`http://localhost:5173`).

---

## 11. Testing (Backend)

**Pest feature tests** (chạy trên DB test, mỗi test refresh). Danh sách tối thiểu:

| Nhóm | Test |
|---|---|
| Auth | register tạo user+token; login đúng/sai; login khi `locked` bị chặn; đổi mật khẩu; logout thu hồi token |
| Catalog | list courses chỉ `published`; filter theo `q`/`category`/khoảng giá; chi tiết theo slug |
| Mua khóa | tạo order pending; pay **success** → order paid + tạo enrollment 1 năm; pay **failure** → order failed, cho retry; không cho mua trùng khi đã enroll |
| Enrollment | `expires_at = enrolled_at + 1 năm`; dùng `travel()` giả lập quá 1 năm → truy cập học trả `403` |
| Tiến độ | complete lesson cập nhật progress%; unique không nhân đôi |
| Thi | chặn thi khi progress < 100%; chấm điểm đúng; `passed` khi ≥75%; `attempt_no` tăng; chặn khi vượt `max_attempts` |
| Chứng chỉ | đạt lần đầu → tạo certificate + code unique; đã có thì không tạo lại; chỉ chủ sở hữu tải được |
| Review | tạo review unique theo (user,course) |
| Admin & phân quyền | CRUD category/course/lesson/quiz/question; `role:admin` chặn student; dashboard stats trả đúng số liệu |

**Fixtures:** Factories cho mọi model; **Seeder** tạo sẵn 1 admin, vài category, vài course + lessons + 1 quiz + questions/options để dev/demo.

---

## 12. Non-goals / hướng mở rộng

- Tích hợp cổng thanh toán thật (VNPay/MoMo) — chỉ chừa seam.
- Upload/stream video (S3/MinIO) — hiện dùng embed URL.
- Đa ngôn ngữ (i18n), thông báo real-time, email thật (hiện log/notification mock).
- Học viên nhiều vai trò / phân quyền chi tiết (RBAC nâng cao) — hiện 2 role đơn giản.

---

## Phụ lục — quyết định đã chốt

| Hạng mục | Lựa chọn |
|---|---|
| Backend | Laravel 12, PHP 8.3, Sanctum token |
| Database | MySQL 8 |
| Payment | Mock (seam `PaymentGateway`, VNPay để sau) |
| Video | Embed URL (YouTube/Vimeo) |
| Kiến trúc code | Layered: Controller → FormRequest → Service → Model → Resource |
| Frontend | (tài liệu riêng) React 19 + Vite + TS + Tailwind |
