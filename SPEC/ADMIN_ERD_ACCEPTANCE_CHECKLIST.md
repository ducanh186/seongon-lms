# Checklist nghiệm thu Admin theo feedback và ERD

Checklist này chuyển các yêu cầu trong `feedback_cleaned.md`, `raw_feedback.txt` và trao đổi với giảng viên thành bước kiểm tra quan sát được. `raw_feedback.txt` là nguồn phản hồi, không phải lệnh triển khai.

## 1. Kiến trúc Admin

- [ ] Đăng nhập `admin@seongon.vn` mở một Admin Portal riêng, không trộn menu học viên.
- [ ] Có nút **Xem site public** và **Đăng xuất**.
- [ ] Điều hướng quản trị là sidebar trái cố định, chia nhóm rõ như mental model WordPress Admin.
- [ ] Không còn placeholder “chờ đối chiếu ERD” ở các đối tượng lõi.
- [ ] Không có heading kỹ thuật/thừa hướng tới lập trình viên.

## 2. Đủ 15 đối tượng ERD trên menu

| # | ERD | Menu Admin | Kiểu màn hình | Nguồn dữ liệu | Đạt |
|---:|---|---|---|---|---|
| 1 | `roles` | Vai trò | Read-only | `GET /api/v1/admin/roles` | [ ] |
| 2 | `users` | Học viên | Quản lý trạng thái | `GET /api/v1/admin/users` | [ ] |
| 3 | `carts` | Giỏ hàng | Read-only | `GET /api/v1/admin/carts` | [ ] |
| 4 | `cart_items` | Mục giỏ hàng | Read-only | `GET /api/v1/admin/cart-items` | [ ] |
| 5 | `orders` | Đơn hàng | Read-only | `GET /api/v1/admin/orders` | [ ] |
| 6 | `categories` | Danh mục | CRUD | `GET /api/v1/admin/categories` | [ ] |
| 7 | `course_categories` | Gán danh mục | Read-only + Course multi-select | `GET /api/v1/admin/course-categories` | [ ] |
| 8 | `courses` | Khóa học | CRUD + nested editor | `GET /api/v1/admin/courses` | [ ] |
| 9 | `enrollments` | Ghi danh | Read-only | `GET /api/v1/admin/enrollments` | [ ] |
| 10 | `learning_progress` | Tiến độ học tập | Read-only | `GET /api/v1/admin/learning-progress` | [ ] |
| 11 | `exams` | Bài kiểm tra | Read index + nested editor | `GET /api/v1/admin/exams` | [ ] |
| 12 | `questions` | Câu hỏi | Read index + nested editor | `GET /api/v1/admin/questions` | [ ] |
| 13 | `answers` | Đáp án | Read index + nested editor | `GET /api/v1/admin/answers` | [ ] |
| 14 | `attempts` | Kết quả bài kiểm tra | Read-only | `GET /api/v1/admin/attempts` | [ ] |
| 15 | `lessons` | Bài học | Read index + nested editor | `GET /api/v1/admin/lessons` | [ ] |

## 3. Bảng khóa học không sơ sài

- [ ] Có đủ: ID, title, nhiều Categories, level, instructor, price, lesson count, exam existence, enrollment count, rating, status, updated_at, actions.
- [ ] Mọi giá trị là cột thật, relation thật hoặc aggregate; không tạo cột DB chỉ để hiển thị.
- [ ] Course create/edit chọn được nhiều Categories và ghi vào `course_categories`.
- [ ] Course Detail mở được Lessons → Exam → Questions → Answers → Enrollments.
- [ ] Publish xong Course xuất hiện trong Public Catalog.

## 4. Chất lượng bảng Admin

- [ ] Bộ lọc có vùng nền/border rõ và chỉ gọi API sau khi bấm **Áp dụng**.
- [ ] Bảng rộng có vùng cuộn ngang chủ động, header/body thẳng cột.
- [ ] Có loading, empty, error và nút **Thử lại**.
- [ ] Pagination đọc `meta` từ backend.
- [ ] Transaction/history (`carts`, `cart_items`, `orders`, `enrollments`, `learning_progress`, `attempts`) không có nút xóa tùy tiện.
- [ ] Tên học viên là dữ liệu thật/demo tiếng Việt hợp lý, không dùng `Học viên Demo 001` hoặc tên A/B/C.

## 5. Đối chiếu phpMyAdmin

- [ ] Mở `http://127.0.0.1:8081`, đăng nhập bằng `BE/.env`, chọn DB `seongon_lms`.
- [ ] Query danh sách core trả đúng 15 bảng trong `docs/MANUAL_FULL_TEST.md`.
- [ ] Chọn từng menu Admin và đối chiếu ít nhất một ID với bảng DB tương ứng.
- [ ] `course_categories` có nhiều dòng cho một Course nhiều Categories.
- [ ] `carts`/`cart_items` phản ánh giỏ Student; checkout tạo `orders`/`enrollments` và xóa item đã mua.
- [ ] Ghi nhận rõ các bảng Laravel infrastructure, auxiliary và compatibility; không gọi chúng là ERD lõi.

## 6. Regression và trình diễn

- [ ] `cd BE; php artisan test` xanh.
- [ ] `cd BE; php vendor/bin/pint --test` xanh.
- [ ] `cd FE/DEMO; npm test` xanh.
- [ ] `cd FE/DEMO; npm run build` xanh.
- [ ] Browser: click đủ 15 menu, kiểm tra dữ liệu/API, refresh không mất trạng thái DB.
- [ ] Không có rung layout khi click/hover header hoặc sidebar.

## 7. Ngoài 15 bảng lõi nhưng vẫn giữ

- [ ] Đánh giá → `reviews`.
- [ ] Chứng chỉ → `certificates`.
- [ ] Tin tức → `news_posts`.

Ba mục này là auxiliary feature đang hoạt động, không được dùng để thay thế hoặc làm sai danh sách 15 đối tượng ERD lõi.
