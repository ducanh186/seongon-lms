# Hạ tầng và cách chạy trên Windows

Tài liệu này dành cho người vận hành local. Hai file `.bat` chỉ là lớp gọi PowerShell; có thể chạy từ thư mục gốc mà không cần đổi thư mục trước.

## 1. Chuẩn bị máy

- Windows PowerShell 5.1 trở lên.
- PHP 8.2 trở lên trong `PATH`, bật `mysqli`.
- Composer (`composer.bat`) và npm (`npm.cmd`) trong `PATH`.
- MySQL Server cài dưới dạng Windows service tên `MySQL<number>`.
- `BE/.env` đã có `APP_KEY`, kết nối tới database MySQL local đã tạo và có quyền chạy migration.

Ví dụ các tên biến cần điền trong `BE/.env`:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=seongon_lms
DB_USERNAME=
DB_PASSWORD=
```

Không đưa mật khẩu thật vào Git.

## 2. Chuẩn bị và kiểm tra project

Chạy từ thư mục gốc:

```bat
Infra\build-local-web-windows.bat
```

Theo đúng thứ tự, script:

1. Kiểm tra cấu trúc `BE` và `FE/DEMO`, PHP, Composer, npm và các file cấu hình bắt buộc.
2. Kiểm tra PHP 8.2+ và extension `mysqli`.
3. Tải phpMyAdmin 5.2.3 khi chưa có, xác minh SHA-256 rồi lưu runtime vào `Infra/.native-runtime/`.
4. Luôn chạy `composer install` và `npm ci` theo lockfile để đồng bộ dependency sau mỗi lần pull code.
5. Chạy `php artisan migrate --force`.
6. Chạy `php artisan app:seed-demo-once` và `php artisan db:seed --class=DemoUserHistorySeeder --force`.
7. Chạy toàn bộ test backend và frontend.
8. Build frontend production vào `FE/DEMO/dist`.

Nếu Vite của chính project đang dùng cổng 5173, script dừng tiến trình đó trước test/build. Nếu cổng 5173 thuộc ứng dụng khác, script dừng và báo lỗi thay vì tắt nhầm tiến trình.

> Lệnh mặc định thay đổi database local qua migration/seed. Không trỏ `BE/.env` vào database production. Tùy chọn `-SkipMigrations`, `-SkipSeed` và `-SkipTests` chỉ dành cho người hiểu rõ phần kiểm tra đang bỏ qua.

Kiểm tra máy đã chuẩn bị đủ mà không cài dependency, migrate, seed, test hoặc build:

```bat
Infra\build-local-web-windows.bat -CheckOnly
```

`-CheckOnly` vẫn yêu cầu phpMyAdmin, backend dependency và frontend dependency đã tồn tại.

## 3. Khởi động local web

```bat
Infra\start-local-web-windows.bat
```

Script chọn một Windows service khớp `MySQL<number>`; ưu tiên service đang chạy, sau đó ưu tiên `MySQL80`. Nếu service đã chọn chưa chạy, script thử khởi động trong tối đa 20 giây.

Sau đó script:

- khởi động phpMyAdmin ẩn tại `http://127.0.0.1:8081`;
- khởi động Laravel ẩn tại `http://127.0.0.1:8000` nếu `/up` chưa sẵn sàng;
- khởi động Vite ẩn tại `http://127.0.0.1:5173` nếu chưa sẵn sàng;
- chờ tối đa 60 giây rồi mở `http://localhost:5173`.

Log Laravel/Vite nằm trong `%TEMP%\seongon-lms-local-web`; log phpMyAdmin nằm trong `Infra/.native-runtime/logs`. Script in PID của tiến trình mới tạo. Khi muốn dừng, chỉ dừng đúng các PID đã được in; script không có lệnh dừng toàn bộ.

Các tùy chọn hữu ích:

```bat
Infra\start-local-web-windows.bat -NoBrowser
Infra\start-local-web-windows.bat -SkipPhpMyAdmin
Infra\start-local-web-windows.bat -CheckMySqlServiceOnly
```

## 4. Lỗi thường gặp

- `No MySQL Server Windows service was found`: cài MySQL Server dưới dạng Windows service có tên `MySQL<number>`.
- `mysqli extension is disabled`: bật `extension=mysqli` trong `php.ini`, sau đó mở PowerShell mới.
- Cổng 8000, 5173 hoặc 8081 đang bị ứng dụng khác dùng: đóng ứng dụng đó rồi chạy lại.
- Laravel không sẵn sàng: đọc file `backend-*.err.log` được script in ra; kiểm tra `BE/.env`, database và migration.
- Thiếu dependency hoặc phpMyAdmin: chạy lại `Infra\build-local-web-windows.bat` trước khi start.

## 5. Docker Compose (tùy chọn nâng cao)

`Infra/docker-compose.yml` là một luồng riêng, gồm MySQL, PHP-FPM, Nginx và phpMyAdmin tùy chọn. Container backend tự chạy migration, seed demo một lần và cache cấu hình khi khởi động; Nginx phục vụ SPA và chuyển `/api` tới Laravel.

1. Sao chép `Infra/.env.example` thành `Infra/.env` và thay toàn bộ giá trị mẫu bằng secret thật.
2. Khởi động stack:

   ```powershell
   docker compose --env-file Infra/.env -f Infra/docker-compose.yml up -d --build
   ```

3. Chỉ bật phpMyAdmin khi cần và giữ nó ở localhost:

   ```powershell
   docker compose --env-file Infra/.env -f Infra/docker-compose.yml --profile admin up -d
   ```

4. Xem trạng thái hoặc log:

   ```powershell
   docker compose --env-file Infra/.env -f Infra/docker-compose.yml ps
   docker compose --env-file Infra/.env -f Infra/docker-compose.yml logs -f
   ```

Vercel không dùng stack Docker này; cấu hình Vercel chỉ phục vụ frontend và cần một Laravel backend được host riêng.
