# Production Docker Design

## 1. Mục tiêu

Đóng gói SEONGON LMS thành một Docker Compose stack tối ưu cho production trên một máy chủ, với các yêu cầu đã được duyệt:

- một Nginx duy nhất làm public entry point;
- Nginx phục vụ Vite SPA và chuyển tiếp Laravel API;
- MySQL 8 chạy trong stack;
- migration tự chạy khi application khởi động;
- demo seed chỉ chạy khi database mới chưa có user;
- phpMyAdmin là service tùy chọn;
- Frontend và API dùng cùng origin để không cần CORS trong production.

Phạm vi không bao gồm TLS certificate, load balancer, horizontal scaling, queue worker riêng, scheduler riêng, Redis hoặc CI/CD. Những phần này chỉ được bổ sung khi có yêu cầu vận hành cụ thể.

## 2. Kiến trúc được chọn

```text
Browser
   |
   v
Nginx :80
   |-- /api/*  --> PHP-FPM / Laravel
   `-- /*       --> Vite dist / React SPA

Laravel --> MySQL 8
phpMyAdmin --> MySQL 8  (chỉ khi bật profile admin)
```

Stack có bốn service:

| Service | Trách nhiệm | Public port |
|---|---|---|
| `nginx` | Phục vụ Frontend, SPA fallback, FastCGI proxy cho API | `80` |
| `app` | Chạy Laravel bằng PHP-FPM, migration và seed-once | Không |
| `mysql` | Lưu dữ liệu production | Không |
| `phpmyadmin` | Quản trị database khi cần | Chỉ `127.0.0.1:8081`, qua profile `admin` |

Nginx và PHP-FPM được tách container để mỗi service chỉ có một trách nhiệm. Không dùng all-in-one image hoặc Laravel Octane trong phạm vi này vì chúng tăng độ phức tạp mà chưa có yêu cầu tải tương ứng.

## 3. Image và build strategy

### 3.1 Laravel image

Laravel image dùng multi-stage build:

1. Composer stage cài dependency từ `BE/composer.lock` bằng `composer install --no-dev --prefer-dist --no-interaction --no-progress --classmap-authoritative`.
2. PHP runtime stage chứa PHP-FPM 8.3 và đúng các extension Laravel hiện cần: `pdo_mysql`, `mbstring`, `bcmath`, `intl`, `gd`, `dom`, `zip` và `opcache`.
3. Runtime image chỉ nhận production dependency và source cần chạy; không chứa Composer cache hoặc compiler package.
4. `storage/` và `bootstrap/cache/` thuộc quyền ghi của runtime user.

OPcache được bật với cấu hình production. PHP-FPM không publish port ra host mà chỉ lắng nghe trong Compose network.

### 3.2 Frontend/Nginx image

Nginx image cũng dùng multi-stage build:

1. Node stage chạy `npm ci` từ `FE/DEMO/package-lock.json`.
2. Vite build nhận `VITE_API_BASE_URL=/api/v1` để Browser gọi API cùng origin.
3. Chỉ `dist/` được copy sang Nginx runtime image.

Nginx routing:

- `/api/*` được gửi tới Laravel `public/index.php` qua FastCGI;
- `/healthz` trả `200` để kiểm tra Nginx;
- file tĩnh có cache header dài hạn khi tên file đã có content hash;
- route còn lại dùng `try_files ... /index.html` để refresh React route không trả `404`;
- request PHP tùy ý ngoài API không được thực thi.

## 4. Startup và data flow

### 4.1 Thứ tự khởi động

1. `mysql` khởi động và vượt qua `mysqladmin ping` bằng TCP trên `127.0.0.1` để cùng kiểm tra transport mà Laravel sử dụng.
2. `app` bắt đầu sau khi MySQL healthy.
3. Application entrypoint chạy `php artisan migrate --force`.
4. Entry point chạy command `app:seed-demo-once`.
5. Laravel production cache được tạo bằng `php artisan optimize`.
6. Entrypoint dùng `exec` để chuyển process chính thành PHP-FPM.
7. `nginx` bắt đầu sau khi `app` healthy.

Nếu migration, seed hoặc optimize thất bại, `app` phải thoát với non-zero exit code; PHP-FPM không được khởi động trong trạng thái schema chưa sẵn sàng.

### 4.2 Seed-once contract

Một Artisan command nhỏ, có test, sẽ thực hiện quy tắc sau:

- nếu bảng `users` chưa có bản ghi, gọi `db:seed --force`;
- nếu đã có ít nhất một user, ghi thông báo skip và trả exit code `0`;
- không sửa `DatabaseSeeder` hiện tại và không chạy seed vô điều kiện.

Quy tắc này phù hợp với mục tiêu “seed demo lần đầu” và tránh nhân đôi dữ liệu factory sau mỗi restart. Database production đã có user sẽ không bị thêm demo data.

Vì `DatabaseSeeder` hiện dùng Laravel factories, `fakerphp/faker` là runtime dependency của bootstrap seed. Package này được chuyển riêng sang Composer `require`; các development package khác vẫn bị loại khỏi production image.

## 5. Configuration và secret

`Infra/.env.example` chỉ chứa tên biến và development-safe placeholder. File secret thật không được commit.

Các biến bắt buộc:

- `APP_KEY`;
- `APP_URL`;
- `MYSQL_DATABASE`;
- `MYSQL_USER`;
- `MYSQL_PASSWORD`;
- `MYSQL_ROOT_PASSWORD`.

Các giá trị cố định trong production container:

- `APP_ENV=production`;
- `APP_DEBUG=false`;
- `LOG_CHANNEL=stderr` để log đi thẳng vào container logs;
- `DB_CONNECTION=mysql`;
- `DB_HOST=mysql`;
- `DB_PORT=3306`;
- `VITE_API_BASE_URL=/api/v1` tại build time.

`APP_KEY` không được tự sinh lại ở mỗi startup vì thay đổi key sẽ làm hỏng encrypted data và session hiện có.

MySQL data dùng named volume `mysql_data`. Laravel `storage/` dùng named volume `app_storage` để giữ file sinh ra sau restart; `bootstrap/cache/` nằm trong writable container filesystem. Application source không bind-mount từ host trong production.

## 6. Security và operational behavior

- Chỉ Nginx publish public port.
- MySQL và PHP-FPM chỉ có thể truy cập qua internal Compose network.
- phpMyAdmin mặc định không chạy; khi bật vẫn chỉ bind loopback host.
- Container dùng versioned base image, không dùng floating `latest` tag.
- Production image không chứa dev dependency.
- Secret đi qua environment file ngoài Git, không hard-code trong Compose.
- Nginx đặt `client_max_body_size 20m` cho course asset và API payload.
- Docker restart policy là `unless-stopped` cho long-running service.

TLS được giả định terminate ở reverse proxy/load balancer bên ngoài hoặc sẽ là một task riêng khi domain và certificate được cung cấp.

## 7. Error handling

| Failure | Expected behavior |
|---|---|
| MySQL chưa healthy | `app` chưa startup |
| Migration lỗi | `app` thoát non-zero và được ghi log |
| Seed database rỗng lỗi | `app` thoát non-zero; không che giấu partial seed |
| Database đã có user | Seed được skip, startup tiếp tục |
| PHP-FPM unhealthy | Nginx không được coi là full stack ready; API trả lỗi gateway thay vì response giả |
| Frontend deep-link | Nginx trả `index.html` |
| Thiếu secret bắt buộc | Compose/config hoặc application startup fail-fast |

## 8. Verification strategy

### 8.1 Static verification

- `docker compose config` xác thực Compose interpolation và profiles.
- Dockerfile build thành công với clean cache path.
- Nginx config vượt qua `nginx -t`.
- Shell entrypoint vượt qua syntax check trong Linux image.

### 8.2 Application verification

- Chạy toàn bộ Laravel test suite hiện có.
- Thêm test cho `app:seed-demo-once`:
  - database không có user thì seeder được chạy;
  - database đã có user thì seeder không tạo thêm dữ liệu.
- Chạy toàn bộ Vitest suite hiện có.
- Chạy Vite production build.

### 8.3 Container integration verification

Trên database volume mới:

1. build và khởi động stack;
2. xác nhận migration hoàn tất và demo user tồn tại;
3. xác nhận `/healthz` trả `200`;
4. xác nhận `/` trả SPA;
5. xác nhận một React deep-link trả SPA thay vì `404`;
6. xác nhận `/api/v1/*` tới Laravel qua cùng origin;
7. restart stack;
8. xác nhận số lượng user/demo data không tăng;
9. xác nhận `mysql` và `app` không có host port;
10. xác nhận phpMyAdmin chỉ xuất hiện khi dùng profile `admin`.

## 9. Files dự kiến thay đổi

| Path | Mục đích |
|---|---|
| `Infra/docker-compose.yml` | Production Compose stack |
| `Infra/.env.example` | Production environment template |
| `Infra/README.md` | Build, startup, profile và verification commands |
| `Infra/docker/php/Dockerfile` | Laravel PHP-FPM multi-stage image |
| `Infra/docker/php/entrypoint.sh` | Migration, seed-once, optimize, PHP-FPM startup |
| `Infra/docker/php/opcache.ini` | Production OPcache settings |
| `Infra/docker/nginx/Dockerfile` | Vite build và Nginx runtime image |
| `Infra/docker/nginx/default.conf` | Reverse proxy, SPA fallback, cache và health endpoint |
| `.dockerignore` | Loại dependency/cache/secret khỏi build context |
| `BE/app/Console/Commands/SeedDemoOnce.php` | Seed database mới đúng một lần |
| `BE/tests/Feature/Console/SeedDemoOnceCommandTest.php` | Behavioral tests cho seed-once command |

Không refactor application code ngoài command seed-once và test trực tiếp của nó.

## 10. Definition of done

Work chỉ được coi là hoàn thành khi có fresh verification evidence cho tất cả điều sau:

1. Compose config hợp lệ.
2. Production images build thành công.
3. Laravel tests pass.
4. Frontend tests và production build pass.
5. Empty database tự migrate và seed.
6. Restart không tạo demo data trùng.
7. SPA, deep-link và API reverse proxy hoạt động qua Nginx.
8. phpMyAdmin đúng là optional profile.
9. Không có secret thật trong Git diff.
10. Chỉ các file thuộc phạm vi thiết kế bị thay đổi.
