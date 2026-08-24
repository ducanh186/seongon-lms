# Checklist nghiệm thu UI Course Management

Ngày kiểm thử: 24/08/2026

Phạm vi: `Admin Portal -> Khóa học`

Công cụ: `browser-use`, Chromium, viewport `1905 x 1080`

## Điều kiện trước khi kiểm thử

- Backend chạy tại `http://127.0.0.1:8000`.
- Frontend chạy tại `http://localhost:5173`.
- Đăng nhập bằng tài khoản có role `admin`.
- Database có Course, Lesson, Exam, Question, Enrollment, Certificate và Review mẫu.
- Không bấm nút xác nhận xóa trên dữ liệu dùng chung.

## Kết quả chạy thực tế

| ID | Thao tác UI | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|
| CM-UI-01 | Mở `/admin` | Sidebar chỉ còn: Tổng quan, Tài khoản, Đơn hàng, Danh mục, Khóa học, Tin tức | Hiển thị đúng 6 mục, không còn các màn hình Course con rời rạc | PASS |
| CM-UI-02 | Chọn `Khóa học` | Danh sách lấy dữ liệu thật và có bộ lọc Course | Có bộ lọc danh mục, ID, tên, trạng thái, giá, ngày xuất bản; bảng hiển thị relation/aggregate | PASS |
| CM-UI-03 | Bấm Course `#116` | Mở workspace của đúng Course | Header hiển thị tên, ID, trạng thái và các action của Course `#116` | PASS |
| CM-UI-04 | Quan sát thanh tab | Có 3 tab: Nội dung khóa học, Học viên ghi danh, Đánh giá | Hiển thị đúng và chỉ một tab active | PASS |
| CM-UI-05 | Trong tab Nội dung khóa học | Có 3 bước: Thông tin cơ bản, Bài học & tài liệu, Bài kiểm tra | Hiển thị đúng stepper, chuyển bước trực tiếp được | PASS |
| CM-UI-06 | Sửa tạm tiêu đề ở bước 1, chuyển bước 2 rồi quay lại | Dữ liệu chưa lưu không bị mất | Giá trị `UNSAVED COURSE TITLE QA` vẫn còn; không gửi request cập nhật DB | PASS |
| CM-UI-07 | Mở bước Bài học & tài liệu | Form Lesson và danh sách Lesson thuộc Course đang chọn xuất hiện | Course `#116` hiện form thêm bài và Lesson `Bài học acceptance`, có sửa/xóa/sắp xếp | PASS |
| CM-UI-08 | Mở bước Bài kiểm tra | Exam, Question và Answer editor thuộc Course xuất hiện | Hiện Exam cuối khóa, điểm đạt, số lần làm, Question và các Answer | PASS |
| CM-UI-09 | Mở tab Học viên ghi danh của Course `#14` | Chỉ hiện Enrollment của Course `#14` | Hiện tài khoản, tên thật, Order ID và trạng thái học; Course khác không lẫn vào | PASS |
| CM-UI-10 | Mở tab Học viên ghi danh của Course `#114` | Certificate hiện từ relation thật nếu đã cấp | Học viên Nguyễn Văn An hiện trạng thái Hoàn thành và mã `SEONGON-2026-ICTTZURZ` | PASS |
| CM-UI-11 | Mở tab Đánh giá của Course `#14` | Chỉ hiện Review của Course, có ẩn/hiện và xóa có xác nhận | Hiện 2 Review của Course `#14`; mở được dialog xóa rồi bấm Hủy | PASS |
| CM-UI-12 | Bấm Xóa khóa học | Phải có dialog xác nhận, không xóa ngay | Dialog cảnh báo không thể hoàn tác xuất hiện; đã bấm Hủy | PASS |
| CM-UI-13 | Bấm Tạo khóa học mới | Form mới phải trống, trạng thái khởi đầu là bản nháp | Form trống, stepper xuất hiện, không tái sử dụng dữ liệu Course trước | PASS |
| CM-UI-14 | Đo chiều rộng trang | Không có horizontal overflow ở viewport desktop | `pageWidth = 1905`, `viewportWidth = 1905`, `overflowPixels = 0` | PASS |

## Checklist để kiểm thử thủ công lại

- [ ] Đăng nhập Admin và xác nhận sidebar có đúng 6 mục.
- [ ] Mở Khóa học, thử từng bộ lọc và xác nhận số dòng thay đổi đúng.
- [ ] Bấm vào tên một Course; không tìm action sửa/xóa trực tiếp trên từng dòng danh sách.
- [ ] Xác nhận header Course có ID, trạng thái, Quay lại, Sửa, Publish/Ẩn và Xóa.
- [ ] Chuyển lần lượt 3 tab và xác nhận ngữ cảnh vẫn là cùng một Course.
- [ ] Ở bước Thông tin cơ bản, sửa tạm một field, chuyển bước rồi quay lại; field phải còn nguyên.
- [ ] Bấm Cập nhật và kiểm tra DB chỉ thay đổi khi đã bấm nút lưu.
- [ ] Ở bước Bài học & tài liệu, thêm một Lesson thử nghiệm và kiểm tra bảng `lessons`.
- [ ] Sửa, đổi thứ tự rồi xóa Lesson thử nghiệm; kiểm tra `position` và số row trong DB.
- [ ] Ở bước Bài kiểm tra, tạo/sửa Exam, Question và Answer; kiểm tra `exams`, `questions`, `answers`.
- [ ] Mở tab Học viên ghi danh và đối chiếu `enrollments`, `learning_progress`, `certificates`.
- [ ] Mở tab Đánh giá và đối chiếu `reviews.course_id` với Course đang xem.
- [ ] Thử action Xóa Review và Xóa Course; bắt buộc thấy dialog trước khi thay đổi DB.
- [ ] Tạo Course mới; xác nhận form trống và Course mới bắt đầu ở trạng thái draft.
- [ ] Publish Course rồi mở site public, tìm Course trong Catalog.

## SQL đối chiếu nhanh

```sql
SELECT id, title, status, updated_at
FROM courses
WHERE id = 14;

SELECT id, user_id, course_id, order_id, status
FROM enrollments
WHERE course_id = 14;

SELECT c.id, c.enrollment_id, c.certificate_code, c.issued_at
FROM certificates c
JOIN enrollments e ON e.id = c.enrollment_id
WHERE e.course_id = 114;

SELECT id, user_id, course_id, rating, status, created_at
FROM reviews
WHERE course_id = 14;
```

## Bằng chứng

- `C:\Users\AL\AppData\Local\Temp\course-management-redesign-content.png`
- `C:\Users\AL\AppData\Local\Temp\course-management-redesign-review.png`

Tài khoản Admin QA tạm và token được tạo riêng cho lượt browser test đã được xóa sau khi hoàn tất.
