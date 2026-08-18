# Danh sách kiểm tra nghiệm thu Admin theo phản hồi và ERD

Tài liệu này chuyển các yêu cầu trong `feedback_cleaned.md`, `raw_feedback.txt` và trao đổi với giảng viên thành những bước có thể quan sát, kiểm tra và đánh dấu. `raw_feedback.txt` chỉ là nguồn phản hồi, không phải lệnh chạy hệ thống.

## 1. Kiến trúc khu vực Admin

- [ ] Đăng nhập bằng `admin@seongon.vn` mở một Admin Portal riêng, không trộn menu của học viên.
- [ ] Header Admin có **Xem site public** và **Đăng xuất**.
- [ ] Điều hướng quản trị nằm ở sidebar trái cố định, chia nhóm rõ theo cách tổ chức của WordPress Admin.
- [ ] Không còn thông báo “chờ đối chiếu ERD” ở bất kỳ đối tượng lõi nào.
- [ ] Không hiển thị heading kỹ thuật hoặc nội dung thừa hướng tới lập trình viên.
- [ ] Click hoặc hover sidebar/header không làm chiều rộng trang thay đổi hay gây rung giao diện.

## 2. Đủ 15 đối tượng ERD trên menu

| STT | Đối tượng ERD | Menu Admin | Chế độ | Nguồn dữ liệu | Đạt |
|---:|---|---|---|---|---|
| 1 | `roles` | Vai trò | Chỉ đọc | `GET /api/v1/admin/roles` | [ ] |
| 2 | `users` | Học viên | Quản lý trạng thái | `GET /api/v1/admin/users` | [ ] |
| 3 | `carts` | Giỏ hàng | Chỉ đọc | `GET /api/v1/admin/carts` | [ ] |
| 4 | `cart_items` | Mục giỏ hàng | Chỉ đọc | `GET /api/v1/admin/cart-items` | [ ] |
| 5 | `orders` | Đơn hàng | Chỉ đọc | `GET /api/v1/admin/orders` | [ ] |
| 6 | `categories` | Danh mục | Thêm, sửa, xóa | `GET /api/v1/admin/categories` | [ ] |
| 7 | `course_categories` | Gán danh mục | Chỉ đọc; sửa trong Course | `GET /api/v1/admin/course-categories` | [ ] |
| 8 | `courses` | Khóa học | Thêm, sửa, xuất bản | `GET /api/v1/admin/courses` | [ ] |
| 9 | `enrollments` | Ghi danh | Chỉ đọc | `GET /api/v1/admin/enrollments` | [ ] |
| 10 | `learning_progress` | Tiến độ học tập | Chỉ đọc | `GET /api/v1/admin/learning-progress` | [ ] |
| 11 | `exams` | Bài kiểm tra | Danh sách và trình sửa lồng | `GET /api/v1/admin/exams` | [ ] |
| 12 | `questions` | Câu hỏi | Danh sách và trình sửa lồng | `GET /api/v1/admin/questions` | [ ] |
| 13 | `answers` | Đáp án | Danh sách và trình sửa lồng | `GET /api/v1/admin/answers` | [ ] |
| 14 | `attempts` | Kết quả bài kiểm tra | Chỉ đọc | `GET /api/v1/admin/attempts` | [ ] |
| 15 | `lessons` | Bài học | Danh sách và trình sửa lồng | `GET /api/v1/admin/lessons` | [ ] |

## 3. Bảng khóa học không sơ sài

- [ ] Bảng có đủ: ID, tên khóa học, nhiều danh mục, cấp độ, giảng viên, học phí, số bài học, tình trạng bài kiểm tra, số ghi danh, điểm đánh giá, trạng thái, ngày cập nhật và thao tác.
- [ ] Mọi giá trị là cột thật, quan hệ thật hoặc số liệu tổng hợp; không tạo cột DB chỉ để hiển thị.
- [ ] Course create/edit chọn được nhiều Categories và ghi quan hệ vào `course_categories`.
- [ ] Course Detail mở được Lessons → Exam → Questions → Answers → Enrollments.
- [ ] Publish xong, Course xuất hiện trong Public Catalog.

## 4. Chất lượng bảng quản trị

- [ ] Bộ lọc có nền và viền rõ; API chỉ nhận bộ lọc mới sau khi bấm **Áp dụng**.
- [ ] Bảng rộng có vùng cuộn ngang chủ động; header và body thẳng cột.
- [ ] Có đủ trạng thái đang tải, không có dữ liệu, lỗi và nút **Thử lại**.
- [ ] Phân trang đọc `meta` từ backend.
- [ ] Dữ liệu giao dịch/lịch sử (`carts`, `cart_items`, `orders`, `enrollments`, `learning_progress`, `attempts`) không có nút xóa tùy tiện.
- [ ] Tên học viên là dữ liệu thật hoặc tên demo tiếng Việt hợp lý; không dùng `Học viên Demo 001` hay A/B/C.

## 5. Đối chiếu bằng phpMyAdmin

- [ ] Mở `http://127.0.0.1:8081`, đăng nhập bằng tài khoản MySQL trong `BE/.env`, chọn DB `seongon_lms`.
- [ ] Xác nhận đây là công cụ phpMyAdmin chính thức chạy cục bộ, không phải trang `/admin` của LMS.
- [ ] Query kiểm tra core trong `docs/MANUAL_FULL_TEST.md` trả đúng 15 bảng.
- [ ] Chọn từng menu Admin và đối chiếu ít nhất một ID với bảng DB tương ứng.
- [ ] Một Course có nhiều Categories tạo nhiều dòng trong `course_categories`.
- [ ] `carts` và `cart_items` phản ánh giỏ Student; checkout tạo `orders`, `enrollments` và xóa mục đã mua.
- [ ] Phân biệt 15 bảng lõi với bảng Laravel infrastructure, bảng auxiliary và bảng compatibility.

## 6. Kiểm tra hồi quy và trình diễn

- [ ] `cd BE; php artisan test` chạy xanh.
- [ ] `cd BE; php vendor/bin/pint --test` chạy xanh.
- [ ] `cd FE/DEMO; npm test` chạy xanh.
- [ ] `cd FE/DEMO; npm run build` chạy xanh.
- [ ] Trên browser, click đủ 15 menu và xác nhận dữ liệu thật hoặc trạng thái rỗng hợp lệ.
- [ ] Refresh browser không làm mất dữ liệu đang được lưu trong database.

## 7. Chức năng ngoài 15 bảng lõi

- [ ] Đánh giá sử dụng `reviews`.
- [ ] Chứng chỉ sử dụng `certificates`.
- [ ] Tin tức sử dụng `news_posts`.

Ba mục trên là chức năng auxiliary đang hoạt động. Chúng không thay thế và không làm thay đổi danh sách 15 đối tượng ERD lõi.
