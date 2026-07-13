# SEONGON LMS — Hướng dẫn sử dụng bản demo

SEONGON LMS là website học trực tuyến dành cho ba nhóm người dùng:

- **Khách:** xem và tìm kiếm khóa học.
- **Học viên:** mua khóa học, học bài, làm quiz và theo dõi tiến độ.
- **Admin:** quản lý học viên, khóa học, danh mục và đánh giá.

Tài liệu này dành cho người không chuyên kỹ thuật. Bạn chỉ cần Docker Desktop và PowerShell; không cần biết Laravel, React hoặc MySQL.

## 1. Bạn cần chuẩn bị gì?

1. Máy tính Windows có [Docker Desktop](https://www.docker.com/products/docker-desktop/) đã được cài đặt.
2. Thư mục source code `seongon-lms`.
3. File `Infra\.env` đã được người phụ trách dự án cấu hình.

Nếu chưa có `Infra\.env`, lần chạy đầu tiên sẽ tự tạo file này rồi dừng lại. Làm theo phần **Chuẩn bị configuration** trong [Infra/README.md](Infra/README.md), sau đó chạy lại.

### “Container” nghĩa là gì?

- **Mức trẻ 5 tuổi:** container giống một chiếc hộp đã xếp sẵn ứng dụng và mọi đồ dùng cần thiết.
- **Mức học sinh cấp 2:** container là môi trường chạy riêng, giúp ứng dụng hoạt động giống nhau trên nhiều máy.
- **Mức sinh viên năm nhất:** container là process được cô lập cùng filesystem và dependencies; Docker Compose khởi động nhiều container phối hợp thành một hệ thống.

Từ đây tài liệu sử dụng từ **container**.

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

> Các tài khoản và mật khẩu này chỉ dành cho môi trường demo local. Không sử dụng cho website public hoặc production.

## 4. Bộ dữ liệu demo có gì?

Sau khi tạo dữ liệu, hệ thống có:

- 100 khóa học published.
- 116 học viên: giữ 16 học viên nền và thêm 100 học viên demo.
- Mỗi học viên được ghi danh vào 3–8 khóa học.
- Mỗi khóa học có 4 bài học, quiz cuối khóa và câu hỏi mẫu.
- Dữ liệu order, progress và review để các màn hình Student/Admin có nội dung trình diễn.

Ba nhóm khóa học:

1. **SEO AI Max — 34 khóa:** Khóa học tối ưu hóa công cụ tìm kiếm (SEO) ứng dụng các công cụ AI để tăng tốc độ và hiệu suất làm việc.
2. **Google Ads — 33 khóa:** Khóa học thực chiến về thiết lập, tối ưu và quản lý chiến dịch quảng cáo trên nền tảng Google.
3. **Content SEO — 33 khóa:** Khóa học định hướng và kỹ năng viết nội dung chuẩn SEO, tối ưu trải nghiệm người dùng và thuật toán tìm kiếm.

## 5. Tạo lại 100 khóa học

> **Cảnh báo:** Lệnh dưới đây xóa toàn bộ khóa học, bài học, order, enrollment, progress, quiz, certificate và review hiện tại. Tài khoản người dùng được giữ nguyên.

Chỉ chạy khi bạn chắc chắn muốn thay catalog hiện tại:

```powershell
docker compose --env-file 'Infra\.env' -f 'Infra\docker-compose.yml' exec -T app php artisan app:replace-demo-catalog --force
```

Kết quả thành công sẽ hiển thị:

```text
Đã thay catalog demo thành công.
```

Lệnh có thể chạy lại. Hệ thống vẫn giữ đúng 100 khóa học và không nhân bản 100 tài khoản demo.

## 6. Kiểm tra, xem log và dừng ứng dụng

Chạy các lệnh từ thư mục `seongon-lms`:

```powershell
# Xem các container có healthy hay không
& '.\Infra\run-docker.ps1' status

# Xem log; nhấn Ctrl+C để thoát khỏi màn hình log
& '.\Infra\run-docker.ps1' logs

# Khởi động lại nhưng giữ nguyên dữ liệu
& '.\Infra\run-docker.ps1' restart

# Dừng ứng dụng nhưng giữ database
& '.\Infra\run-docker.ps1' down
```

## 7. Xử lý lỗi thường gặp

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

Gửi phần log có chữ `ERROR` cho người phụ trách kỹ thuật; không xóa Docker volume vì volume đang chứa database.

### Website vẫn hiển thị giao diện cũ

Nhấn `Ctrl+F5` để tải lại toàn bộ trang. Nếu vẫn còn, chạy lại action `up` để rebuild image.

### Quên mật khẩu demo

Mật khẩu mặc định là `password`. Nếu tài khoản đã bị chỉnh sửa, chạy lại bộ dữ liệu chỉ khôi phục mật khẩu của 100 tài khoản `@demo.seongon.vn`; tài khoản hiện có không bị thay đổi.

## 8. Dành cho người phụ trách kỹ thuật

- Tài liệu Docker chi tiết: [Infra/README.md](Infra/README.md)
- Backend Laravel: [BE/README.md](BE/README.md)
- Prototype và SPEC: thư mục `SPEC`
- Frontend React: thư mục `FE/DEMO`
