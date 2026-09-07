# Khoảng cách giữa ERD mới và implementation

Nguồn chuẩn: `docs/ERD_P1.png`. Tài liệu này chỉ ghi các phần chưa thể contract an toàn; không phải phê duyệt tự động cho migration mới.

## 1. User status history

- ERD mới có `User_records`.
- Đã triển khai bảng, model, resource, API đọc lịch sử và ghi audit khi Admin đổi trạng thái.
- Runtime vẫn cần `users.status` để xác thực trạng thái hiện tại.
- **Cần mentor chốt:** giữ mô hình snapshot + audit log, hay trạng thái hiện tại phải suy ra từ record mới nhất.

## 2. Lesson documents

- ERD mới có `Lessons.material_url`.
- Đã triển khai tải PDF tối đa 10 MB; file được lưu và URL gắn với Lesson.
- Không tạo `Materials`, `Documents` hoặc `Attachments`.

## 3. Reviews

- ERD mới thể hiện thông tin feedback trên `Enrollments`.
- Runtime hiện dùng bảng `reviews` để giữ một review riêng, moderation `visible/hidden` và API hiện có.
- **Compatibility:** chưa tự dồn dữ liệu vào Enrollment và chưa xóa bảng `reviews`.
- **Cần mentor chốt:** mapping chính xác của rating/comment/status và kế hoạch migration dữ liệu.

## 4. Certificates

- ERD mới thể hiện mã/ngày cấp chứng chỉ trên `Enrollments`.
- Runtime hiện dùng bảng `certificates` và luồng tải PDF.
- **Compatibility:** chưa tự chuyển dữ liệu hoặc xóa bảng cũ.
- **Cần mentor chốt:** Enrollment chỉ lưu metadata hay thay thế hoàn toàn Certificate storage.

## 5. News and catalogs

- ERD mới bổ sung `News`, `Catalogs`, `News_catalogs`.
- Runtime hiện dùng `news_posts` với category dạng text.
- Tên cột nhìn thấy ở `News_catalogs` chưa khớp ngữ nghĩa News–Catalog.
- **Cần mentor chốt:** xác nhận khóa ngoại là `news_id` và `catalog_id` trước khi tạo migration.

## 6. Enrollment snapshots

ERD mới thể hiện thêm dữ liệu Course/Exam/Certificate/Feedback trên Enrollment. Chưa xác định đó là snapshot bất biến hay dữ liệu phải resolve trực tiếp qua quan hệ.

Không thêm các cột này trước khi chốt quy tắc đồng bộ; nếu vừa lưu snapshot vừa đọc dữ liệu live sẽ tạo hai nguồn sự thật.

## 7. Notifications

Notification bell hiện chỉ là UI placeholder; ERD mới vẫn không thể hiện storage tương ứng. Đây tiếp tục là `OPEN REQUIREMENT` và không được tự thêm bảng.

## Nguyên tắc contract

1. Expand schema chỉ khi ERD thể hiện rõ entity, field và relationship.
2. Backfill và kiểm tra dữ liệu trước khi đổi reader/writer.
3. Giữ compatibility trong thời gian chuyển tiếp.
4. Chỉ xóa bảng/cột cũ bằng contract migration riêng sau khi backend, frontend và dữ liệu đều được xác minh.
