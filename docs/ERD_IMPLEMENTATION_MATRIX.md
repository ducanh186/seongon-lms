# Ma trận triển khai ERD

Tài liệu này đối chiếu 15 bảng lõi đã được duyệt trong `docs/ERD_P1.png` với database, Eloquent, Service, API, màn hình Admin và luồng Public/Student thực tế.

## 1. Cách đọc trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| `CHƯA CÓ` | Chưa có bảng hoặc chưa có luồng sử dụng. |
| `MỘT PHẦN` | Chức năng đã chạy nhưng còn tên/cột compatibility hoặc còn contract phase. |
| `ĐẠT ADMIN` | Đã có bảng, quan hệ, API và màn hình Admin dùng dữ liệu thật. |
| `HOÀN TẤT` | Đã hoàn thành toàn bộ migration, runtime và contract cuối; không còn compatibility cũ. |

**Trạng thái hiện tại:** cả 15 đối tượng đều đã đạt phạm vi Admin. Schema vẫn ở giai đoạn expand/migrate an toàn; D4, D5, cột compatibility và contract phase cuối chưa được loại bỏ.

## 2. Ma trận 15 đối tượng lõi

| Đối tượng ERD | Database và quan hệ | Service | API | Admin | Public/Student | Trạng thái |
|---|---|---|---|---|---|---|
| **Roles** | `roles`; `Role::users`, `User::role` | `RoleService` đọc Admin | `GET /admin/roles` | Danh sách chỉ đọc, có `users_count` | Nền tảng phân quyền | `ĐẠT ADMIN` |
| **Users** | `users`; liên kết Role, Orders, Enrollments | Chưa tách `UserService` riêng | Auth/Profile và `/admin/users` | Danh sách thật, lọc và khóa/mở tài khoản | Đăng nhập, hồ sơ | `ĐẠT ADMIN` |
| **Carts** | `carts`; `Cart::user/items` | `CartService` | Student `/cart*`; Admin `/admin/carts` | Danh sách chỉ đọc, số item và tổng tiền hiện tại | Cart đăng nhập lấy DB làm nguồn chính | `ĐẠT ADMIN` |
| **Cart_items** | `cart_items`; liên kết Cart, Course, User; unique `(cart_id, course_id)` | `CartService` | Student `/cart/items*`; Admin `/admin/cart-items` | Danh sách chỉ đọc | Header, Cart và Checkout dùng chung API state | `ĐẠT ADMIN` |
| **Orders** | `orders`; liên kết User, Course, Enrollment | `OrderService` | Tạo/thanh toán Student; `/admin/orders` | Danh sách chỉ đọc | Checkout một Course cho mỗi Order | `ĐẠT ADMIN` |
| **Categories** | `categories`; quan hệ nhiều-nhiều Course qua pivot | Logic hiện trong controller | Public và `/admin/categories` | CRUD dữ liệu thật | Lọc Public Catalog | `ĐẠT ADMIN` |
| **Course_categories** | `course_categories`; liên kết Course và Category | `CourseService::sync` và đọc Admin | `/admin/course-categories`; ghi qua Course API | Danh sách pivot chỉ đọc; Course dùng multi-select | Catalog đọc quan hệ pivot | `ĐẠT ADMIN` |
| **Courses** | `courses`; Categories, Lessons, Exam, Enrollments | `CourseService` tạo, sửa, publish, đọc | Public và `/admin/courses` | Bảng 13 trường thật/tổng hợp và trình sửa nội dung lồng | Catalog và Course Detail | `ĐẠT ADMIN` |
| **Enrollments** | `enrollments`; User, Course, Order, Progress, Attempts | `EnrollmentService` | `/my/courses*`; `/admin/enrollments` | Danh sách chỉ đọc | Quyền truy cập khóa học | `ĐẠT ADMIN` |
| **Exams** | `exams`; Course, Questions, Attempts | `ExamGradingService`, `LearningOperationsService` | API Student; `/admin/exams`; write lồng trong Course | Danh sách thật và trình sửa Course lồng | Làm và chấm bài kiểm tra | `ĐẠT ADMIN` |
| **Questions** | `questions`; Exam, Answers | `LearningOperationsService` đọc Admin | `/admin/questions`; write lồng theo Exam | Danh sách thật và mở trình sửa Exam | Hiển thị câu hỏi | `ĐẠT ADMIN` |
| **Answers** | `answers`; liên kết Question | `LearningOperationsService` đọc Admin | `/admin/answers`; payload lồng theo Question | Danh sách thật, thể hiện đáp án đúng/sai | Lựa chọn trả lời | `ĐẠT ADMIN` |
| **Learning_progress** | `learning_progress`; Enrollment, Lesson | `ProgressService`, `LearningOperationsService` | Hoàn thành Lesson; `/admin/learning-progress` | Danh sách chỉ đọc | Theo dõi tiến độ học | `ĐẠT ADMIN` |
| **Attempts** | `attempts`; Enrollment, Exam | `ExamGradingService`, `LearningOperationsService` | Submit/result; `/admin/attempts` | Danh sách kết quả chỉ đọc | Lịch sử làm Exam | `ĐẠT ADMIN` |
| **Lessons** | `lessons`; Course, Learning progress | `LearningOperationsService` đọc Admin | Student Lessons; `/admin/lessons`; write lồng | Danh sách thật và trình sửa Course lồng | Không gian học tập | `ĐẠT ADMIN` |

## 3. Kiến trúc thông tin Admin

Mẫu WooCommerce/WordPress chỉ được dùng để tham khảo cách tổ chức Admin và tương tác CRUD. Domain chính vẫn là Course, không đổi thành Product.

