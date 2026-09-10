# Frontend React/Vite

Frontend nằm trong `FE/DEMO`, gọi Laravel API qua `VITE_API_BASE_URL` và tạo bundle tĩnh trong `FE/DEMO/dist`.

## Chạy riêng frontend

Từ thư mục gốc repository:

```powershell
npm ci --prefix FE/DEMO
Copy-Item FE/DEMO/.env.example FE/DEMO/.env
npm run dev --prefix FE/DEMO -- --host 127.0.0.1 --port 5173
```

Mặc định `.env.example` trỏ tới Laravel local tại `http://127.0.0.1:8000/api/v1`. Backend phải đang chạy thì các màn hình lấy dữ liệu mới hoạt động.

Build production local:

```powershell
npm run build --prefix FE/DEMO
```

Kết quả nằm tại `FE/DEMO/dist`.

## Biến môi trường

Frontend chỉ cần:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

- Local: có thể sao chép giá trị trong `.env.example`.
- Vercel: nhập URL HTTPS thật của Laravel API và bắt buộc kết thúc bằng `/api/v1`.
- Biến `VITE_*` được đóng gói vào JavaScript phía trình duyệt. Không đặt password, API secret, private key hoặc token trong biến này.

Build trên Vercel sẽ dừng sớm nếu thiếu `VITE_API_BASE_URL`, dùng HTTP, dùng host local hoặc thiếu hậu tố `/api/v1`. Đây là kiểm tra cấu hình; nó không kiểm tra backend có đang hoạt động hay không.

## Deploy frontend lên Vercel

1. Import repository vào Vercel và giữ **Root Directory** ở thư mục gốc.
2. Thêm `VITE_API_BASE_URL` cho từng môi trường cần deploy bằng URL backend thật.
3. Giữ các lệnh trong `vercel.json`:
   - Install: `npm ci --prefix FE/DEMO`
   - Build: `npm run build --prefix FE/DEMO`
   - Output: `FE/DEMO/dist`
4. Sau deploy, kiểm tra mở trực tiếp một đường dẫn sâu, đăng nhập và một request API trong trình duyệt.

SPA rewrite trong `vercel.json` đưa route không phải file tĩnh về `index.html`, vì vậy refresh ở đường dẫn React Router không bị 404.

Laravel không được deploy bởi cấu hình này. Backend cần host riêng, bật HTTPS và đặt `FRONTEND_URL` thành đúng origin Vercel để CORS cho phép request. Không dùng URL preview làm origin production nếu backend chỉ cho phép một origin.

Chưa có URL production nào được cấu hình trong repository và quy trình này không tự publish website.
