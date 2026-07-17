# SEONGON LMS — Hướng dẫn sử dụng bản demo

SEONGON LMS là website học trực tuyến dành cho ba nhóm người dùng:

- **Khách:** xem và tìm kiếm khóa học.
- **Học viên:** mua khóa học, học bài, làm quiz và theo dõi tiến độ.
- **Admin:** quản lý học viên, khóa học, danh mục và đánh giá.


## 1. Bạn cần chuẩn bị gì?

1. Máy tính Windows có [Docker Desktop](https://www.docker.com/products/docker-desktop/) đã được cài đặt.
2. Thư mục source code `seongon-lms`.
3. File `Infra\.env` đã được người phụ trách dự án cấu hình.

Nếu chưa có `Infra\.env`, lần chạy đầu tiên sẽ tự tạo file này rồi dừng lại. Làm theo phần **Chuẩn bị configuration** trong [Infra/README.md](Infra/README.md), sau đó chạy lại.


## 2. Khởi động ứng dụng

1. Mở Docker Desktop.
2. Đợi đến khi Docker Desktop hiển thị trạng thái **Engine running**.
3. Mở thư mục `seongon-lms` trong File Explorer.
4. Nhấp vào thanh địa chỉ, nhập `powershell` rồi nhấn Enter.
5. Chạy lệnh:

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

## 3. Tài khoản demo

Tất cả tài khoản dưới đây dùng mật khẩu `password`.

| Vai trò | Email | Dùng để làm gì? |
|---|---|---|
| Admin | `admin@seongon.vn` | Quản lý toàn bộ hệ thống |
| Học viên chính | `student@seongon.vn` | Trải nghiệm luồng học viên |
| Học viên tạo thêm | `student001@demo.seongon.vn` đến `student100@demo.seongon.vn` | Kiểm thử dữ liệu đông người dùng |


## 4. Bộ dữ liệu demo có gì?

Sau khi tạo dữ liệu, hệ thống có:
Ba nhóm khóa học:

1. **SEO AI Max — 34 khóa:** Khóa học tối ưu hóa công cụ tìm kiếm (SEO) ứng dụng các công cụ AI để tăng tốc độ và hiệu suất làm việc.
2. **Google Ads — 33 khóa:** Khóa học thực chiến về thiết lập, tối ưu và quản lý chiến dịch quảng cáo trên nền tảng Google.
3. **Content SEO — 33 khóa:** Khóa học định hướng và kỹ năng viết nội dung chuẩn SEO, tối ưu trải nghiệm người dùng và thuật toán tìm kiếm.


## 5. Xử lý lỗi thường gặp

### Docker Desktop chưa chạy

Triệu chứng: PowerShell báo không kết nối được Docker Engine.

Cách xử lý: mở Docker Desktop, đợi **Engine running**, sau đó chạy lại lệnh `up`.

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

