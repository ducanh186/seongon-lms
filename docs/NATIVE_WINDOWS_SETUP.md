# Chạy SEONGON LMS trực tiếp trên Windows, không dùng Docker

Hướng dẫn này dành cho Windows 11 và PowerShell. Sau khi hoàn tất, luồng chạy là:

```text
Browser http://localhost:5173
        -> React/Vite (FE)
        -> Laravel API http://127.0.0.1:8000/api/v1
        -> MySQL 8.0 tại 127.0.0.1:3306
```

Docker, WSL và firewall rule mới đều không cần thiết. Giữ BIOS virtualization bật; nó không cản native runtime.

## Chạy script tự động trên máy khách

Với source tại `C:\Users\Admin\Documents\GitHub\seongon-lms`, mở PowerShell bằng quyền Administrator rồi chạy:

```powershell
Set-Location 'C:\Users\Admin\Documents\GitHub\seongon-lms'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\Infra\install-native-dependencies-windows.ps1'
```

Script tự tìm PHP tại `%LOCALAPPDATA%\Programs\PHP83\php.exe`, tạo/cập nhật runtime `php.ini`, bật extensions, kiểm tra Node/npm, cài Composer bằng SHA-384 verification và cài dependencies của BE/FE. Nếu MySQL chưa có, script mở official MySQL Installer 8.0 và dừng; cài MySQL Server 8.0 với service `MySQL80`, sau đó chạy lại cùng lệnh.

Nếu chỉ muốn sửa PHP extensions trước:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\Infra\install-native-dependencies-windows.ps1' -PhpOnly
```

## Chạy hằng ngày

Sau khi setup dependencies xong, mở PowerShell tại `C:\Users\Admin\Documents\GitHub\seongon-lms` và dùng một lệnh mặc định để smart-prepare rồi restart native development runtime:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\Infra\run-native-windows.ps1'
```

Các action rõ ràng khi cần là `start`, `stop`, `restart`, `status`, và `logs`; ví dụ `powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\Infra\run-native-windows.ps1' status`. Log, PID metadata và preparation stamps nằm trong `Infra\.native-runtime`. Trước khi chạy, `BE\.env` phải dùng MySQL credentials không phải `root`: user `seongon` và một password không rỗng.

## 1. Hiểu nhanh theo 3 mức

### Mức 1 - như giải thích cho trẻ 5 tuổi

Docker giống một hộp chứa sẵn mọi nguyên liệu. Chạy native nghĩa là lấy PHP, Node.js và MySQL ra, cài trực tiếp lên Windows rồi nối chúng với nhau.

### Mức 2 - như giải thích cho học sinh cấp 2

Frontend chạy bằng Node.js/Vite, Backend chạy bằng PHP/Laravel, dữ liệu nằm trong MySQL. Ba chương trình là ba Windows process/service riêng và giao tiếp qua các port `5173`, `8000`, `3306`.

### Mức 3 - như giải thích cho sinh viên năm nhất

Native runtime bỏ lớp container isolation. Windows trực tiếp quản lý executable, `PATH`, PHP extensions, MySQL service, process ownership và file cấu hình `.env`. Ưu điểm là nhẹ hơn Docker; trade-off là dễ lệch version và khó tái tạo môi trường hơn, nên phải kiểm tra version/module rõ ràng.

## 2. Thành phần bắt buộc

| Thành phần | Dự án cần | Mục đích |
|---|---:|---|
| Windows PowerShell | 5.1 trở lên | Chạy lệnh cài đặt/vận hành |
| PHP | 8.3.x | Laravel Backend yêu cầu `php ^8.3` |
| PHP extensions | `bcmath`, `dom`, `gd`, `intl`, `mbstring`, `pdo_mysql`, `zip`, `Zend OPcache` | Laravel, PDF, ảnh, Unicode, MySQL |
| Composer | 2.x | Cài PHP packages |
| Node.js | 22.x LTS | Cài và chạy React/Vite |
| npm | Đi cùng Node.js | Cài JavaScript packages |
| MySQL Server | Chính xác 8.0.x | Database của dự án |

Tại thời điểm cập nhật tài liệu ngày 31/07/2026, Winget cung cấp PHP `8.3.32`, Node.js 22 `22.23.2`; trang chính thức cung cấp Composer `2.10.2` và MySQL Installer `8.0.46`. Patch version có thể tăng, nhưng không đổi sang PHP 8.4/8.5, Node 24 hoặc MySQL 8.4 khi thiết lập máy này.

Nguồn chính thức:

