# SEONGON LMS – BẢN ĐỒ HỆ THỐNG ĐỂ BẢO VỆ KHÓA LUẬN

> Tài liệu này không giải thích từng dòng code.
> Mục tiêu là giúp người bảo vệ trả lời được:
>
> * Hệ thống gồm những phần nào
> * File/folder nào chịu trách nhiệm việc gì
> * Dữ liệu được lưu ở đâu
> * Một nghiệp vụ chạy qua hệ thống như thế nào
> * Khi giảng viên hỏi thì cần mở file nào để minh họa
>
> Mọi đường dẫn trong tài liệu đều là đường dẫn thật trong repository này.
> Cách cài đặt và chạy nằm ở [Phụ lục A](#phụ-lục-a--chạy-dự-án-trên-windows).

---

# 1. HỆ THỐNG NÀY DÙNG ĐỂ LÀM GÌ?

SEONGON LMS là website học trực tuyến về Search Marketing. Học viên mua quyền truy cập khóa học rồi học bài, làm bài kiểm tra và nhận chứng chỉ.

Nghiệp vụ chính:

* Khách xem danh mục khóa học, chi tiết khóa học, tin tức.
* Người dùng đăng ký / đăng nhập.
* Học viên (`student`) thêm khóa học vào giỏ hàng, tạo đơn hàng, thanh toán mô phỏng bằng QR (MoMo / chuyển khoản).
* Sau khi thanh toán, hệ thống tạo **Enrollment** (quyền học 1 năm) cho học viên.
* Học viên xem video bài học, hệ thống lưu tiến độ và vị trí đang xem.
* Học viên làm bài kiểm tra có giới hạn thời gian và số lần; đạt điểm thì được cấp chứng chỉ PDF.
* Học viên đánh giá khóa học, xem lịch sử giao dịch.
* Quản trị viên (`admin`) quản lý tài khoản, khóa học, bài học, bài kiểm tra, danh mục, tin tức, đánh giá, cài đặt thanh toán; xem đơn hàng, ghi danh, tiến độ, kết quả thi, chứng chỉ; xem dashboard và xuất báo cáo CSV.

Điểm cần nói rõ khi bảo vệ:

* **Không có bảng `order_items` và không có khuyến mại.** Mỗi Order gắn với đúng một Course. Giỏ hàng chỉ là nơi gom khóa học; thanh toán thực hiện từng khóa học một.
* **Thanh toán là mô phỏng.** Không kết nối ngân hàng thật. Backend tạo phiên thanh toán 15 phút, hiển thị QR, người dùng bấm xác nhận thì backend xử lý kết quả giả lập.

---

# 2. HỆ THỐNG GỒM NHỮNG PHẦN NÀO?

```text
USER (trình duyệt)
  │
  ▼
FRONTEND  FE/DEMO  (React + Vite, chạy tại http://localhost:5173)
Giao diện người dùng
  │
  │ HTTP Request / JSON API  (/api/v1/...)
  ▼
BACKEND   BE/      (Laravel, chạy tại http://127.0.0.1:8000)
Xử lý nghiệp vụ
  │
  ▼
DATABASE  MySQL    (database seongon_lms)
Lưu dữ liệu
```

Có thể hiểu:

```text
Frontend = thứ người dùng nhìn thấy (FE/DEMO/src/app/pages/*.tsx)

Backend  = bộ não xử lý       (BE/app/Http/Controllers + BE/app/Services)

Database = nơi lưu dữ liệu    (MySQL, cấu trúc nằm ở BE/database/migrations)
```

Ví dụ:

```text
Học viên bấm "Tạo đơn hàng" ở trang Checkout
        ↓
Frontend gửi POST /api/v1/orders { course_id }
        ↓
Backend kiểm tra học viên + khóa học + giỏ hàng
        ↓
Backend tạo Order (status = pending)
        ↓
MySQL lưu vào bảng orders
        ↓
Backend trả JSON Order
        ↓
Frontend hiển thị bước chọn phương thức thanh toán
```

---

# 3. CÔNG NGHỆ ĐANG DÙNG

| Thành phần | Công nghệ | Vai trò |
| ---------- | --------- | ------- |
| Frontend | React + TypeScript, Vite 8, MUI 7, react-router 7, Tailwind, Vitest | Hiển thị UI, gọi API |
| Backend | Laravel 13 (PHP 8.3), Laravel Sanctum (token đăng nhập), barryvdh/laravel-dompdf (PDF chứng chỉ), Pest (test) | Xử lý nghiệp vụ, REST API |
| Database | MySQL 8 | Lưu dữ liệu, tạo bằng migration |
| Web server (local) | `php artisan serve` :8000, Vite dev server :5173, phpMyAdmin :8081 | Chạy website trên máy dev |
| Web server (Docker, tùy chọn) | nginx + php-fpm + mysql + phpmyadmin (`Infra/docker-compose.yml`) | Chạy cả stack bằng container |
| Payment | Mock gateway (`BE/app/Services/Payment/`) – MoMo QR / chuyển khoản mô phỏng | Thanh toán giả lập |
| Deploy | Vercel (chỉ build frontend tĩnh, `vercel.json`); Laravel phải host riêng | Đưa website lên Internet |

---

# 4. BẢN ĐỒ FOLDER

```text
seongon-lms/
│
├── FE/DEMO/                          # FRONTEND (React + Vite)
│   ├── src/main.tsx                  # điểm khởi động React
│   ├── src/app/App.tsx               # ThemeProvider + AuthProvider + CartProvider + Router
│   ├── src/app/routes.tsx            # bảng đường dẫn (URL → trang)
│   ├── src/app/pages/                # các màn hình
│   ├── src/app/components/           # component dùng chung (Layout, RequireAuth, AdminShell...)
│   ├── src/app/contexts/AuthContext.tsx   # trạng thái đăng nhập, token
│   ├── src/app/cart/CartContext.tsx       # trạng thái giỏ hàng
│   ├── src/app/lib/api.ts            # TẤT CẢ lời gọi API tới backend
│   ├── src/app/lib/contracts.ts      # kiểu dữ liệu (TypeScript) của JSON trả về
│   ├── src/app/data/repositories/    # gom api.ts thành nhóm nghiệp vụ
│   ├── public/                       # ảnh/tài nguyên tĩnh
│   └── .env                          # VITE_API_BASE_URL
│
├── BE/                               # BACKEND (Laravel)
│   ├── routes/api.php                # TẤT CẢ endpoint /api/v1
│   ├── app/Http/Controllers/Api/     # Controller: nhận request, trả response
│   │   ├── AuthController.php, CourseController.php, CategoryController.php, NewsController.php  (public)
│   │   ├── Student/                  # nghiệp vụ của học viên
│   │   └── Admin/                    # nghiệp vụ của quản trị viên
│   ├── app/Http/Middleware/EnsureRole.php  # chặn theo vai trò
│   ├── app/Http/Resources/           # định dạng JSON trả về
│   ├── app/Models/                   # Model ↔ bảng MySQL
│   ├── app/Services/                 # business logic (Order, Cart, Enrollment, Exam, Progress, Certificate, Payment/)
│   ├── app/Mail/PaymentConfirmation.php   # email xác nhận thanh toán
│   ├── app/Console/Commands/         # lệnh artisan (seed demo, chốt bài thi hết giờ)
│   ├── database/migrations/          # cấu trúc database bằng code
│   ├── database/seeders/             # dữ liệu mẫu
│   ├── database/factories/           # tạo dữ liệu test
│   ├── config/database.php, cors.php, sanctum.php
│   ├── resources/views/certificates/ # template PDF chứng chỉ
│   ├── tests/Feature/                # test nghiệp vụ (Pest)
│   └── .env                          # DB_*, FRONTEND_URL
│
├── Infra/                            # script chạy local Windows + docker-compose
│   ├── build-local-web-windows.ps1   # cài dependency, migrate, seed, test, build
│   ├── start-local-web-windows.ps1   # bật Laravel :8000, Vite :5173, phpMyAdmin :8081
│   └── docker-compose.yml
│
├── SPEC/                             # đặc tả
│   ├── ERD.md                        # ERD đã duyệt (nguồn tham chiếu thiết kế)
│   └── learning-continuity-and-data-integrity.md
│
├── docs/                             # ADR, audit, plan
├── tests/infra/                      # test Pester cho script Windows
├── vercel.json                       # deploy frontend
└── README.md
```

Phải nhớ:

```text
FE/DEMO   → giao diện
BE        → business logic + API
BE/database/migrations → cấu trúc dữ liệu
FE/DEMO/public, BE/public → file public (ảnh, css, js)
```

---

# 5. FILE NÀO LƯU CÁI GÌ? (FRONTEND)

Không cần nhớ code bên trong. Chỉ cần nhớ **file này có responsibility gì**.

Bảng đường dẫn (URL) nằm trong `FE/DEMO/src/app/routes.tsx`:

| URL | Trang | Yêu cầu |
| --- | ----- | ------- |
| `/` | `pages/Home.tsx` | công khai |
| `/courses` | `pages/CatalogPage.tsx` | công khai |
| `/courses/:slug` | `pages/CoursePage.tsx` | công khai |
| `/news`, `/news/:slug` | `pages/NewsPage.tsx`, `pages/NewsDetailPage.tsx` | công khai |
| `/login` | `pages/AuthPage.tsx` | công khai |
| `/profile` | `pages/ProfilePage.tsx` | đã đăng nhập |
| `/cart` | `pages/CartPage.tsx` | role `student` |
| `/checkout/:slug` | `pages/CheckoutPage.tsx` | role `student` |
| `/my-courses` | `pages/MyCoursesPage.tsx` | role `student` |
| `/transactions` | `pages/TransactionsPage.tsx` | role `student` |
| `/learn/:courseId` | `pages/LearnCoursePage.tsx` | role `student` |
| `/admin` | `pages/AdminPage.tsx` | role `admin`, màn hình ≥ 1280px |

Việc chặn theo đăng nhập/vai trò do `components/RequireAuth.tsx` làm: chưa đăng nhập → chuyển về `/login`; sai vai trò → chuyển về `/admin` hoặc `/my-courses`.

## 5.1 Trang đăng nhập / đăng ký

File: `FE/DEMO/src/app/pages/AuthPage.tsx`

Responsibility:

```text
Hiển thị 2 tab Đăng nhập / Đăng ký
Nhận email, password (và tên khi đăng ký)
Gọi useAuth().login / register  (contexts/AuthContext.tsx)
Sau khi thành công: admin → /admin, student → /my-courses
```

`contexts/AuthContext.tsx` giữ `user` + `token`, lưu token vào `localStorage` với khóa `seongon.session`.

## 5.2 Trang danh sách khóa học

File: `FE/DEMO/src/app/pages/CatalogPage.tsx`

Responsibility:

```text
Hiển thị danh sách khóa học có lọc theo danh mục, tìm kiếm, sắp xếp, phân trang
Gọi GET /courses và GET /categories
Render từng khóa học bằng components/CourseCard.tsx
```

## 5.3 Trang chi tiết khóa học

File: `FE/DEMO/src/app/pages/CoursePage.tsx`

Responsibility:

```text
Gọi GET /courses/{slug} và GET /courses/{slug}/reviews
Hiển thị mô tả, giảng viên, danh sách bài học, đánh giá
Nút "Thêm vào giỏ" → CartContext.add → POST /cart/items
Nút "Mua ngay"    → chuyển tới /checkout/{slug}
```

## 5.4 Giỏ hàng

File: `FE/DEMO/src/app/pages/CartPage.tsx` + `cart/CartContext.tsx`

Responsibility:

```text
Hiển thị các khóa học đã thêm (GET /cart)
Xóa từng mục (DELETE /cart/items/{id}) hoặc xóa hết (DELETE /cart)
Mỗi mục có nút "Thanh toán" → /checkout/{slug}   (thanh toán từng khóa học)
```

## 5.5 Trang checkout

File: `FE/DEMO/src/app/pages/CheckoutPage.tsx`

Responsibility:

```text
Hiển thị khóa học + giá
Tạo Order            → POST /orders
Lấy phương thức      → GET /payment-methods (momo / bank)
Tạo phiên thanh toán → POST /orders/{id}/payment-session
Hiển thị mã QR (qrcode.react) + đếm ngược 15 phút
Xác nhận / Hủy       → POST /orders/{id}/mock-callback
Poll GET /orders/{id} để cập nhật trạng thái
```

Nhãn trạng thái thanh toán nằm ở `lib/payment.ts`.

## 5.6 Học bài

File: `FE/DEMO/src/app/pages/LearnCoursePage.tsx`

Responsibility:

```text
Lấy danh sách bài học + tiến độ (GET /my/courses/{id}/lessons, /progress)
components/TrackedLessonVideo.tsx: phát video, định kỳ gửi vị trí đang xem
   → PATCH /my/lessons/{id}/progress
components/ExamAttemptPanel.tsx: bắt đầu / lưu nháp / nộp bài kiểm tra
Gửi đánh giá (POST /my/courses/{id}/reviews)
Tải chứng chỉ PDF (GET /my/courses/{id}/certificate)
```

`pages/MyCoursesPage.tsx` liệt kê khóa học đã mua (GET /my/courses) và dẫn vào `/learn/{courseId}`.
`pages/TransactionsPage.tsx` liệt kê đơn đã thanh toán (GET /my/transactions).

## 5.7 Trang Admin

File: `FE/DEMO/src/app/pages/AdminPage.tsx` (khung `components/AdminShell.tsx`, menu `admin/adminNavigation.ts`)

Responsibility:

```text
Menu trái: Tổng quan, Tài khoản, Đơn hàng, Cài đặt thanh toán, Danh mục, Khóa học, Đánh giá, Tin tức
Tổng quan            → pages/AdminOverview.tsx  (GET /admin/dashboard/stats, xuất CSV /admin/reports/*)
Tài khoản            → khóa/mở tài khoản, đổi vai trò, xem lịch sử trạng thái
Đơn hàng             → CHỈ ĐỌC (lọc theo status / payment_status)
Cài đặt thanh toán   → pages/admin/PaymentSettingsPanel.tsx (GET/PUT /admin/payment-settings)
Khóa học             → tạo/sửa/xóa khóa học, bài học, bài kiểm tra, câu hỏi; xuất bản
Đánh giá             → ẩn/hiện/xóa
Tin tức              → CRUD bài viết + danh mục tin (pages/admin/NewsCatalogManager.tsx)
Các bảng ERD chỉ đọc → pages/admin/AdminErdReadSection.tsx
   (roles, carts, cart_items, course_categories, learning_progress, questions, answers,
    enrollments, lessons, exams, attempts, certificates)
```

Toàn bộ lời gọi API của admin gom ở `data/repositories/adminRepositories.ts`; của học viên ở `data/repositories/applicationRepositories.ts`; cả hai đều gọi xuống `lib/api.ts`.

> Lưu ý: trong `pages/` còn một số file prototype không được nối vào `routes.tsx` (`Courses.tsx`, `CourseDetail.tsx`, `Login.tsx`, `Combos.tsx`, `Internships.tsx`, `Jobs.tsx`, `StudentDashboard.tsx`, `RecruiterDashboard.tsx`, `UserProfile.tsx`, `LearningStats.tsx`, `AdminDashboard.tsx`). Chúng không chạy trong ứng dụng thật, không nên đem ra bảo vệ.

---

# 6. BACKEND – FILE NÀO XỬ LÝ NGHIỆP VỤ GÌ?

Laravel dùng mô hình MVC. Ở project này phần View là JSON (Resource), giao diện do React đảm nhiệm.

Mental model:

```text
routes/api.php  (URL → Controller)
   ↓
Controller      (validate request, gọi Service, trả Resource)
   ↓
Service         (business logic, transaction)
   ↓
Model           (Eloquent, 1 Model = 1 bảng)
   ↓
MySQL
```

## Route

File: `BE/routes/api.php`. Tất cả bắt đầu bằng `/api/v1`. Ba nhóm:

```text
Public            : auth/register, auth/login, categories, courses, courses/{slug}, courses/{slug}/reviews, news
auth:sanctum      : auth/logout, auth/me, auth/profile, auth/password
  role:student    : cart, orders, payment-methods, my/courses, my/lessons, my/quiz-attempts, my/transactions ...
  role:admin      : admin/users, admin/courses, admin/orders, admin/payment-settings, admin/dashboard/stats ...
```

Middleware `role` được khai báo trong `BE/bootstrap/app.php` và trỏ tới `app/Http/Middleware/EnsureRole.php`: sai vai trò hoặc tài khoản `locked` → HTTP 403.

## Controller

| Controller | Responsibility |
| ---------- | -------------- |
| `Api/AuthController.php` | đăng ký, đăng nhập, đăng xuất, hồ sơ, đổi mật khẩu |
| `Api/CourseController.php`, `CategoryController.php`, `NewsController.php` | dữ liệu công khai cho khách |
| `Api/Student/CartController.php` | giỏ hàng |
| `Api/Student/OrderController.php` | tạo Order; endpoint `pay` cũ |
| `Api/Student/PaymentController.php` | phương thức, phiên thanh toán, callback mô phỏng, lịch sử |
| `Api/Student/MyCourseController.php` | khóa học đã mua, bài học, tiến độ |
| `Api/Student/LessonController.php` | đánh dấu hoàn thành, lưu vị trí video |
| `Api/Student/QuizController.php` | bắt đầu / lưu nháp / nộp bài kiểm tra |
| `Api/Student/ReviewController.php`, `CertificateController.php` | đánh giá, tải PDF chứng chỉ |
| `Api/Admin/UserController.php` | danh sách, khóa/mở, đổi vai trò, lịch sử trạng thái |
| `Api/Admin/CourseController.php`, `LessonController.php`, `QuizController.php`, `QuestionController.php` | quản lý nội dung khóa học |
| `Api/Admin/CategoryController.php`, `CatalogController.php`, `NewsController.php`, `ReviewController.php` | danh mục, danh mục tin, tin tức, đánh giá |
| `Api/Admin/OrderController.php`, `EnrollmentController.php`, `AttemptController.php`, `CertificateController.php`, ... | các bảng chỉ đọc cho admin |
| `Api/Admin/PaymentSettingsController.php` | cấu hình MoMo / ngân hàng dùng cho QR |
| `Api/Admin/DashboardController.php`, `ReportController.php` | số liệu tổng quan, CSV |

Chỉ cần biết: **`OrderController` liên quan tới Order, `QuizController` liên quan tới bài kiểm tra.**

## Service (business logic)

| Service | Responsibility |
| ------- | -------------- |
| `Services/CartService.php` | thêm/xóa giỏ; `createPendingOrder()` tạo Order `pending` từ giỏ |
| `Services/Payment/PaymentSessionService.php` | `start()` tạo phiên QR 15 phút; `complete()` chốt paid/failed, tạo Enrollment, gửi mail |
| `Services/Payment/MockGateway.php` | cổng thanh toán giả lập (implements `PaymentGateway`) |
| `Services/EnrollmentService.php` | `createFromOrder()` tạo quyền học 1 năm |
| `Services/ProgressService.php` | lưu vị trí video, hoàn thành bài, tính % |
| `Services/AttemptLifecycleService.php` | bắt đầu/tiếp tục bài thi, lưu nháp, hết giờ |
| `Services/ExamGradingService.php` | chấm điểm, `passed`, cấp chứng chỉ |
| `Services/CertificateService.php` | tạo mã chứng chỉ |
| `Services/OrderService.php` | truy vấn đơn hàng cho admin |
| `Services/ProtectedDeletionService.php` | chặn xóa khóa học/bài học/câu hỏi đã có dữ liệu lịch sử |
| `Services/RoleService.php`, `CourseService.php`, `LearningOperationsService.php` | vai trò, khóa học, thống kê học tập |

## Model

Model đại diện cho một bảng trong database (`BE/app/Models/`):

```text
User        ↔ users            Role        ↔ roles          UserRecord   ↔ user_records
Course      ↔ courses          Category    ↔ categories     CourseCategory ↔ course_categories
Lesson      ↔ lessons          Exam        ↔ exams          Question     ↔ questions
Answer      ↔ answers          Attempt     ↔ attempts       LearningProgress ↔ learning_progress (+ lesson_progress cũ)
Cart        ↔ carts            CartItem    ↔ cart_items     Order        ↔ orders
Enrollment  ↔ enrollments      Certificate ↔ certificates   Review       ↔ reviews
NewsPost    ↔ news_posts       Catalog     ↔ catalogs       PaymentSetting ↔ payment_settings
```

---

# 7. DATABASE KHÁC SSMS NHƯ THẾ NÀO?

Bản chất **không khác**. MySQL vẫn có `CREATE DATABASE`, `CREATE TABLE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`.

Điểm khác của project web: developer không ngồi gõ SQL bằng tay. Laravel (Eloquent) làm thay.

Ví dụ trong `Services/CartService.php`:

```php
Order::query()->create([... 'status' => 'pending']);
```

Laravel sinh ra và chạy:

```sql
INSERT INTO orders (user_id, course_id, amount, status, ...) VALUES (...);
```

Trong `Services/Payment/PaymentSessionService.php`:

```php
$order->update(['status' => 'paid', 'paid_at' => now()]);
```

≈

```sql
UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = ?;
```

Có thể mở phpMyAdmin tại `http://127.0.0.1:8081` để xem bảng trực tiếp giống SSMS.

---

# 8. DATABASE ĐANG CÓ NHỮNG TABLE NÀO?

Database: `seongon_lms` (MySQL). Bảng nghiệp vụ:

| Table | Lưu dữ liệu gì? | Cột đáng nhớ | Trạng thái |
| ----- | --------------- | ------------ | ---------- |
| `roles` | Vai trò | code, name | admin / teacher / student |
| `users` | Tài khoản | name, email, password, role, role_id, status, phone, avatar | active / locked |
| `user_records` | Lịch sử admin đổi trạng thái tài khoản | user_id, old_status, new_status, reason | |
| `categories` | Danh mục khóa học | name, slug | |
| `course_categories` | Gán khóa học ↔ danh mục (N-N) | course_id, category_id | |
| `courses` | Khóa học | title, slug, price, level, thumbnail, instructor_name, status | draft / published |
| `lessons` | Bài học (video) | course_id, title, video_url, material_url, duration, position/sort_order | |
| `exams` | Bài kiểm tra của khóa học (1 khóa = 1 bài) | course_id, pass_score, max_attempts, duration_minutes, total_questions | |
| `questions` | Câu hỏi | exam_id, content, sort_order | |
| `answers` | Đáp án | question_id, content, is_correct | |
| `carts` | Giỏ hàng (1 user = 1 giỏ) | user_id | |
| `cart_items` | Khóa học trong giỏ | cart_id, user_id, course_id | |
| `orders` | Đơn hàng – 1 đơn = 1 khóa học | user_id, course_id, amount, total_amount, status, payment_method, transaction_ref, payment_session, payment_expires_at, paid_at | pending / paid / failed |
| `payment_settings` | Cấu hình MoMo / ngân hàng (JSON) | configuration | |
| `enrollments` | Quyền học một khóa | user_id, course_id, order_id, enrolled_at, expires_at, status | active / expired |
| `learning_progress` | Tiến độ từng bài học | enrollment_id, lesson_id, is_completed, completed_at, resume_position_seconds | |
| `lesson_progress` | Bảng cũ của tiến độ, vẫn được ghi song song (giai đoạn expand) | như trên | |
| `attempts` | Lần làm bài kiểm tra | enrollment_id, exam_id, attempt_number, answers (JSON), score, passed, status, started_at, expires_at | in_progress / submitted / expired |
| `certificates` | Chứng chỉ | enrollment_id, certificate_code, issued_at | |
| `reviews` | Đánh giá khóa học | user_id, course_id, rating, comment, status | visible / hidden |
| `news_posts` | Tin tức | author_id, title, slug, content, thumbnail, status | draft / published |
| `catalogs` | Danh mục tin tức | name, description | |

Bảng của framework (không phải nghiệp vụ): `personal_access_tokens` (token đăng nhập Sanctum), `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `password_reset_tokens`, `migrations`.

ERD đã duyệt nằm ở `SPEC/ERD.md`. Cấu trúc vật lý thật là các file trong `BE/database/migrations/` (xem thêm `docs/adr/0001-keep-direct-enrollment-ownership.md` về việc `enrollments` giữ `user_id`).

---

# 9. QUAN HỆ GIỮA CÁC TABLE

```text
roles ──1─N── users ──1─1── carts ──1─N── cart_items ──N─1── courses
                │
                ├──1─N── user_records
                ├──1─N── news_posts (author_id)
                ├──1─N── reviews ──N─1── courses
                │
                └──1─N── orders ──N─1── courses
                             │
                             └──1─1── enrollments ──N─1── courses
                                          │
                                          ├──1─N── learning_progress ──N─1── lessons ──N─1── courses
                                          ├──1─N── attempts ──N─1── exams ──1─1── courses
                                          └──1─1── certificates

courses ──1─N── lessons
courses ──1─1── exams ──1─N── questions ──1─N── answers
courses ──N─N── categories   (qua course_categories)
```

Đọc bằng lời:

```text
Một User có nhiều Order. Một Order thuộc đúng một Course.
Một Order thanh toán xong sinh ra đúng một Enrollment.
Một Enrollment có nhiều Learning_progress (mỗi bài học một dòng),
nhiều Attempt (mỗi lần thi một dòng) và tối đa một Certificate.
Một Course có nhiều Lesson, một Exam; Exam có nhiều Question; Question có nhiều Answer.
```

---

# 10. FLOW 1 – ĐĂNG NHẬP

```text
User nhập email/password ở /login
        ↓
AuthPage.tsx → useAuth().login()
        ↓
POST /api/v1/auth/login
        ↓
AuthController::login()
        ↓
SELECT users WHERE email = ?   →  Hash::check(password)
        ↓
Đúng
 ├── tài khoản locked → lỗi "Tài khoản đã bị khóa"
 └── OK → $user->createToken('api')  →  INSERT personal_access_tokens
        ↓
Response { user, token }
        ↓
AuthContext lưu token vào localStorage 'seongon.session'
        ↓
admin → /admin ; student → /my-courses
Sai
 └── 422 "Thông tin đăng nhập không chính xác"
```

Mọi request sau đó gửi header `Authorization: Bearer <token>` (xem `lib/api.ts`, hàm `apiRequest`).

Đăng ký: `POST /auth/register` → `AuthController::register()` → `User::create()`; `role` mặc định `student`, `status` mặc định `active` theo default của bảng.

### Nếu thầy hỏi mở đâu?

```text
Frontend : FE/DEMO/src/app/pages/AuthPage.tsx, FE/DEMO/src/app/contexts/AuthContext.tsx
Backend  : BE/app/Http/Controllers/Api/AuthController.php
Middleware: BE/app/Http/Middleware/EnsureRole.php
Database : users, roles, personal_access_tokens
```

---

# 11. FLOW 2 – XEM KHÓA HỌC

```text
User mở /courses
        ↓
CatalogPage.tsx → applicationRepositories.catalog.listCourses()
        ↓
GET /api/v1/courses?category=&search=&sort=&page=
        ↓
CourseController::index()
        ↓
SELECT courses WHERE status = 'published' (+ lọc, sắp xếp, phân trang)
        ↓
CourseResource → JSON
        ↓
CatalogPage render CourseCard
```

Chi tiết: `/courses/:slug` → `CoursePage.tsx` → `GET /courses/{slug}` → `CourseController::show()` → `courses` + `lessons` + `categories`.

File cần biết:

```text
Frontend : FE/DEMO/src/app/pages/CatalogPage.tsx, CoursePage.tsx, components/CourseCard.tsx
Backend  : BE/app/Http/Controllers/Api/CourseController.php
Model    : BE/app/Models/Course.php (scope published, quan hệ lessons/exam/categories)
Database : courses, categories, course_categories, lessons, reviews
```

---

# 12. FLOW 3 – MUA KHÓA HỌC

```text
Học viên (đã đăng nhập, role student)
 ↓
Chọn Course → "Thêm vào giỏ" (POST /cart/items → carts, cart_items)
              hoặc "Mua ngay"
 ↓
/checkout/{slug}  (CheckoutPage.tsx)
 ↓
POST /orders { course_id }
 ↓
Student/OrderController::store() → CartService::createPendingOrder()
   ├─ đã có Enrollment còn hạn?  → 422 "Bạn đã sở hữu khóa học này"
   ├─ đã có Order pending/failed cùng khóa? → dùng lại Order đó
   └─ chưa có → INSERT orders (status = 'pending', amount = course.price)
 ↓
GET /payment-methods  → momo / bank (theo payment_settings)
 ↓
POST /orders/{id}/payment-session { method }
 ↓
PaymentSessionService::start()
   → UPDATE orders SET status='pending', payment_method, transaction_ref,
     payment_session (token + qr_payload), payment_started_at, payment_expires_at = now + 15 phút
 ↓
CheckoutPage hiển thị QR + đếm ngược
 ↓
Học viên bấm "Tôi đã thanh toán" (hoặc "Hủy")
 ↓
POST /orders/{id}/mock-callback { session_token, outcome }
 ↓
PaymentSessionService::complete()  (xem Flow thanh toán)
```

Database liên quan:

```text
users, courses, carts, cart_items, orders, payment_settings, enrollments
```

Không có `order_items`, không có `promotions`.

---

# 13. FLOW THANH TOÁN

Tất cả nằm trong `BE/app/Services/Payment/PaymentSessionService.php::complete()`, chạy trong `DB::transaction` và `lockForUpdate` để chống bấm hai lần.

```text
1. Kiểm tra token phiên (hash_equals) và chủ đơn hàng

2. Đơn đã paid → trả về luôn (idempotent)

3. payment_status phải là 'pending' và chưa quá 15 phút
   → nếu không: 422 "Phiên thanh toán đã hủy hoặc hết hạn"

4. outcome = 'cancel'
   ↓
   UPDATE orders SET status = 'failed'
   Order.payment_status = cancelled

5. outcome = 'success'
   ↓
   MockGateway::charge()  → transactionRef
   ↓
   UPDATE orders SET status = 'paid', transaction_ref, paid_at = now()
   ↓
   EnrollmentService::createFromOrder()
   → INSERT/UPDATE enrollments (status = 'active', expires_at = now + 1 năm)
   ↓
   CartService::removePurchasedItem() → DELETE cart_items
   ↓
   Mail PaymentConfirmation được đưa vào queue (BE/app/Mail/PaymentConfirmation.php)
   ↓
   Response { order, enrollment }

6. Frontend hiển thị "Thanh toán thành công", nút "Vào học" → /learn/{courseId}
```

`orders.status` chỉ có 3 giá trị trong DB (`pending`, `paid`, `failed`). Trạng thái hiển thị `payment_status` (draft / pending / paid / cancelled / expired) được tính trong `Models/Order.php::getPaymentStatusAttribute()`.

Endpoint `POST /orders/{id}/pay` trong `Student/OrderController::pay()` là đường thanh toán cũ (không QR), vẫn tồn tại nhưng CheckoutPage không dùng.

---

# 14. FLOW HỌC BÀI VÀ THI

## 14.1 Xem video

```text
/learn/{courseId} → LearnCoursePage.tsx
 ↓
GET /my/courses/{id}/lessons + GET /my/courses/{id}/progress
 ↓
TrackedLessonVideo.tsx phát video, mỗi vài giây gửi
PATCH /my/lessons/{id}/progress { position_seconds, duration_seconds }
 ↓
Student/LessonController::progress() → ProgressService::recordPlayback()
 ↓
UPDATE learning_progress SET resume_position_seconds, furthest_position_seconds, is_completed
 ↓
Lần sau mở lại → video tiếp tục từ vị trí đã lưu
```

## 14.2 Làm bài kiểm tra

```text
ExamAttemptPanel.tsx → POST /my/courses/{id}/quiz/attempts/start
 ↓
AttemptLifecycleService::startOrResume()
   ├─ đang có attempt in_progress → trả lại (tiếp tục)
   ├─ hết max_attempts → 422
   └─ INSERT attempts (status = 'in_progress', expires_at = now + duration_minutes)
 ↓
PATCH /my/quiz-attempts/{id}/answers  → lưu nháp vào attempts.answers (JSON)
 ↓
POST /my/quiz-attempts/{id}/submit
 ↓
ExamGradingService::finalizeAttempt()
   score = round(đúng / tổng × 100) ; passed = score >= exam.pass_score
   UPDATE attempts SET status = 'submitted', score, passed, correct_count, wrong_count
   passed → CertificateService::issueForEnrollment() → INSERT certificates
 ↓
Học viên tải PDF: GET /my/courses/{id}/certificate
   → Student/CertificateController::download() → dompdf render resources/views/certificates/
```

Bài thi quá giờ mà chưa nộp: lệnh `attempts:finalize-expired` (`app/Console/Commands/FinalizeExpiredAttempts.php`) chạy mỗi phút theo `routes/console.php`, chốt `status = 'expired'`.

---

# 15. FLOW ADMIN

## 15.1 Xem đơn hàng (chỉ đọc)

```text
Admin mở /admin → menu "Đơn hàng"
 ↓
AdminPage.tsx → adminRepositories.orders.list()
 ↓
GET /admin/orders?status=&payment_status=&page=
 ↓
Admin/OrderController::index() → OrderService::paginateForAdmin()
 ↓
SELECT orders JOIN users, courses
 ↓
Bảng đơn hàng hiển thị
```

Admin **không** đổi trạng thái đơn hàng. Trạng thái đơn chỉ do luồng thanh toán thay đổi.

## 15.2 Khóa / mở tài khoản (ví dụ admin thay đổi dữ liệu)

```text
Admin chọn tài khoản → "Khóa" + nhập lý do
 ↓
PATCH /admin/users/{id}/status { status: 'locked', reason }
 ↓
Admin/UserController::updateStatus()
 ↓
DB::transaction:
   UPDATE users SET status = 'locked'
   INSERT user_records (old_status, new_status, reason)
 ↓
Frontend cập nhật bảng; tài khoản đó đăng nhập → 422 "Tài khoản đã bị khóa"
```

Các thao tác đổi dữ liệu khác của admin:

| Thao tác | Endpoint | Controller |
| -------- | -------- | ---------- |
| Đổi vai trò | `PATCH /admin/users/{id}/role` | `Admin/UserController::updateRole` |
| Tạo/sửa/xóa khóa học | `POST/PUT/DELETE /admin/courses` | `Admin/CourseController` (+ `CourseService`) |
| Xuất bản khóa học | `PATCH /admin/courses/{id}/publish` | cần ≥1 bài học, 1 bài kiểm tra, ≥5 câu hỏi hợp lệ |
| Bài học | `POST /admin/courses/{id}/lessons`, `PUT/DELETE /admin/lessons/{id}`, `PATCH .../lessons/reorder` | `Admin/LessonController` |
| Bài kiểm tra / câu hỏi | `POST|PUT /admin/courses/{id}/quiz`, `POST /admin/quizzes/{id}/questions`, `PUT/DELETE /admin/questions/{id}` | `Admin/QuizController`, `Admin/QuestionController` |
| Danh mục | `POST/PUT/DELETE /admin/categories` | `Admin/CategoryController` |
| Tin tức | `apiResource /admin/news`, `POST /admin/news/images` | `Admin/NewsController` |
| Đánh giá | `PATCH /admin/reviews/{id}/status`, `DELETE` | `Admin/ReviewController` |
| Cài đặt thanh toán | `PUT /admin/payment-settings` | `Admin/PaymentSettingsController` → `payment_settings` |

Xóa khóa học / bài học / câu hỏi đã có ghi danh, tiến độ hay bài thi bị chặn bởi `Services/ProtectedDeletionService.php` (trả về 409 kèm danh sách phụ thuộc).

---

# 16. CÁC STATUS PHẢI NHỚ

```text
users.status        active   → được dùng
                    locked   → không đăng nhập, không gọi API được (EnsureRole chặn)

roles.code          admin / teacher / student

courses.status      draft     → chỉ admin thấy
                    published → khách thấy, mua được

orders.status       pending → đã tạo, chưa trả tiền
                    paid    → đã thanh toán, đã có Enrollment
                    failed  → người dùng hủy phiên
orders.payment_status (tính toán, không lưu)
                    draft → pending → paid | cancelled | expired (quá 15 phút)

enrollments.status  active / expired   (expires_at = enrolled_at + 1 năm)

attempts.status     in_progress → submitted | expired
attempts.passed     true khi score >= exams.pass_score

reviews.status      visible / hidden
news_posts.status   draft / published
```

---

# 17. CRUD LÀ GÌ?

```text
C = Create → INSERT
R = Read   → SELECT
U = Update → UPDATE
D = Delete → DELETE
```

Ví dụ quản lý Course trong `Admin/CourseController.php`:

```text
Admin tạo Course   → store()   → POST   /admin/courses         → INSERT courses
Admin xem Course   → index()   → GET    /admin/courses         → SELECT courses
Admin sửa Course   → update()  → PUT    /admin/courses/{id}    → UPDATE courses
Admin xóa Course   → destroy() → DELETE /admin/courses/{id}    → DELETE courses (nếu chưa có ghi danh)
```

Các bảng lịch sử (`orders`, `enrollments`, `attempts`, `certificates`, `carts`...) trong admin chỉ có **R**.

---

# 18. API LÀ GÌ?

```text
Frontend không chọc trực tiếp vào MySQL.

Frontend (React)
      ↓ HTTP + JSON
     API  (/api/v1/...)
      ↓
Backend (Laravel Controller)
      ↓
Database (MySQL)
```

Ví dụ `GET /api/v1/courses` nghĩa là Frontend nói "Tôi cần danh sách khóa học", Backend lấy từ bảng `courses` rồi trả JSON.

Danh sách đầy đủ endpoint: `BE/routes/api.php`. Phía Frontend, mỗi endpoint tương ứng một hàm trong `FE/DEMO/src/app/lib/api.ts` (ví dụ `api.courses()`, `api.createOrder()`, `api.startPayment()`).

---

# 19. REQUEST VÀ RESPONSE

Ví dụ đăng nhập.

Request (Frontend gửi):

```json
POST /api/v1/auth/login
{ "email": "student@seongon.vn", "password": "password" }
```

Response (Backend trả):

```json
{ "user": { "id": 2, "name": "...", "email": "...", "role": "student", "status": "active" },
  "token": "3|xxxxxxxx" }
```

hoặc lỗi 422:

```json
{ "message": "Thông tin đăng nhập không chính xác.", "errors": { "email": ["..."] } }
```

Kiểu dữ liệu của mọi response được khai báo trong `FE/DEMO/src/app/lib/contracts.ts` (ví dụ `ApiOrder`, `ApiEnrollment`). Phía backend định dạng JSON bằng `BE/app/Http/Resources/*Resource.php`.

---

# 20. NẾU THẦY HỎI "DỮ LIỆU NÀY LẤY TỪ ĐÂU?"

Trả lời theo công thức:

```text
UI (pages/*.tsx)
 ↓
API (lib/api.ts → routes/api.php)
 ↓
Controller
 ↓
Service / Model
 ↓
Table
```

Ví dụ:

> Danh sách "Khóa học của tôi" ở `/my-courses` do `MyCoursesPage.tsx` gọi `GET /my/courses`. Backend vào `Student/MyCourseController::index()`, đọc bảng `enrollments` của user hiện tại, join `courses`, tính % hoàn thành từ `learning_progress` qua `ProgressService`, rồi trả `EnrollmentResource` cho Frontend hiển thị.

---

# 21. NẾU THẦY HỎI "BẤM NÚT NÀY THÌ CHUYỆN GÌ XẢY RA?"

Không giải thích code. Giải thích **data flow**.

Ví dụ nút "Tôi đã thanh toán" ở trang Checkout:

```text
User click
 ↓
CheckoutPage lấy order.id và payment_session.token
 ↓
POST /orders/{id}/mock-callback { session_token, outcome: 'success' }
 ↓
Student/PaymentController::callback() → PaymentSessionService::complete()
 ↓
Kiểm tra phiên còn hạn, khóa dòng orders
 ↓
UPDATE orders (paid) → INSERT enrollments → DELETE cart_items → queue email
 ↓
Response { order, enrollment }
 ↓
CheckoutPage hiển thị "Thanh toán thành công" + nút "Vào học"
```

---

# 22. NẾU THẦY HỎI "FILE NÀY DÙNG ĐỂ LÀM GÌ?"

Tìm **responsibility**, không đọc từng dòng.

```text
BE/app/Http/Controllers/Api/Student/OrderController.php
```

> File này tiếp nhận request tạo đơn hàng của học viên, validate `course_id`, gọi `CartService::createPendingOrder()` để tạo Order trạng thái pending, rồi trả `OrderResource` về Frontend.

```text
BE/app/Services/Payment/PaymentSessionService.php
```

> File này chứa toàn bộ nghiệp vụ phiên thanh toán: tạo phiên QR có hạn 15 phút, xử lý kết quả thành công/hủy, cập nhật trạng thái đơn, tạo Enrollment và gửi email xác nhận, tất cả trong một transaction.

```text
FE/DEMO/src/app/lib/api.ts
```

> File này là lớp duy nhất của Frontend nói chuyện với Backend: ghép `VITE_API_BASE_URL`, gắn `Authorization: Bearer`, gọi `fetch`, ném `ApiError` khi lỗi.

---

# 23. NẾU THẦY HỎI "DATABASE ĐƯỢC TẠO Ở ĐÂU?"

```text
BE/database/migrations/
```

Mỗi file là một bước thay đổi cấu trúc. Ví dụ:

```text
2026_07_10_170002_create_courses_table.php   ≈  CREATE TABLE courses
2026_07_10_170004_create_orders_table.php    ≈  CREATE TABLE orders
2026_08_16_000007_rename_quizzes_to_exams.php ≈ RENAME TABLE quizzes TO exams
2026_09_09_000002_add_payment_settings_and_sessions.php ≈ CREATE TABLE payment_settings + ALTER TABLE orders
```

Lệnh tạo database từ migration:

```powershell
php artisan migrate
```

Script `Infra/build-local-web-windows.ps1` tự chạy `migrate --force` rồi seed.

---

# 24. MIGRATION LÀ GÌ?

Trước đây:

```sql
CREATE TABLE users (...)
```

Trong Laravel:

```text
file migration (PHP)
 ↓
php artisan migrate
 ↓
CREATE TABLE users
```

Lợi ích: cấu trúc database đi cùng source code. Người khác clone project, chạy `php artisan migrate` là có database giống hệt. Bảng `migrations` trong MySQL ghi lại file nào đã chạy.

---

# 25. SEED / SEEDER LÀ GÌ?

Seeder tạo dữ liệu mẫu (≈ `INSERT INTO ...` dữ liệu demo). Nằm ở `BE/database/seeders/`, điều phối bởi `DatabaseSeeder.php`:

```text
RoleSeeder                  → 3 vai trò admin / teacher / student
DemoAccountSeeder           → admin2@, admin3@, teacher@, locked@demo.seongon.vn
DatabaseSeeder              → admin@seongon.vn, student@seongon.vn, learner01..15@seongon.vn
GeneratedDemoCatalogSeeder  → khóa học, bài học, bài kiểm tra demo + student001..100@demo.seongon.vn
CompletedCourseDemoSeeder   → một khóa học đã hoàn thành cho student@seongon.vn
DemoPopularCoursesSeeder, DemoDashboardSeeder, DemoUserHistorySeeder, DemoNewsSeeder
```

Mật khẩu của tất cả tài khoản demo: `password`.

Lệnh `php artisan app:seed-demo-once` (file `app/Console/Commands/SeedDemoOnce.php`) chỉ seed khi bảng `users` còn trống, để không ghi đè dữ liệu thật.

---

# 26. CONFIG DATABASE NẰM ĐÂU?

```text
BE/.env
```

```text
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=seongon_lms
DB_USERNAME=root
DB_PASSWORD=...
FRONTEND_URL=http://localhost:5173     # cho CORS (BE/config/cors.php)
```

`BE/.env.example` mặc định để `DB_CONNECTION=sqlite`; khi cài phải đổi sang `mysql`. `BE/config/database.php` đọc các biến này.

Frontend có `FE/DEMO/.env`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Không cần thuộc password. Chỉ cần hiểu: đây là cấu hình để Backend biết kết nối tới database nào, và Frontend biết gọi API ở đâu.

---

# 27. CÁC FILE TUYỆT ĐỐI PHẢI BIẾT TRƯỚC KHI BẢO VỆ

| Muốn tìm | File / Folder |
| -------- | ------------- |
| Trang chủ | `FE/DEMO/src/app/pages/Home.tsx` |
| Login / Register | `FE/DEMO/src/app/pages/AuthPage.tsx`, `contexts/AuthContext.tsx` |
| Bảng URL frontend | `FE/DEMO/src/app/routes.tsx` |
| Course (danh sách / chi tiết) | `pages/CatalogPage.tsx`, `pages/CoursePage.tsx` |
| Giỏ hàng | `pages/CartPage.tsx`, `cart/CartContext.tsx` |
| Checkout / Payment UI | `pages/CheckoutPage.tsx`, `lib/payment.ts` |
| Học bài / Thi | `pages/LearnCoursePage.tsx`, `components/TrackedLessonVideo.tsx`, `components/ExamAttemptPanel.tsx` |
| Admin | `pages/AdminPage.tsx`, `admin/adminNavigation.ts`, `components/AdminShell.tsx` |
| Lời gọi API phía FE | `FE/DEMO/src/app/lib/api.ts`, `data/repositories/*.ts` |
| API Routes | `BE/routes/api.php` |
| Middleware vai trò | `BE/app/Http/Middleware/EnsureRole.php`, `BE/bootstrap/app.php` |
| Controller | `BE/app/Http/Controllers/Api/` (`Student/`, `Admin/`) |
| Business logic | `BE/app/Services/` |
| Thanh toán | `BE/app/Services/Payment/PaymentSessionService.php`, `MockGateway.php`, `Api/Student/PaymentController.php` |
| Order | `Api/Student/OrderController.php`, `Services/CartService.php`, `Services/OrderService.php`, `Models/Order.php` |
| Enrollment | `Services/EnrollmentService.php`, `Models/Enrollment.php` |
| Model | `BE/app/Models/` |
| JSON Resource | `BE/app/Http/Resources/` |
| Database Migration | `BE/database/migrations/` |
| Seeder | `BE/database/seeders/` (bắt đầu từ `DatabaseSeeder.php`) |
| Database Config | `BE/.env`, `BE/config/database.php` |
| CORS | `BE/config/cors.php` |
| ERD đã duyệt | `SPEC/ERD.md` |
| Test nghiệp vụ backend | `BE/tests/Feature/Api/` (ví dụ `PaymentFlowTest.php`, `CartCheckoutTest.php`, `ExamAttemptLifecycleTest.php`) |
| Script chạy local | `Infra/build-local-web-windows.ps1`, `Infra/start-local-web-windows.ps1` |

---

# 28. 10 NGHIỆP VỤ PHẢI TỰ GIẢI THÍCH ĐƯỢC

```text
1. User đăng ký như thế nào?
   AuthPage → POST /auth/register → AuthController::register → INSERT users (role student, status active) → token

2. User đăng nhập như thế nào?
   POST /auth/login → Hash::check → chặn locked → createToken → token lưu localStorage

3. Website lấy danh sách Course ở đâu?
   GET /courses → CourseController::index → courses WHERE status = 'published'

4. User mua Course như thế nào?
   Giỏ hàng (tùy chọn) → /checkout/{slug} → POST /orders → chọn phương thức → POST payment-session → QR → mock-callback

5. Order được tạo lúc nào?
   Khi bấm "Tạo đơn hàng" ở Checkout: CartService::createPendingOrder() → orders.status = pending

6. Payment được lưu ở đâu?
   Ngay trong bảng orders: payment_method, payment_session (JSON), transaction_ref, paid_at, payment_expires_at.
   Không có bảng payments riêng. Cấu hình cổng nằm ở payment_settings.

7. Thanh toán thành công thì thay đổi dữ liệu gì?
   orders.status = paid, paid_at ; INSERT enrollments (active, 1 năm) ; DELETE cart_items ; email xác nhận

8. Admin xem Order bằng cách nào?
   /admin → "Đơn hàng" → GET /admin/orders → OrderService::paginateForAdmin (chỉ đọc)

9. Admin thay đổi trạng thái gì?
   Không đổi trạng thái Order. Admin đổi users.status (locked/active, ghi user_records),
   users.role, courses.status (draft/published), reviews.status (visible/hidden).

10. Dữ liệu Database liên kết với nhau như thế nào?
    users → orders → enrollments → learning_progress / attempts / certificates ;
    courses → lessons, exams → questions → answers ; courses ↔ categories qua course_categories
```

---

# 29. CHECKLIST BẢO VỆ

## Level 1 — bắt buộc

* [ ] Frontend ở `FE/DEMO`, khởi động từ `src/main.tsx`, URL ở `src/app/routes.tsx`
* [ ] Backend ở `BE`, endpoint ở `routes/api.php`
* [ ] Database là MySQL `seongon_lms`, cấu hình ở `BE/.env`
* [ ] Kể được các bảng chính: users, courses, lessons, exams, questions, answers, carts, cart_items, orders, enrollments, learning_progress, attempts, certificates, reviews
* [ ] Kể được Controller chính: AuthController, CourseController, Student/OrderController, Student/PaymentController, Student/QuizController, Admin/CourseController, Admin/UserController
* [ ] Kể được Model ↔ bảng
* [ ] Biết `lib/api.ts` là nơi Frontend gọi API

## Level 2 — nghiệp vụ

* [ ] Login flow (Flow 1)
* [ ] Course flow (Flow 2)
* [ ] Checkout + Order flow (Flow 3)
* [ ] Payment flow, 3 trạng thái orders và 5 trạng thái payment_status (Mục 13, 16)
* [ ] Học bài + thi + chứng chỉ (Mục 14)
* [ ] Admin flow: đơn hàng chỉ đọc, khóa tài khoản có ghi user_records (Mục 15)

## Level 3 — khi bị hỏi sâu

* [ ] CRUD ↔ INSERT/SELECT/UPDATE/DELETE
* [ ] API, Request / Response, JSON Resource
* [ ] Model, Controller, Service
* [ ] Migration, Seeder, bảng `migrations`
* [ ] Foreign Key: orders.user_id → users.id, enrollments.order_id → orders.id, attempts.enrollment_id → enrollments.id
* [ ] Authentication: Sanctum token trong `personal_access_tokens`, header `Authorization: Bearer`
* [ ] Authorization: middleware `role:student` / `role:admin` (EnsureRole)
* [ ] Validation: `$request->validate([...])` trong Controller, lỗi trả 422
* [ ] Transaction + lockForUpdate trong thanh toán và bài thi (chống bấm hai lần)
* [ ] Scheduler: `attempts:finalize-expired` mỗi phút

---

# 30. CÔNG THỨC TRẢ LỜI KHI KHÔNG NHỚ CODE

```text
Ai thực hiện?
      ↓
Thực hiện hành động gì?
      ↓
Frontend gửi gì?
      ↓
Backend xử lý gì?
      ↓
Database đọc/ghi bảng nào?
      ↓
Kết quả trả về đâu?
```

Ví dụ:

> Khi học viên bấm "Tạo đơn hàng", Frontend gửi `course_id` kèm token tới Backend. Backend kiểm tra học viên chưa sở hữu khóa học, tạo Order trạng thái pending trong bảng `orders`. Học viên chọn MoMo hoặc chuyển khoản, Backend tạo phiên thanh toán 15 phút và trả mã QR. Khi học viên xác nhận, Backend cập nhật Order thành paid, tạo Enrollment trong bảng `enrollments`, xóa mục giỏ hàng và gửi email. Frontend nhận kết quả và mở nút "Vào học".

Bản đồ cuối cùng phải thuộc:

```text
                 USER
                   │
                   ▼
              FRONTEND  FE/DEMO/src/app/pages/*.tsx
                   │  lib/api.ts  (Authorization: Bearer token)
                Request  JSON
                   │
                   ▼
                 API   BE/routes/api.php  (/api/v1/...)
                   │   middleware auth:sanctum, role:student|admin
                   ▼
              CONTROLLER  BE/app/Http/Controllers/Api/**
                   │   validate
                   ▼
          BUSINESS LOGIC  BE/app/Services/**  (transaction)
                   │
                   ▼
                MODEL  BE/app/Models/*  (Eloquent)
                   │
                   ▼
              DATABASE  MySQL seongon_lms
                   │
                Response  JSON (app/Http/Resources)
                   │
                   ▼
              FRONTEND  render
                   │
                   ▼
                 USER
```

---

# PHỤ LỤC A – CHẠY DỰ ÁN TRÊN WINDOWS

Cần chuẩn bị:

* Windows với PowerShell 5.1 trở lên.
* PHP 8.3 trở lên (bật `mysqli`), Composer, Node.js/npm.
* MySQL Server chạy dưới dạng Windows service tên `MySQL<number>` (ví dụ `MySQL84`) và một database rỗng.
* Internet cho lần chuẩn bị đầu (tải dependency và phpMyAdmin).

Lần chạy đầu:

1. Sao chép `BE/.env.example` thành `BE/.env`, đổi `DB_CONNECTION=mysql` và điền `DB_*`, tạo `APP_KEY` (`php artisan key:generate`).
2. Sao chép `FE/DEMO/.env.example` thành `FE/DEMO/.env`.
3. Từ thư mục gốc chạy:

   ```bat
   Infra\build-local-web-windows.bat
   ```

   Script đồng bộ dependency theo lockfile, chạy `migrate --force`, seed demo (chỉ khi DB trống), chạy test backend/frontend và build frontend.

4. Khởi động:

   ```bat
   Infra\start-local-web-windows.bat
   ```

   Giao diện: `http://localhost:5173`. API: `http://127.0.0.1:8000`. phpMyAdmin: `http://127.0.0.1:8081`.

Tài khoản demo (mật khẩu `password`): `admin@seongon.vn`, `student@seongon.vn`, `teacher@demo.seongon.vn`, `locked@demo.seongon.vn` (bị khóa).

Chạy test:

```powershell
cd BE ; php artisan test
cd FE/DEMO ; npm test
```

Chi tiết tùy chọn và xử lý lỗi: [Infra/README.md](Infra/README.md). Frontend riêng: [FE/DEMO/README.md](FE/DEMO/README.md). Docker Compose (tùy chọn): `Infra/docker-compose.yml`.

---

# PHỤ LỤC B – TRIỂN KHAI

`vercel.json` chỉ build và phát hành frontend tĩnh từ `FE/DEMO/dist` (`npm ci --prefix FE/DEMO`, `npm run build --prefix FE/DEMO`, rewrite SPA về `index.html`). Laravel không chạy trên Vercel và phải host riêng với PHP 8.3+, MySQL, HTTPS, storage bền vững và quy trình migration an toàn.

Trước khi build frontend trên Vercel:

1. Giữ **Root Directory** là thư mục gốc repository.
2. Khai báo `VITE_API_BASE_URL` bằng URL HTTPS thật của Laravel API, kết thúc bằng `/api/v1`.
3. Cấu hình `FRONTEND_URL` của Laravel bằng origin frontend thật để CORS cho phép.
4. Không đặt token, mật khẩu hoặc secret trong biến `VITE_*`.

Repository này chưa được publish hay deploy tự động.

---

# TÀI LIỆU LIÊN QUAN

* [SPEC/ERD.md](SPEC/ERD.md) – ERD đã duyệt.
* [SPEC/learning-continuity-and-data-integrity.md](SPEC/learning-continuity-and-data-integrity.md) – đặc tả tiến độ video, vòng đời bài thi, chặn xóa.
* [docs/adr/0001-keep-direct-enrollment-ownership.md](docs/adr/0001-keep-direct-enrollment-ownership.md) – quyết định giữ `enrollments.user_id`.
* [docs/SEONGON_LMS_AUDIT_2026-08-16.md](docs/SEONGON_LMS_AUDIT_2026-08-16.md) – audit hệ thống.
* [Infra/README.md](Infra/README.md), [FE/DEMO/README.md](FE/DEMO/README.md).