```text
SEONGON ADMIN
├─ Dashboard
├─ Tài khoản
│  ├─ Vai trò
│  └─ Học viên
├─ Thương mại
│  ├─ Giỏ hàng
│  ├─ Mục giỏ hàng
│  └─ Đơn hàng
├─ Quản lý khóa học
│  ├─ Danh mục
│  ├─ Gán danh mục
│  ├─ Khóa học
│  └─ Bài học
├─ Học tập
│  ├─ Ghi danh
│  └─ Tiến độ học tập
├─ Kiểm tra
│  ├─ Bài kiểm tra
│  ├─ Câu hỏi
│  ├─ Đáp án
│  └─ Kết quả bài kiểm tra
└─ Mở rộng
   ├─ Chứng chỉ
   ├─ Đánh giá
   └─ Tin tức
```

Các màn hình dùng chung `AdminShell`, sidebar cố định theo nhóm, `AdminDataTable` và trạng thái đang tải/rỗng/lỗi. Đối tượng có thể chỉnh sửa dùng editor hiện có; dữ liệu giao dịch và lịch sử dùng danh sách chỉ đọc có filter và pagination.

Các màn hình chủ động chỉ đọc gồm: **Carts, Cart_items, Orders, Enrollments, Learning_progress, Attempts**.

## 4. Luồng dữ liệu chính

### 4.1. Khóa học và nhiều danh mục

```text
AdminPage
→ adminRepositories
→ Admin Course API
→ CourseController
→ CourseService
→ Eloquent
→ courses + course_categories
→ Public Course API
→ Public Catalog
```

`course_categories` là quan hệ nhiều-nhiều có thẩm quyền. `courses.category_id` chỉ mirror Category đầu để tương thích writer cũ trong thời gian chuyển tiếp.

### 4.2. Giỏ hàng và thanh toán

```text
Student UI
→ Cart API
→ CartController
→ CartService
→ carts + cart_items
→ Order/payment
→ orders
→ enrollments
→ xóa cart_items đã mua
```

ERD không có `order_items`, vì vậy một Cart có thể chứa nhiều Courses nhưng mỗi Order vẫn đại diện cho một Course.

### 4.3. Học tập và kiểm tra

```text
Enrollment
├─ Learning_progress → Lesson
└─ Attempt → Exam → Question → Answer
```

## 5. Trạng thái expand → migrate → contract

### 5.1. Vai trò và người dùng

- Đã thêm `roles` và `users.role_id`.
- Đã backfill Role cho Users hiện có.
- Cột `users.role` cũ vẫn còn để tương thích.
- Contract sau cùng mới được phép xóa cột cũ khi toàn bộ reader/writer đã chuyển sang `role_id`.

### 5.2. Khóa học và danh mục

- Đã thêm và backfill `course_categories`.
- Course create/edit ghi nhiều Category bằng `categories()->sync()`.
- Public Catalog và Admin đọc Categories từ pivot.
- `courses.category_id` vẫn mirror Category đầu; chưa xóa ở milestone này.

### 5.3. Bài kiểm tra, câu hỏi và đáp án

- `quizzes` đã chuyển tên thành `exams`.
- `question_options` đã chuyển tên thành `answers`.
- `quiz_attempts` đã chuyển thành `attempts` và dùng `exam_id`, `attempt_number`.
- Các alias compatibility chỉ được xóa trong contract phase riêng.

### 5.4. Tiến độ học tập

- `learning_progress` là bảng đích theo ERD.
- `lesson_progress` còn tồn tại tạm thời để tương thích rollout.
- Reader Admin đọc trực tiếp `learning_progress`.
- Chỉ xóa bảng cũ sau verification window và catch-up backfill cuối.

### 5.5. Đơn hàng và ghi danh

- `Enrollment` tiếp tục là chủ sở hữu quyền học giữa User và Course.
- `enrollments.order_id` cho phép null để hỗ trợ Admin grant mà không tạo Order 0 đồng giả.
- `enrollments.user_id` được giữ theo quyết định kiến trúc hiện tại.
- Không tạo bảng `order_items` ngoài ERD.

## 6. Quy tắc dữ liệu hiển thị ở Admin

Mọi giá trị hiển thị phải thuộc một trong ba nhóm:

1. Cột thật của bảng.
2. Quan hệ thật từ Eloquent/ERD.
3. Aggregate tính từ database như `COUNT`, `AVG`, `EXISTS`.

Không thêm cột database chỉ để làm đẹp bảng Admin. Transaction/history không có thao tác xóa tùy tiện.

## 7. Bảng ngoài ERD lõi

Các bảng sau được giữ vì chức năng hiện có nhưng không được tính vào 15 bảng lõi:

- `reviews`: đánh giá khóa học.
- `news_posts`: tin tức và kiến thức.
- `certificates`: chứng chỉ.
- Các bảng Laravel infrastructure: migrations, cache, jobs, sessions, tokens và bảng hỗ trợ khác.
- `lesson_progress`: compatibility tạm thời trong giai đoạn chuyển tiếp.

Vì vậy phpMyAdmin có nhiều hơn 15 bảng là đúng. Yêu cầu nghiệm thu là 15 bảng lõi phải tồn tại, quan hệ đúng và có bề mặt quản trị tương ứng; không phải toàn database chỉ được có đúng 15 bảng.

## 8. Điều kiện để chuyển sang `HOÀN TẤT`

- Tất cả writer cũ đã dừng ghi vào cột/bảng compatibility.
- Catch-up backfill cuối đã chạy và được kiểm tra.
- Toàn bộ test backend/frontend và manual test đều xanh.
- Có deployment contract riêng để xóa legacy identifiers.
- Không thay đổi 15 bảng ERD đã được duyệt và không phát minh bảng core mới.