- [PHP on Windows](https://www.php.net/manual/en/install.windows.php)
- [Composer download và SHA-384 verification](https://getcomposer.org/download/)
- [Node.js download](https://nodejs.org/en/download)
- [MySQL Installer 8.0](https://dev.mysql.com/downloads/installer/)

## 3. Cài PHP 8.3 và Node.js 22

Mở PowerShell bằng quyền Administrator:

```powershell
winget install --id PHP.PHP.8.3 --exact --accept-package-agreements --accept-source-agreements
winget install --id OpenJS.NodeJS.22 --exact --accept-package-agreements --accept-source-agreements
```

Đóng PowerShell, mở lại để Windows nạp `PATH`, rồi kiểm tra:

```powershell
php --version
node --version
npm --version
where.exe php
where.exe node
```

Kết quả đúng:

- `php --version` bắt đầu bằng `PHP 8.3`.
- `node --version` bắt đầu bằng `v22`.
- `where.exe` không trỏ tới PHP/Node cũ của XAMPP hoặc phần mềm khác.

## 4. Bật PHP extensions

Xác định đúng thư mục PHP và tạo `php.ini` nếu chưa có:

```powershell
$phpExe = (Get-Command php.exe -ErrorAction Stop).Source
$phpDir = Split-Path -Parent $phpExe
$phpIni = Join-Path $phpDir 'php.ini'
$phpIniProduction = Join-Path $phpDir 'php.ini-production'

if (-not (Test-Path -LiteralPath $phpIni)) {
    Copy-Item -LiteralPath $phpIniProduction -Destination $phpIni
}

php --ini
notepad.exe $phpIni
```

Trong `php.ini`, bảo đảm `extension_dir = "ext"`. Tìm và bỏ dấu `;` ở đầu các dòng có sẵn sau; không thêm dòng trùng:

```ini
extension=bcmath
extension=curl
extension=fileinfo
extension=gd
extension=intl
extension=mbstring
extension=openssl
extension=pdo_mysql
extension=zip
zend_extension=opcache
```

`dom` có thể đã được compile sẵn. Chỉ bật `extension=dom` nếu `php -m` chưa có `dom` và file DLL tương ứng tồn tại trong thư mục `ext`.

Đóng/mở PowerShell, sau đó kiểm tra:

```powershell
$requiredModules = @(
    'bcmath', 'dom', 'gd', 'intl', 'mbstring',
    'pdo_mysql', 'zip', 'Zend OPcache'
)
$installedModules = php -m
$missingModules = $requiredModules | Where-Object { $installedModules -notcontains $_ }

if ($missingModules.Count -gt 0) {
    Write-Host "Missing PHP modules: $($missingModules -join ', ')" -ForegroundColor Red
} else {
    Write-Host 'PHP modules OK' -ForegroundColor Green
}
```

## 5. Cài Composer

Tải và chạy Composer Windows Installer từ [getcomposer.org](https://getcomposer.org/download/). Khi installer hỏi PHP executable, chọn đường dẫn trả về bởi:

```powershell
(Get-Command php.exe -ErrorAction Stop).Source
```

Mở PowerShell mới và kiểm tra:

```powershell
composer --version
composer diagnose
```

Không tải `composer.phar` từ website không chính thức. Nếu cài programmatically, phải so sánh SHA-384 installer với `https://composer.github.io/installer.sig` trước khi chạy.

## 6. Cài MySQL Server 8.0

1. Mở [MySQL Installer 8.0](https://dev.mysql.com/downloads/installer/).
2. Chọn `mysql-installer-web-community-8.0.46.0.msi`, hoặc bản full installer nếu máy đích không có Internet ổn định.
3. Chọn `Server only` hoặc `Custom` và chỉ cài MySQL Server 8.0.
4. Chọn port `3306`.
5. Đặt Windows service name là `MySQL80` và bật tự khởi động cùng Windows.
6. Tạo root password mạnh, lưu trong password manager; không gửi password qua chat/log.
7. Không chọn MySQL 8.4, MariaDB, XAMPP hoặc SQLite để thay thế.

Kiểm tra service và version:

```powershell
Get-Service -Name MySQL80
mysql.exe --version
```

Nếu service chưa chạy, mở PowerShell Administrator:

```powershell
Start-Service -Name MySQL80
```

Nếu `mysql.exe` chưa có trong `PATH`, thêm thư mục sau vào User `PATH`, rồi mở terminal mới:

```text
C:\Program Files\MySQL\MySQL Server 8.0\bin
```

## 7. Tạo database và application user

Kết nối bằng TCP; `-p` sẽ hỏi root password an toàn thay vì đưa password vào command history:

```powershell
mysql.exe --protocol=TCP --host=127.0.0.1 --port=3306 --user=root -p
```

Tại dấu nhắc `mysql>`, chạy SQL sau. Thay `YOUR_STRONG_HEX_PASSWORD` bằng password riêng của application user; nên dùng 64 ký tự hexadecimal để tránh lỗi escape:

```sql
CREATE DATABASE IF NOT EXISTS `seongon_lms`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'seongon'@'localhost'
  IDENTIFIED BY 'YOUR_STRONG_HEX_PASSWORD';

ALTER USER 'seongon'@'localhost'
  IDENTIFIED BY 'YOUR_STRONG_HEX_PASSWORD';

GRANT ALL PRIVILEGES ON `seongon_lms`.* TO 'seongon'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Không dùng root account trong `BE/.env`.

## 8. Cấu hình Laravel Backend

Mở PowerShell thường, không cần Administrator:

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'

if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}

Copy-Item -LiteralPath '.env' -Destination ".env.native-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
notepad.exe '.env'
```

Đặt các giá trị sau trong `BE/.env`; không để đồng thời dòng `DB_CONNECTION=sqlite`:

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=seongon_lms
DB_USERNAME=seongon
DB_PASSWORD=YOUR_STRONG_HEX_PASSWORD

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
```

Cài packages, tạo key, migrate và seed demo:

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
composer install --no-interaction
composer check-platform-reqs
php artisan key:generate --force
php artisan migrate --force
php artisan app:seed-demo-once
```

Không chạy `migrate:fresh` trên database có dữ liệu cần giữ.

## 9. Cấu hình React/Vite Frontend

Điểm quan trọng: file FE hiện có thể trỏ tới port `8001` dành cho Docker/Nginx. Native Laravel dùng port `8000`.

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
notepad.exe '.env'
```

Đặt đúng:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Cài đúng packages từ lock file:

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm.cmd ci
```

Sau mỗi lần đổi `.env`, phải dừng và chạy lại Vite.

## 10. Chạy dự án hằng ngày

### Terminal 1 - Backend

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan serve --host=127.0.0.1 --port=8000
```

### Terminal 2 - Frontend

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Mở trình duyệt:

```text
http://localhost:5173
```

Kiểm tra Backend health endpoint:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8000/up' -UseBasicParsing
```

## 11. Verification checklist

Chạy từng lệnh và chỉ tiếp tục khi không có lỗi:

```powershell
php --version
php -m
composer --version
node --version
npm --version
mysql.exe --version
Get-Service -Name MySQL80

Set-Location 'D:\CODE\seongon-lms\BE'
composer check-platform-reqs
php artisan about
php artisan test

Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm.cmd test
npm.cmd run build
```

Kết quả cần đạt:

- PHP là `8.3.x`, Node là `22.x`, MySQL là `8.0.x`.
- MySQL80 có trạng thái `Running`.
- Không thiếu PHP extension.
- `http://127.0.0.1:8000/up` trả HTTP 200.
- `http://localhost:5173` mở được.
- FE gọi API ở port `8000`, không phải `8001`.

## 12. Lỗi thường gặp

### `php`, `node`, `composer` hoặc `mysql` is not recognized

Đóng toàn bộ terminal, mở lại và chạy `where.exe <command>`. Nếu có nhiều phiên bản, sửa User `PATH` để bản đúng đứng trước XAMPP/PHP/Node cũ.

### Composer báo thiếu `ext-*`

Chạy `php --ini` để chắc chắn đang sửa đúng `php.ini`, sau đó chạy `php -m`. Không sửa nhầm file template `php.ini-production` sau khi `php.ini` đã được tạo.

### FE mở được nhưng API lỗi/network error

Kiểm tra `FE/DEMO/.env` phải là:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Sau đó restart Vite. Đồng thời kiểm tra `BE/.env` có `FRONTEND_URL=http://localhost:5173`.

### Port 3306, 8000 hoặc 5173 bị chiếm

Chỉ xem process trước, không kill theo tên:

```powershell
Get-NetTCPConnection -State Listen |
    Where-Object { $_.LocalPort -in @(3306, 8000, 5173) } |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

Không dùng `Stop-Process -Name php`, `node` hoặc `mysql`, vì có thể dừng nhầm chương trình khác.

### MySQL `Access denied`

Thử đăng nhập trực tiếp bằng application user:

```powershell
mysql.exe --protocol=TCP --host=127.0.0.1 --port=3306 --user=seongon -p seongon_lms
```

Nếu thất bại, kiểm tra lại user/grant và password trong `BE/.env`; không đổi sang root account để né lỗi.

## 13. Trade-off so với Docker

| Native Windows | Docker |
|---|---|
| Thường tốn ít disk/RAM hơn | Tốn thêm image, volume, WSL2 disk |
| Debug trực tiếp dễ với người mới | Môi trường nhất quán giữa các máy |
| Dễ xung đột `PATH`, version, port | Version được khóa trong image |
| Gỡ từng dependency phức tạp hơn | Có thể dọn stack theo project |

Với một máy khách chỉ chạy dự án này, native Windows là phương án hợp lý. Với nhiều developer hoặc nhiều dự án dùng version khác nhau, Docker thường ổn định hơn.
