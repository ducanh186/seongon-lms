# SEONGON LMS

SEONGON LMS là hệ thống học trực tuyến gồm giao diện React/Vite và API Laravel/MySQL. Người học có thể xem khóa học, đăng ký, học bài, làm bài kiểm tra và đánh giá. Quản trị viên quản lý dữ liệu và theo dõi hoạt động theo quyền được cấp.

## Chạy nhanh trên Windows

### Cần chuẩn bị

- Windows với PowerShell 5.1 trở lên.
- PHP 8.2 trở lên, bật extension `mysqli`.
- Composer, Node.js/npm và MySQL Server. Windows service của MySQL phải có tên dạng `MySQL<number>`, ví dụ `MySQL84`.
- Một database MySQL rỗng và thông tin kết nối của database đó.
- Internet trong lần chuẩn bị đầu tiên để tải dependency và phpMyAdmin.

### Lần chạy đầu tiên

1. Sao chép `BE/.env.example` thành `BE/.env`.
2. Điền kết nối MySQL trong `BE/.env`, tạo `APP_KEY` và bảo đảm MySQL đang chạy. Xem hướng dẫn backend tại [BE/README.md](BE/README.md).
3. Từ thư mục gốc của repository, chạy:

   ```bat
   Infra\build-local-web-windows.bat
   ```

4. Khi build thành công, chạy:

   ```bat
   Infra\start-local-web-windows.bat
   ```

Script sẽ mở giao diện tại `http://localhost:5173`. API chạy tại `http://127.0.0.1:8000`; phpMyAdmin chạy tại `http://127.0.0.1:8081`.

> `build-local-web-windows.bat` mặc định chạy migration và seed trên database đã cấu hình. Chỉ dùng với database local dành cho dự án; sao lưu trước nếu database đã có dữ liệu cần giữ.

Chi tiết hành vi, tùy chọn và xử lý lỗi nằm trong [Infra/README.md](Infra/README.md).

## Chức năng chính

- Khách: xem danh mục khóa học, chi tiết khóa học và tin tức.
- Học viên (`student`): quản lý giỏ hàng, tạo đơn, xác nhận thanh toán giả lập, học bài, lưu tiến độ, làm bài kiểm tra, đánh giá và nhận chứng chỉ khi đủ điều kiện.
- Quản trị viên (`admin`): quản lý người dùng và RBAC, khóa học, danh mục, bài học, bài kiểm tra, tin tức, đánh giá; xem đơn hàng và dữ liệu vận hành.

Thanh toán QR chỉ là mô phỏng luồng nghiệp vụ: không kết nối ngân hàng, không chuyển tiền thật và không tự cấp quyền chỉ vì người dùng quét mã. Người dùng vẫn phải bấm xác nhận để backend xử lý kết quả giả lập.

## Tài liệu theo phần

- [Frontend React/Vite](FE/DEMO/README.md)
- [Backend Laravel/API](BE/README.md)
- [Hạ tầng và script Windows](Infra/README.md)
- [ERD, quy tắc dữ liệu và kiểm tra thủ công](docs/README.md)

Mọi quyết định về bảng, cột và quan hệ phải theo tài liệu ERD tại `docs/README.md`; README này không thay thế đặc tả database.

## Triển khai

`vercel.json` chỉ build và phát hành frontend tĩnh từ `FE/DEMO/dist`. Laravel không chạy trong cấu hình Vercel này và phải được host riêng với PHP 8.2+, MySQL, HTTPS, storage bền vững cho file tải lên và quy trình migration an toàn.

Trước khi build frontend trên Vercel:

1. Import repository và giữ **Root Directory** là thư mục gốc.
2. Khai báo `VITE_API_BASE_URL` bằng URL HTTPS thật của Laravel API, kết thúc bằng `/api/v1`.
3. Cấu hình `FRONTEND_URL` của Laravel bằng origin frontend thật để CORS cho phép truy cập.
4. Không đặt token, mật khẩu hoặc secret trong biến `VITE_*`; các giá trị này xuất hiện trong JavaScript gửi tới trình duyệt.

Cấu hình sẽ chạy `npm ci --prefix FE/DEMO`, `npm run build --prefix FE/DEMO`, phục vụ `FE/DEMO/dist` và rewrite đường dẫn SPA về `index.html`. Repository này chưa được publish hay deploy tự động.
