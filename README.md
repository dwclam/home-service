# Nestify - Nền tảng dịch vụ tại nhà

Dự án gồm giao diện đặt dịch vụ tại nhà và backend cung cấp API. Giao diện hiện được xây dựng từ mẫu trong `docs/test-cnweb.html`; các luồng đăng nhập, đặt lịch và dữ liệu dịch vụ vẫn là bản mẫu, chưa kết nối backend.

## Công nghệ

| Phần | Công nghệ chính |
| --- | --- |
| Frontend | React 19, Vite 8, Tailwind CSS 3, Lucide React |
| Backend | Java 21, Spring Boot 4, Spring Web MVC, Spring Data JPA, Spring Security |
| Cơ sở dữ liệu | PostgreSQL |

## Yêu cầu

- JDK 21.
- Node.js `^20.19.0` hoặc `>=22.12.0` và npm.
- PostgreSQL đang chạy và một database đã được tạo sẵn.

Backend có Maven Wrapper (`backend/mvnw`), nên không cần cài Maven riêng.

## Chạy dự án

### 1. Cấu hình backend

Sao chép `backend/.env.example` thành `backend/.env`, sau đó điền các giá trị:

```properties
DB_URL=jdbc:postgresql://localhost:5432/home_service
DB_USERNAME=postgres
DB_PASSWORD=your_password
SERVER_PORT=8080
```

`DB_URL` phải trỏ đến database PostgreSQL đã tồn tại. Có thể xóa dòng `SERVER_PORT` để dùng cổng mặc định `8080`. File `.env` được Git bỏ qua; không đưa mật khẩu vào mã nguồn.

Dự án dùng được Neon với URL JDBC PostgreSQL có `sslmode=require`; giữ nguyên thông tin Neon đã cấu hình trong `.env`. Các cấu hình mới có mặc định: `FRONTEND_ORIGINS=http://localhost:5173`, `COOKIE_SECURE=false` cho HTTP local, `SHOW_SQL=false`, `FLYWAY_ENABLED=false`. Khi dùng HTTPS, đặt `COOKIE_SECURE=true`.

Hibernate đang dùng `ddl-auto: validate`. Đã chuẩn bị Flyway nhưng chưa bật/chưa có migration tài khoản; bật sau khi bổ sung migration đầu tiên. Xem [cấu hình backend và hợp đồng CSRF](docs/backend-config.md) trước khi nối frontend.

Chạy backend từ thư mục `backend`:

```bash
cd backend
./mvnw spring-boot:run
```

Trên Windows, dùng `mvnw.cmd spring-boot:run`. Sau khi ứng dụng khởi động, mở `http://localhost:8080/api/health`; endpoint trả về `status: ok` và `service: home-service`.

### 2. Chạy frontend

Mở terminal khác:

```bash
cd frontend
npm ci
npm run dev
```

Mở URL mà Vite hiển thị trong terminal, thường là `http://localhost:5173/`. Frontend hiện chưa gọi API backend, nên có thể xem giao diện mà không cần khởi động backend.

## Kiểm tra

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
./mvnw test
```

Test backend dùng profile `test` với H2 trong bộ nhớ, không cần kết nối Neon. Các bài kiểm tra cấu hình bao gồm quyền truy cập, CORS, CSRF, lỗi JSON và hash mật khẩu. Bản build frontend nằm trong `frontend/dist/` và được Git bỏ qua.

## Cấu trúc

```text
backend/                         Spring Boot API và cấu hình PostgreSQL
frontend/src/                    React components, dữ liệu mẫu và CSS
docs/test-cnweb.html             Mẫu giao diện ban đầu
docs/FE-guideline-lite (1).md    Quy định giao diện FE
```

Trang chủ được ghép trong `frontend/src/App.jsx`. Dữ liệu hiển thị mẫu nằm ở `frontend/src/data/home.js`. Backend có `/api/health`, `/api/auth/csrf` và cấu hình bảo mật nền. API đăng nhập, phiên tài khoản và các chức năng nghiệp vụ chưa được triển khai; frontend chưa nối API.
