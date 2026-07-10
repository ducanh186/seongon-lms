# SEONGON LMS — Phần mềm quản lý và học tập trực tuyến

Nền tảng bán & học khóa học trực tuyến cho công ty SEONGON.

## Kiến trúc

Hệ thống tách rời (decoupled) gồm 3 phần:

| Thư mục | Vai trò | Stack |
|---|---|---|
| `BE/` | REST API backend | Laravel 12 · PHP 8.3 · Sanctum · MySQL 8 |
| `FE/` | Single Page Application | React 19 · Vite · TypeScript · TailwindCSS |
| `Infra/` | Hạ tầng chạy local/deploy | Docker Compose (mysql, backend, frontend) |

Frontend gọi Backend qua JSON API (`/api/v1`), xác thực bằng Bearer token (Sanctum).

## Tác nhân

- **Khách (Guest):** xem/tìm khóa học, đăng ký tài khoản, đăng nhập.
- **Học viên (Student):** mua khóa (thanh toán mock), học video, theo dõi tiến độ, thi cuối khóa (đạt ≥ 75%), nhận chứng chỉ, đánh giá.
- **Quản trị viên (Admin):** quản lý tài khoản, danh mục, khóa học, bài học, bài kiểm tra/ngân hàng câu hỏi, đánh giá, dashboard thống kê.

## Tài liệu thiết kế

- Đặc tả gốc: [`SPEC/Draft.md`](SPEC/Draft.md)
- Spec Backend: [`docs/superpowers/specs/2026-07-10-seongon-lms-backend-design.md`](docs/superpowers/specs/)
- Spec Frontend: [`docs/superpowers/specs/2026-07-10-seongon-lms-frontend-design.md`](docs/superpowers/specs/)

## Trạng thái

🚧 Đang ở giai đoạn thiết kế (brainstorming → spec). Chưa scaffold code.
