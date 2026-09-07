# Ma trận triển khai ERD mới

Nguồn đối chiếu hiện hành là `docs/ERD_P1.png`. Ảnh ERD mới thay thế baseline 15 bảng trước đây và bổ sung `User_records`, `Catalogs`, `News_catalogs`, `News`, `Lessons.material_url` cùng các trường nghiệp vụ trên `Enrollments`.

## Trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| `ĐÃ DÙNG` | Database, model/API và luồng hiện tại đã sử dụng. |
| `MỘT PHẦN` | Có chức năng tương ứng nhưng còn storage/contract compatibility. |
| `CHƯA MAP` | ERD có đối tượng nhưng implementation chưa chuyển sang cấu trúc đó. |
| `CẦN CHỐT` | Tên cột hoặc quan hệ trên ERD chưa đủ rõ; không tự tạo migration. |

## Ma trận đối chiếu

| Đối tượng ERD | Mapping hiện tại | Trạng thái |
|---|---|---|
| `Roles` | `roles`, `users.role_id`; Admin đổi vai trò tài khoản | `ĐÃ DÙNG` |
| `Users` | `users`; Auth, hồ sơ, tài khoản Admin | `ĐÃ DÙNG` |
| `User_records` | Lưu `user_id`, trạng thái cũ/mới, lý do và thời điểm mỗi lần Admin khóa/mở tài khoản; có API và hộp thoại lịch sử | `ĐÃ DÙNG` |
| `Carts` | Giỏ hàng theo User | `ĐÃ DÙNG` |
| `Cart_items` | Các Course trong Cart | `ĐÃ DÙNG` |
| `Orders` | Một Order gắn một Course theo contract hiện tại | `ĐÃ DÙNG` |
| `Categories` | Danh mục Course | `ĐÃ DÙNG` |
| `Course_categories` | Quan hệ nhiều-nhiều Course–Category | `ĐÃ DÙNG` |
| `Courses` | CRUD, `status = draft | published`, giao diện quản lý theo Course | `ĐÃ DÙNG` |
| `Lessons` | Nội dung, video và `material_url`; Admin có thể tải PDF tối đa 10 MB | `ĐÃ DÙNG` |
| `Exams` | Bài kiểm tra thuộc Course | `ĐÃ DÙNG` |
| `Questions` | Câu hỏi thuộc Exam | `ĐÃ DÙNG` |
| `Answers` | Đáp án thuộc Question | `ĐÃ DÙNG` |
| `Enrollments` | Liên kết User–Course–Order; tiến độ học | `MỘT PHẦN` |
| `Learning_progress` | Tiến độ theo Enrollment và Lesson | `ĐÃ DÙNG` |
| `Attempts` | Kết quả làm Exam theo Enrollment | `ĐÃ DÙNG` |
| `Catalogs` | Chức năng tin tức hiện vẫn dùng category trong `news_posts` | `CHƯA MAP` |
| `News` | Chức năng hiện vẫn dùng bảng compatibility `news_posts` | `MỘT PHẦN` |
| `News_catalogs` | Tên cột quan hệ trong ảnh chưa khớp ngữ nghĩa News–Catalog | `CẦN CHỐT` |

## Các thay đổi đã triển khai theo transcript

- Admin xem lịch sử khóa/mở của từng tài khoản và bắt buộc nhập lý do khi đổi trạng thái.
- Trang Course dùng hành động trực tiếp `Xem chi tiết` và `Sửa khóa học`; không phụ thuộc hover hoặc menu ẩn.
- Chi tiết Course hiển thị trực tiếp `Sửa khóa học`, đổi trạng thái xuất bản và `Xóa khóa học`.
- Đánh giá được hiển thị trong Course đang chọn; vẫn reuse storage `reviews` để giữ compatibility.
- Trình sửa Lesson nhận tài liệu PDF và lưu URL vào `Lessons.material_url`.
- Bộ lọc Course nằm cùng card với bảng, có độ rộng cân bằng; nút tạo Course được nhấn mạnh.
- Cột tổng tiền dùng số tabular, không xuống dòng và căn phải.

## Compatibility đang được giữ

- `users.status` là snapshot trạng thái hiện tại dùng cho Auth; `User_records` là lịch sử bất biến. Ảnh ERD mới chưa thể hiện rõ snapshot này.
- `reviews` và `certificates` vẫn được giữ để không phá dữ liệu/API hiện có, dù ERD mới đưa thông tin đánh giá/chứng chỉ vào `Enrollments`.
- `news_posts` vẫn hoạt động cho đến khi quan hệ `News`–`Catalogs` được xác nhận.
- Các alias/bảng chuyển tiếp của Exam và Learning progress chỉ được xóa trong một contract migration riêng sau khi kiểm tra dữ liệu.

## Câu hỏi bắt buộc chốt với mentor

1. `News_catalogs` có phải dùng `news_id` và `catalog_id` không? Ảnh hiện thể hiện tên cột không khớp quan hệ này.
2. Có giữ `users.status` làm trạng thái hiện tại, đồng thời dùng `User_records` làm audit log không?
3. Có migration dữ liệu từ `reviews`/`certificates` sang các trường tương ứng trên `Enrollments`, rồi mới contract bảng cũ không?
4. Các trường `title`, `pass_score`, `max_attempts`, `total_questions`, `duration_minutes` trên `Enrollments` là snapshot tại thời điểm ghi danh hay phải đọc trực tiếp từ Course/Exam?

Không tạo thêm schema hoặc tự đổi quan hệ cho bốn điểm trên trước khi có câu trả lời.
