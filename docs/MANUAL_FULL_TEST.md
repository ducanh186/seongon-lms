# Hướng dẫn kiểm thử nghiệm thu toàn bộ SEONGON LMS

## 1. Khởi động hệ thống local

### 1.1. Điều kiện trên máy mới

Máy khách phải cài sẵn PHP 8.2 trở lên có `mysqli`, Composer, Node.js/npm và MySQL Server. Hai file `.bat` không cài các chương trình hệ thống này.

Kiểm tra MySQL Windows Service:

```powershell
Get-Service | Where-Object Name -Match '^MySQL\d+$'
```

Nếu service đang dừng, mở PowerShell bằng quyền Administrator rồi chạy, thay `MySQL84` bằng tên tìm được:

```powershell
Start-Service -Name MySQL84
```

Nếu không tìm thấy service nào, phải cài MySQL Server trước. phpMyAdmin chỉ quản trị MySQL, không thay thế MySQL Server.

Tạo database lần đầu bằng MySQL client; nhập password của MySQL khi được hỏi:

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS seongon_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Nếu chưa có `BE\.env`, tạo từ mẫu rồi sửa các biến `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` cho đúng máy khách:

```powershell
Copy-Item .\BE\.env.example .\BE\.env
Set-Location .\BE
php artisan key:generate
Set-Location ..
```

Frontend không bắt buộc có `.env`; khi thiếu `VITE_API_BASE_URL`, ứng dụng dùng mặc định `http://127.0.0.1:8000/api/v1`.

### 1.2. Chạy sau khi clone hoặc pull

Từ `D:\CODE\seongon-lms`, chạy:

```powershell
.\Infra\build-local-web-windows.bat
.\Infra\start-local-web-windows.bat
```

Ở lần build đầu tiên, script sẽ:

1. Kiểm tra PHP và extension `mysqli`.
2. Tự tải phpMyAdmin 5.2.3 từ nguồn chính thức.
3. Xác minh SHA-256 trước khi giải nén.
4. Tạo cấu hình cookie local, không ghi MySQL password vào file phpMyAdmin.
5. Cài Composer/npm dependencies nếu thiếu.
6. Chạy migrations, backend tests, frontend tests và production build.

Nếu chỉ muốn chuẩn bị riêng phpMyAdmin:

```powershell
.\Infra\build-local-web-windows.bat -PreparePhpMyAdminOnly
```

Sau đó `start-local-web-windows.bat` tự tìm service `MySQL80`, `MySQL84` hoặc `MySQL<number>` tương ứng, khởi động Laravel, Vite và phpMyAdmin.

Nếu frontend hiện **Không thể tải danh mục khóa học**, kiểm tra backend và API database:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/up
Invoke-RestMethod http://127.0.0.1:8000/api/v1/categories
```

- `/up` lỗi: Laravel chưa chạy; xem file `backend-*.err.log` mới nhất trong `%TEMP%\seongon-lms-local-web\`.
- `/up` trả `200` nhưng Categories lỗi: kiểm tra MySQL, `BE\.env` và chạy lại migrations.
- Cả hai đều thành công: refresh cứng frontend bằng `Ctrl+F5`.

Mở các địa chỉ:

- Website: `http://localhost:5173`
- API health: `http://127.0.0.1:8000/up`
- phpMyAdmin: `http://127.0.0.1:8081`
- Database: `seongon_lms`

Tài khoản ứng dụng demo dùng mật khẩu `password`:

- Admin: `admin@seongon.vn`
- Student: `student@seongon.vn`

Tài khoản đăng nhập phpMyAdmin là tài khoản MySQL trong `BE/.env`, không phải tài khoản Admin của website.

## 2. phpMyAdmin này đến từ đâu?

Trang tại `http://127.0.0.1:8081` là **phpMyAdmin 5.2.3 chính thức của The phpMyAdmin Team**. Đây là công cụ quản trị MySQL độc lập, không phải trang do Laravel hay React của SEONGON LMS tạo ra.

