# Hạ tầng Docker trên Windows

Đây là quy trình chính cho khách hàng dùng Windows + Docker Desktop. Sau lần chuẩn bị đầu tiên, cập nhật code chỉ cần `git pull` và chạy một file; host không cần cài PHP, Composer, Node, npm hoặc MySQL.

## 1. Chuẩn bị máy

- Windows 10/11 với Docker Desktop đang chạy, bật Linux containers/WSL2.
- Git trong `PATH`.
- Internet ở lần build đầu để tải base images và package dependencies.
- Cổng `80` chưa bị ứng dụng khác chiếm. Có thể đổi bằng `HTTP_PORT` trong `Infra/.env`.

## 2. Lần đầu và mỗi lần cập nhật

Chạy từ thư mục gốc repository:

```powershell
git pull
Infra\\docker-up-windows.bat
```

Script sẽ:

1. Kiểm tra Docker Desktop và Docker Compose.
2. Tạo `Infra/.env` với `APP_KEY` và mật khẩu local ngẫu nhiên nếu file chưa tồn tại; file cũ không bị ghi đè.
3. Validate Compose trước khi thay đổi container.
4. Build lại image `app` và `nginx` từ source hiện tại, `BE/composer.lock` và `FE/DEMO/package-lock.json`.
5. Khởi động lại stack, chờ MySQL healthy rồi Laravel chạy migration, seed demo lần đầu và optimize cache.
6. Chờ `http://localhost:<HTTP_PORT>/healthz` trả về `ok` trước khi báo thành công.

Giao diện và API dùng cùng origin qua Nginx:

- Website: `http://localhost`
- Healthcheck: `http://localhost/healthz`
- phpMyAdmin (chỉ khi bật admin): `http://127.0.0.1:8081`

Muốn bật phpMyAdmin:

```powershell
Infra\\docker-up-windows.bat -Admin
```

## 3. Kiểm tra, log và dừng stack

```powershell
docker compose --env-file Infra/.env -f Infra/docker-compose.yml ps
docker compose --env-file Infra/.env -f Infra/docker-compose.yml logs --tail=120
docker compose --env-file Infra/.env -f Infra/docker-compose.yml down
```

`down` chỉ dừng container; volume `mysql_data` và `app_storage` vẫn giữ database, file upload và dữ liệu local. Không chạy `down -v` trừ khi muốn xóa toàn bộ dữ liệu local.

Nếu build hoặc healthcheck lỗi, script tự in trạng thái service và 120 dòng log gần nhất. Sửa nguyên nhân rồi chạy lại cùng một lệnh; không cần xóa volume.

## 4. Lỗi thường gặp

- `Docker CLI was not found`: cài Docker Desktop, mở lại PowerShell rồi chạy lại.
- `Docker Desktop is not running`: mở Docker Desktop và chờ engine báo Ready.
- `port is already allocated`: đổi `HTTP_PORT` trong `Infra/.env`, sau đó chạy lại script.
- `healthcheck timeout`: xem `docker compose ... logs --tail=120`; thường là Docker chưa đủ RAM/CPU hoặc database đang khởi động lần đầu.
- Muốn kiểm tra Compose mà không start container: `docker compose --env-file Infra/.env -f Infra/docker-compose.yml config`.

## 5. Kiến trúc runtime

- `mysql`: MySQL 8 với healthcheck và volume `mysql_data`, không expose port ra host.
- `app`: PHP 8.3-FPM, cài Composer dependencies trong image, chờ MySQL healthy rồi migrate/seed/optimize.
- `nginx`: build frontend bằng Node 22 từ `package-lock.json`, phục vụ SPA và chuyển `/api` tới Laravel.
- `phpmyadmin`: profile `admin`, chỉ bind `127.0.0.1:8081`.

Mỗi lần pull code, `docker-up-windows.bat` rebuilds hai image ứng dụng; các migration mới nằm trong source sẽ được Laravel áp dụng khi container `app` khởi động.

## 6. Chế độ host legacy

Flow PHP/Composer/npm/MySQL trực tiếp trên Windows vẫn giữ cho developer cần debug sâu:

```bat
Infra\\build-local-web-windows.bat
Infra\\start-local-web-windows.bat
```

Flow này yêu cầu PHP, Composer, Node/npm, MySQL service và phpMyAdmin trên host; khách hàng nên dùng Docker ở trên để tránh sai khác môi trường.
