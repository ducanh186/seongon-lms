# SEONGON LMS Production Docker

Stack production gồm một Nginx public, Laravel PHP-FPM, MySQL 8 và phpMyAdmin tùy chọn. Nginx phục vụ Vite SPA tại `/` và chuyển `/api/*` tới Laravel trong internal Docker network.

## Yêu cầu

- Docker Desktop với Docker Compose v2.
- Port public mặc định `80` đang trống.
- File `Infra/.env` chứa secret production thật và không được commit.

## Chạy nhanh bằng PowerShell script

Từ repository root, lệnh mặc định để build và khởi động toàn bộ production stack là:

```powershell
& '.\Infra\run-docker.ps1' up
```

Ở lần chạy đầu tiên, script sẽ tạo `Infra/.env` từ template rồi dừng lại. Điền các secret thật theo mục **Chuẩn bị configuration**, sau đó chạy lại lệnh `up`.

Các action được hỗ trợ:

| Lệnh | Tác dụng |
|---|---|
| `& '.\Infra\run-docker.ps1' up` | Validate, build và start stack |
| `& '.\Infra\run-docker.ps1' status` | Xem trạng thái container |
| `& '.\Infra\run-docker.ps1' logs` | Theo dõi logs của app, Nginx và MySQL; nhấn `Ctrl+C` để thoát |
| `& '.\Infra\run-docker.ps1' restart` | Restart container và giữ nguyên dữ liệu |
| `& '.\Infra\run-docker.ps1' admin` | Bật phpMyAdmin tùy chọn |
| `& '.\Infra\run-docker.ps1' down` | Dừng stack nhưng giữ persistent volume |

Nếu PowerShell chặn script unsigned, chỉ bypass cho terminal hiện tại rồi chạy lại:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& '.\Infra\run-docker.ps1' up
```

## 1. Chuẩn bị configuration

Chạy từ repository root bằng PowerShell:

```powershell
Copy-Item -LiteralPath 'Infra\.env.example' -Destination 'Infra\.env'
php 'BE\artisan' key:generate --show
```

Copy giá trị `base64:...` vừa sinh vào `APP_KEY` trong `Infra/.env`. Trước khi deploy, bắt buộc đổi:

- `APP_KEY`;
- `APP_URL`;
- `MYSQL_PASSWORD`;
- `MYSQL_ROOT_PASSWORD`.

Không tự sinh `APP_KEY` trong container startup. Thay đổi key sau khi hệ thống đã có dữ liệu sẽ làm hỏng encrypted data và session cũ.

## 2. Validate và build

```powershell
& 'Infra\tests\verify-production-compose.ps1'
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' config --quiet
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' build
```

Build sử dụng multi-stage images:

- PHP runtime chỉ cài production Composer dependencies và PHP extensions cần thiết;
- Nginx image chỉ nhận Vite `dist/`, không chứa Node.js hay Frontend source;
- `.dockerignore` loại local dependency, cache và secret khỏi build context.

## 3. Khởi động production stack

```powershell
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' up -d --wait
```

Startup flow của `app`:

1. chờ MySQL healthy;
2. chạy `php artisan migrate --force`;
3. chạy `php artisan app:seed-demo-once`;
4. chạy `php artisan optimize`;
5. chuyển process chính sang PHP-FPM.

Demo seeder chỉ chạy khi bảng `users` rỗng. Restart container không tạo lại demo data.

## 4. Health và logs

```powershell
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' ps
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' logs app nginx mysql
Invoke-WebRequest -Uri 'http://127.0.0.1/healthz' -UseBasicParsing
```

Các endpoint kiểm tra nhanh:

- `http://127.0.0.1/healthz` — Nginx health;
- `http://127.0.0.1/` — React SPA;
- `http://127.0.0.1/api/v1/courses` — Laravel API qua Nginx.

## 5. phpMyAdmin tùy chọn

phpMyAdmin không khởi động cùng default stack. Bật riêng bằng profile `admin`:

```powershell
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' --profile admin up -d phpmyadmin
```

Mặc định UI chỉ bind tại `http://127.0.0.1:8081`, không public ra network interface khác.

## 6. Dừng và restart

```powershell
# Restart mà giữ nguyên dữ liệu
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' restart

# Dừng và xóa container/network nhưng giữ volume
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' down
```

> **Cảnh báo:** `docker compose down -v` xóa cả `mysql_data` và `app_storage`. Lệnh này làm mất database cùng file Laravel persistent; chỉ dùng cho môi trường test sau khi xác nhận đúng Compose project.

## 7. Production hardening tiếp theo

Stack hiện giả định TLS terminate tại load balancer hoặc reverse proxy bên ngoài. Khi có domain/certificate, bổ sung HTTPS ở hạ tầng ngoài stack hoặc thực hiện trong một task riêng có kế hoạch certificate renewal rõ ràng.
