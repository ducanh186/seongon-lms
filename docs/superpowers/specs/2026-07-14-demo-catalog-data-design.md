# Thiết kế bộ dữ liệu demo 100 khóa học và 116 học viên

## Mục tiêu

Thay toàn bộ catalog hiện tại bằng đúng 100 khóa học tiếng Việt thuộc ba nhóm SEO AI Max, Google Ads và Content SEO. Giữ nguyên 16 học viên hiện có, thêm 100 học viên demo mới để database có tổng cộng 116 học viên, đồng thời tạo dữ liệu học tập đủ để Guest, Student và Admin UI có thể trình diễn.

## Phạm vi

- Giữ nguyên routes, API payloads, database schema và Docker architecture.
- Giữ nguyên toàn bộ tài khoản hiện có, bao gồm admin và 16 học viên.
- Xóa catalog cũ cùng dữ liệu phụ thuộc vào khóa học: categories, courses, lessons, quizzes, questions, options, orders, enrollments, progress, attempts, certificates và reviews.
- Không xóa personal access tokens hoặc thay đổi mật khẩu của tài khoản hiện có.
- Tạo lại dữ liệu bằng Laravel seeder/console command có thể chạy lặp lại an toàn.
- Cập nhật README gốc cho người không chuyên kỹ thuật.

## Cấu trúc dữ liệu mới

Catalog có đúng ba categories và 100 khóa học published:

| Nhóm | Số lượng | Nội dung cốt lõi |
|---|---:|---|
| SEO AI Max | 34 | Ứng dụng công cụ AI để tăng tốc nghiên cứu, tối ưu và đo lường SEO |
| Google Ads | 33 | Thiết lập, tối ưu và quản lý chiến dịch quảng cáo Google thực chiến |
| Content SEO | 33 | Nghiên cứu, viết và tối ưu nội dung cho người dùng và công cụ tìm kiếm |

Mỗi khóa học có title và slug duy nhất, mô tả tiếng Việt, thumbnail ổn định, giá, level, instructor, bài học, quiz và câu hỏi mẫu. Giá, level và nội dung được sinh theo quy luật cố định để test và demo có thể lặp lại, không phụ thuộc dữ liệu Faker ngẫu nhiên.

Hệ thống thêm 100 tài khoản theo mẫu `student001@demo.seongon.vn` đến `student100@demo.seongon.vn`. Tên và mật khẩu demo được quy định trong README. Các email được tạo bằng `updateOrCreate` để chạy lại không sinh tài khoản trùng.

Mỗi học viên được ghi danh vào 3 đến 8 khóa học theo phép phân bổ xác định từ ID/email. Một phần enrollment có progress, review visible và order paid tương ứng để các màn hình My Courses, Progress, Reviews và Admin Dashboard có dữ liệu hợp lệ.

## Kiến trúc triển khai

Một seeder chuyên trách tạo bộ dữ liệu catalog/học viên mới. Một Artisan command công khai thực hiện thay catalog trong transaction và hiển thị thống kê cuối cùng. `DatabaseSeeder` gọi cùng seeder này để fresh install và runtime replacement không bị lệch nhau.

Luồng chạy:

1. Kiểm tra database và bắt đầu transaction.
2. Xóa dữ liệu phụ thuộc vào catalog theo thứ tự an toàn hoặc dựa trên foreign-key cascade đã xác minh.
3. Giữ nguyên users; tạo 100 tài khoản demo bằng email xác định.
4. Tạo ba categories và 100 khóa học cùng lesson/quiz/question.
5. Tạo enrollment, order, progress và review cho toàn bộ học viên.
6. Kiểm tra invariant: 100 courses, 34/33/33 theo nhóm, không có slug trùng, 100 email demo và mỗi học viên có 3–8 enrollments.
7. Commit transaction; nếu bất kỳ bước nào lỗi thì rollback toàn bộ.

Lệnh phải có cờ xác nhận phá hủy dữ liệu để tránh chạy nhầm. README cung cấp câu lệnh Docker hoàn chỉnh và cảnh báo rõ catalog cũ sẽ bị xóa.

## Xử lý lỗi và tính an toàn

- Toàn bộ thay đổi catalog chạy trong một database transaction.
- Không xóa users hoặc tokens.
- Lệnh dừng trước khi ghi nếu không có cờ xác nhận.
- Email và slug có quy luật duy nhất; chạy lại đưa catalog về cùng trạng thái thay vì nhân bản dữ liệu.
- Không chỉnh sửa các file `data/*` đang thay đổi ngoài phạm vi dự án.

## Kiểm thử

Automated feature test thực hiện chu kỳ red-green:

- Tạo course/enrollment cũ và một số học viên hiện có.
- Chạy command không có cờ xác nhận và xác nhận database không thay đổi.
- Chạy command có cờ xác nhận.
- Xác nhận course cũ và dữ liệu phụ thuộc đã biến mất nhưng users cũ còn nguyên.
- Xác nhận đúng 100 courses, phân bổ 34/33/33, 100 email demo, slug duy nhất và mỗi student có 3–8 enrollments.
- Chạy lại command và xác nhận không sinh user trùng, tổng catalog vẫn là 100.

Verification cuối gồm Laravel test suite, FE test/build, Docker rebuild, health checks và API smoke test cho categories/courses.

## README cho non-developer

README gốc được viết lại theo hướng thao tác từng bước:

- Yêu cầu cài Docker Desktop.
- Cách khởi động và mở `http://localhost`.
- Tài khoản admin, tài khoản học viên hiện có và mẫu tài khoản demo mới.
- Cách thay catalog bằng lệnh an toàn.
- Cách dừng, chạy lại và xem trạng thái container.
- Cách xử lý các lỗi phổ biến mà không cần hiểu Laravel hoặc React.

## Tiêu chí hoàn thành

- Runtime có đúng 100 khóa học và 116 học viên.
- Catalog cũ không còn; tài khoản hiện có không bị xóa.
- Ba nhóm khóa học hiển thị đúng mô tả đã thống nhất.
- Student và Admin UI có enrollment/review/progress hợp lệ để demo.
- Bộ dữ liệu tái tạo được từ source và được kiểm chứng bằng automated tests.
- README đủ để người không chuyên kỹ thuật khởi động, đăng nhập và reset catalog.