Nguồn phát hành chính thức: [phpMyAdmin 5.2.3](https://www.phpmyadmin.net/files/5.2.3/). Gói chính thức có bản `phpMyAdmin-5.2.3-all-languages.zip`; project local đang dùng mã đã giải nén từ dòng phát hành này.

Trong môi trường Windows hiện tại:

1. `Infra/build-local-web-windows.ps1` tải và giải nén bộ mã tại `Infra/.native-runtime/phpmyadmin-5.2.3`.
2. Thư mục `.native-runtime` bị Git bỏ qua vì đây là runtime cục bộ, không phải source code của LMS.
3. `Infra/start-local-web-windows.ps1` chạy lệnh tương đương:

```powershell
php.exe -S 127.0.0.1:8081 -t Infra/.native-runtime/phpmyadmin-5.2.3
```

4. phpMyAdmin kết nối MySQL tại `127.0.0.1:3306` và cho phép xem bảng, cột, khóa ngoại, dữ liệu và Designer.
5. Trang `/admin` của LMS quản lý nghiệp vụ; phpMyAdmin quản lý trực tiếp database. Hai trang có mục đích khác nhau.

## 3. Kiểm tra Admin có đủ đối tượng ERD

1. Đăng nhập Admin.
2. Xác nhận sidebar trái có đủ 15 mục lõi: **Vai trò, Học viên, Giỏ hàng, Mục giỏ hàng, Đơn hàng, Danh mục, Gán danh mục, Khóa học, Bài học, Ghi danh, Tiến độ học tập, Bài kiểm tra, Câu hỏi, Đáp án, Kết quả bài kiểm tra**.
3. Click từng mục. Mỗi màn hình phải hiện bảng dữ liệu thật, trạng thái không có dữ liệu hợp lệ hoặc lỗi API có nút thử lại; không được hiện placeholder chờ ERD.
4. Kiểm tra các màn hình giao dịch/lịch sử chỉ đọc: Carts, Cart items, Orders, Enrollments, Learning progress và Attempts.
5. Từ Câu hỏi hoặc Đáp án, bấm **Mở bài kiểm tra**; trình sửa Course hiện có phải được mở.
6. Xác nhận các chức năng auxiliary vẫn có riêng: Chứng chỉ, Đánh giá và Tin tức.
7. Ghi kết quả vào `SPEC/ADMIN_ERD_ACCEPTANCE_CHECKLIST.md`.

## 4. Luồng khóa học: Admin → Cơ sở dữ liệu → Danh mục công khai

1. Trong Admin, mở **Khóa học**.
2. Tạo bản nháp tên `MANUAL FULL COURSE <timestamp>`.
3. Chọn hai Categories rồi lưu.
4. Thêm một Lesson.
5. Tạo một Exam, một Question và ít nhất hai Answers; chỉ đánh dấu một Answer đúng.
6. Publish Course.
7. Trong phpMyAdmin, thay tiêu đề bên dưới rồi chạy:

```sql
SET @course_id := (
  SELECT id
  FROM courses
  WHERE title = 'MANUAL FULL COURSE <timestamp>'
  ORDER BY id DESC
  LIMIT 1
);

SELECT id, title, category_id, status, updated_at
FROM courses
WHERE id = @course_id;

SELECT cc.course_id, c.id AS category_id, c.name
FROM course_categories cc
JOIN categories c ON c.id = cc.category_id
WHERE cc.course_id = @course_id
ORDER BY c.id;

SELECT id, course_id, title, position, sort_order
FROM lessons
WHERE course_id = @course_id;

SELECT e.id AS exam_id, e.course_id, q.id AS question_id,
       a.id AS answer_id, a.is_correct
FROM exams e
JOIN questions q ON q.exam_id = e.id
JOIN answers a ON a.question_id = q.id
WHERE e.course_id = @course_id
ORDER BY q.id, a.id;
```

Kết quả mong đợi: một Course `published`, hai dòng `course_categories`, một Lesson, một Exam, một Question và các Answers vừa tạo.

8. Đăng xuất, mở Public Catalog, tìm Course vừa tạo và lọc theo từng Category. Course phải xuất hiện ở cả hai bộ lọc.

## 5. Luồng giỏ hàng và thanh toán: Học viên → Cơ sở dữ liệu → Khóa học của tôi

Chọn một Course trả phí đã publish mà `student@seongon.vn` chưa sở hữu.

1. Đăng nhập Student.
2. Thêm Course A vào Cart.
3. Refresh trang; Course A vẫn phải còn vì Cart của Student đăng nhập lấy từ API/database.
4. Trong phpMyAdmin, chạy:

```sql
SET @student_id := (
  SELECT id FROM users WHERE email = 'student@seongon.vn' LIMIT 1
);

SELECT id, user_id, created_at, updated_at
FROM carts
WHERE user_id = @student_id;

SELECT ci.id AS cart_item_id, ci.cart_id, ci.user_id,
       ci.course_id, c.title, c.price
FROM cart_items ci
JOIN carts ca ON ca.id = ci.cart_id
JOIN courses c ON c.id = ci.course_id
WHERE ca.user_id = @student_id
ORDER BY ci.id;
```

5. Thêm Course B. Query thứ hai phải trả hai Course khác nhau.
6. Thêm lại Course B. Database không được tạo dòng trùng `(cart_id, course_id)`.
7. Xóa Course A. Dòng tương ứng phải biến mất khỏi `cart_items`.
8. Checkout Course B và chọn thanh toán Card hoặc QR.
9. Chạy:

```sql
SELECT o.id AS order_id, o.user_id, o.course_id,
       o.amount, o.total_amount, o.status, o.payment_method,
       o.transaction_ref, o.paid_at
FROM orders o
WHERE o.user_id = @student_id
ORDER BY o.id DESC
LIMIT 10;

SELECT e.id AS enrollment_id, e.user_id, e.course_id,
       e.order_id, e.enrolled_at, e.expires_at
FROM enrollments e
WHERE e.user_id = @student_id
ORDER BY e.id DESC
LIMIT 10;

SELECT ci.id, ci.course_id
FROM cart_items ci
JOIN carts ca ON ca.id = ci.cart_id
WHERE ca.user_id = @student_id;
```

Kết quả mong đợi: có một Order `paid`, một Enrollment liên kết và Course B không còn trong `cart_items`.

10. Mở **Khóa học của tôi**. Course B phải xuất hiện.

## 6. Luồng học tập

1. Mở Course B từ **Khóa học của tôi**.
2. Mở một Lesson và đánh dấu hoàn thành.
3. Nộp Exam một lần.
4. Chạy:

```sql
SELECT lp.id, lp.enrollment_id, lp.lesson_id,
       lp.is_completed, lp.completed_at
FROM learning_progress lp
JOIN enrollments e ON e.id = lp.enrollment_id
WHERE e.user_id = @student_id
ORDER BY lp.id DESC
LIMIT 20;

SELECT a.id, a.enrollment_id, a.exam_id,
       a.score, a.passed, a.attempt_number, a.submitted_at
FROM attempts a
JOIN enrollments e ON e.id = a.enrollment_id
WHERE e.user_id = @student_id
ORDER BY a.id DESC
LIMIT 20;
```

Kết quả mong đợi: Lesson đã hoàn thành có trong `learning_progress`; lần nộp Exam có trong `attempts`.

## 7. Kiểm tra tình huống lỗi

- Guest nhìn thấy Cart nhưng phải đăng nhập trước khi dùng Cart/Checkout có xác thực.
- Student không thể thêm cùng một Course hai lần.
- Student không thể thêm Course đang sở hữu.
- `localStorage` không được là nguồn dữ liệu chính của Cart khi Student đã đăng nhập.
- Thanh toán thất bại không được tạo Enrollment và không được xóa Cart item.

## 8. Kiểm tra tính toàn vẹn ERD bằng phpMyAdmin

Chọn DB `seongon_lms`, mở tab **SQL** và chạy:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'roles', 'users', 'carts', 'cart_items', 'orders',
    'categories', 'course_categories', 'courses', 'enrollments',
    'exams', 'questions', 'answers', 'learning_progress',
    'attempts', 'lessons'
  )
ORDER BY table_name;
```

Kết quả mong đợi: đúng 15 dòng.

Kiểm tra toàn bộ khóa ngoại của 15 bảng lõi:

```sql
SELECT table_name, column_name,
       referenced_table_name, referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND referenced_table_name IS NOT NULL
  AND table_name IN (
    'roles', 'users', 'carts', 'cart_items', 'orders',
    'categories', 'course_categories', 'courses', 'enrollments',
    'exams', 'questions', 'answers', 'learning_progress',
    'attempts', 'lessons'
  )
ORDER BY table_name, column_name;
```

Schema hiện tại đang ở giai đoạn expand/migrate an toàn, chưa chạy contract cuối. Vì vậy còn `lesson_progress`, các cột compatibility, bảng hệ thống Laravel và các bảng auxiliary `reviews`, `news_posts`, `certificates`. Không xóa các mục này trong lúc kiểm thử.
