# SEONGON LMS — Hướng dẫn sử dụng bản demo

SEONGON LMS là website học trực tuyến dành cho ba nhóm người dùng:

- **Khách:** xem và tìm kiếm khóa học.
- **Học viên:** mua khóa học, học bài, làm quiz và theo dõi tiến độ.
- **Admin:** quản lý học viên, khóa học, danh mục và đánh giá.

## 1. Lấy mã nguồn

Bạn có thể dùng Git để cập nhật thuận tiện về sau, hoặc tải file ZIP nếu không muốn cài Git.

### Cách A — Clone bằng Git (khuyến nghị)

1. Mở PowerShell.
2. Kiểm tra Git:

```powershell
git --version
```

3. Nếu PowerShell báo không tìm thấy `git`, cài Git rồi mở lại PowerShell:

```powershell
winget install --id Git.Git --exact --source winget --accept-source-agreements --accept-package-agreements
```

4. Chuyển đến thư mục muốn lưu source code và clone repository:

```powershell
Set-Location (Join-Path $HOME 'Downloads')
git clone https://github.com/ducanh186/seongon-lms.git
Set-Location '.\seongon-lms'
```

### Cập nhật code mới bằng Git

Mở thư mục `seongon-lms` trong File Explorer, nhập `powershell` vào thanh địa chỉ rồi chạy:

```powershell
git status
git pull --ff-only origin main
& '.\Infra\run-docker.ps1' up
```

Nếu `git pull` báo có thay đổi local bị xung đột, không xóa hoặc reset dữ liệu. Hãy sao lưu file đã chỉnh sửa hoặc nhờ người phụ trách kỹ thuật xử lý.

### Cách B — Tải file ZIP, không cần Git

1. Mở [repository SEONGON LMS trên GitHub](https://github.com/ducanh186/seongon-lms).
2. Chọn **Code** → **Download ZIP**. Bạn cũng có thể dùng [link tải ZIP trực tiếp](https://github.com/ducanh186/seongon-lms/archive/refs/heads/main.zip).
3. Nhấp chuột phải vào file ZIP → **Extract All**.
4. Mở thư mục `seongon-lms-main` vừa giải nén.

Bản ZIP không có lịch sử Git nên không thể dùng `git pull`. Khi cần cập nhật:

1. Sao lưu file `Infra\.env` hiện tại.
2. Tải và giải nén bản ZIP mới vào một thư mục mới.
3. Chép file `Infra\.env` đã sao lưu vào thư mục `Infra` của bản mới.
4. Chạy lại `& '.\Infra\run-docker.ps1' up` trong thư mục mới.

## 2. Bạn cần chuẩn bị gì?

1. Máy tính Windows 10 hoặc Windows 11 có kết nối Internet.
2. Thư mục source code `seongon-lms`.
3. File `Infra\.env` đã được người phụ trách dự án cấu hình.

Script khởi động sẽ tự kiểm tra, cài và mở Docker Desktop khi cần. Windows có thể yêu cầu quyền administrator hoặc restart để hoàn tất WSL 2. Nếu chưa có `Infra\.env`, lần chạy đầu tiên sẽ tự tạo file này rồi dừng lại. Làm theo phần **Chuẩn bị configuration** trong [Infra/README.md](Infra/README.md), sau đó chạy lại.

## 3. Khởi động ứng dụng

1. Mở thư mục `seongon-lms` trong File Explorer.
2. Nhấp vào thanh địa chỉ, nhập `powershell` rồi nhấn Enter.
3. Chạy lệnh:

```powershell
& '.\Infra\run-docker.ps1' up
```

Script sẽ kiểm tra configuration, build image, khởi động MySQL, backend và website rồi chờ đến khi các container khỏe mạnh.

Khi thấy dòng `SEONGON LMS is ready`, mở:

- Website: [http://localhost](http://localhost)
- Health check: [http://localhost/healthz](http://localhost/healthz)

Nếu PowerShell chặn script, chạy hai lệnh sau trong đúng cửa sổ PowerShell hiện tại:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& '.\Infra\run-docker.ps1' up
```

## 4. Tài khoản demo

Tất cả tài khoản dưới đây dùng mật khẩu `password`.

| Vai trò | Email | Dùng để làm gì? |
|---|---|---|
| Admin | `admin@seongon.vn` | Quản lý toàn bộ hệ thống |
| Học viên chính | `student@seongon.vn` | Trải nghiệm luồng học viên |
| Học viên tạo thêm | `student001@demo.seongon.vn` đến `student100@demo.seongon.vn` | Kiểm thử dữ liệu đông người dùng |


## 5. Bộ dữ liệu demo có gì?

Sau khi tạo dữ liệu, hệ thống có:
Ba nhóm khóa học:

1. **SEO AI Max — 34 khóa:** Khóa học tối ưu hóa công cụ tìm kiếm (SEO) ứng dụng các công cụ AI để tăng tốc độ và hiệu suất làm việc.
2. **Google Ads — 33 khóa:** Khóa học thực chiến về thiết lập, tối ưu và quản lý chiến dịch quảng cáo trên nền tảng Google.
3. **Content SEO — 33 khóa:** Khóa học định hướng và kỹ năng viết nội dung chuẩn SEO, tối ưu trải nghiệm người dùng và thuật toán tìm kiếm.


## 6. Xử lý lỗi thường gặp

### Docker Desktop chưa sẵn sàng

Triệu chứng: PowerShell báo không kết nối được Docker Engine.

Cách xử lý: chạy lại action `up`. Script sẽ thử cài hoặc mở Docker Desktop và chờ Docker Engine. Nếu thông báo yêu cầu WSL 2, virtualization hoặc restart Windows, làm theo hướng dẫn English trong PowerShell rồi chạy lại.

### Port 80 đang được ứng dụng khác sử dụng

Triệu chứng: container Nginx không khởi động và log có nội dung `port is already allocated`.

Cách xử lý:

1. Mở `Infra\.env` bằng Notepad.
2. Đổi `HTTP_PORT=80` thành `HTTP_PORT=8080`.
3. Chạy lại `& '.\Infra\run-docker.ps1' up`.
4. Mở `http://localhost:8080`.

### Container không healthy

Chạy:

```powershell
& '.\Infra\run-docker.ps1' status
& '.\Infra\run-docker.ps1' logs
```

### Website vẫn hiển thị giao diện cũ

Nhấn `Ctrl+F5` để tải lại toàn bộ trang. Nếu vẫn còn, chạy lại action `up` để rebuild image.

