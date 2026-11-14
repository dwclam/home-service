# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)

- **Module:** Xác thực admin
- **Use Case:** UC27 — Đăng nhập admin và dùng chung refresh, thông tin tài khoản hiện tại, đăng xuất
- **Ngày cập nhật:** 14/11/2026
- **Người phụ trách backend:** Lâm

## 1. Phạm vi và trạng thái

Backend hỗ trợ đăng nhập ADMIN cấp nội bộ bằng ADM-01. CUSTOMER và ADMIN dùng chung refresh, `/me` và logout. Đăng nhập/refresh NCC chưa triển khai. Xem [cấp tài khoản admin](../docs/admin-provisioning.md) và [xét duyệt hồ sơ NCC](UC28_DUYET_NCC.md).

Base URL local: `http://localhost:8080`. Response JSON trực tiếp, không bọc `success/data`; có `Cache-Control: no-store`. Mật khẩu/hash và refresh JWT không được trả trong JSON.

## 2. CSRF và cookie

1. Gọi `GET /api/auth/csrf`, giữ cookie do backend trả và lấy `headerName`, `token` trong JSON.
2. Khi POST login/refresh/logout, gửi cookie và header `X-XSRF-TOKEN: <token>`; body JSON dùng `Content-Type: application/json`.
3. Login/logout thành công xóa CSRF cũ; gọi lại `/csrf` trước POST xác thực tiếp theo. Cookie CSRF HttpOnly, không đọc bằng JavaScript.

Các POST xác thực này kiểm tra CSRF và bỏ qua Bearer header. Trình duyệt dùng `credentials: 'include'` hoặc Axios `withCredentials: true`. Trong Insomnia, dùng cùng collection và hostname cho GET CSRF và các POST. Header lấy `token` từ JSON, còn Insomnia gửi cookie `XSRF-TOKEN` đã lưu.

## 3. Đăng nhập — `POST /api/auth/login/admin`

```json
{
  "email": "admin@example.com",
  "password": "<mat-khau-da-dung-khi-cap-admin>"
}
```

Email bắt buộc, hợp lệ, tối đa 254 ký tự; backend bỏ khoảng trắng đầu/cuối và chuyển chữ thường. Mật khẩu bắt buộc, tối đa 72 ký tự và 72 byte UTF-8; không trim. Dùng tài khoản đã cấp ở ADM-01; thay toàn bộ placeholder bằng thông tin của bạn.

Chỉ chấp nhận account ADMIN, ACTIVE, có `email_verified_at` và `must_change_password=false`. Loại tài khoản được quyết định bởi endpoint, không nhận quyền từ body. Admin không dùng endpoint login khách `/api/auth/login`.

**200 OK**, đặt cookie refresh và trả `LoginResponse` dùng chung:

```json
{
  "account": {
    "id": 12,
    "email": "admin@example.com",
    "accountType": "ADMIN",
    "displayName": "Admin",
    "phone": null,
    "status": "ACTIVE",
    "emailVerifiedAt": "2026-11-03T01:00:00Z",
    "mustChangePassword": false
  },
  "accessToken": "<accessJwt>",
  "tokenType": "Bearer",
  "expiresAt": "2026-11-04T01:05:00Z"
}
```

Access JWT có `role=ADMIN`, `sub` là ID account, `token_use=access`. YAML mặc định `JWT_ACCESS_TTL=24h` và `JWT_REFRESH_TTL=14d`. File `.env.example` đặt access là `15m`. Client dùng `expiresAt` từ response theo cấu hình đang chạy.

Cookie `NESTIFY_REFRESH` chứa refresh JWT: HttpOnly, SameSite=Lax, Path=/api/auth, Secure theo cấu hình. Không đọc hoặc tự đưa refresh JWT vào body. Nếu đổi từ tài khoản khác trên cùng cookie jar, logout trước khi login để kết thúc chuỗi cũ; login khác account không tự thu hồi refresh của account trước.

Login admin và khách dùng chung bộ đếm rate limit theo email/IP và IP. Yêu cầu login có dữ liệu hợp lệ được tính trước kiểm tra mật khẩu, kể cả thành công; vượt ngưỡng trả 429 kèm `Retry-After`.

## 4. Các endpoint dùng chung

| Endpoint | Cách gọi | Kết quả |
| --- | --- | --- |
| `GET /api/auth/me` | Bearer access JWT CUSTOMER hoặc ADMIN | 200 `AccountResponse` của chính principal, không có lớp bọc `account` |
| `POST /api/auth/refresh` | Cookie refresh + CSRF, không body | 200 `LoginResponse`, thay cookie refresh; access mới giữ đúng vai trò account trong DB |
| `POST /api/auth/logout` | Cookie + CSRF, không body | 204, thu hồi family refresh hiện tại và xóa cookie refresh/CSRF |

Refresh kiểm tra account vẫn CUSTOMER/ADMIN ACTIVE, đã xác thực và không phải đổi mật khẩu. Rotation dùng một lần; dùng lại token đã tiêu thụ thu hồi cả chuỗi, kể cả token mới. Hạn tuyệt đối của chuỗi không kéo dài. Client điều phối một refresh tại một thời điểm và không tự retry khi mất response.

Logout thu hồi refresh family hiện tại. Access JWT đã cấp còn hạn tới `exp`. Các API xét duyệt và cấp lại kiểm tra admin trong database trên mỗi request để chặn admin đã bị khóa dù token còn hạn. `/me` dùng access JWT để đọc thông tin tài khoản hiện tại.

## 5. Mã lỗi

| HTTP | Code | Ý nghĩa |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Thiếu/sai định dạng email hoặc mật khẩu quá giới hạn ký tự |
| 400 | `PASSWORD_TOO_LONG` | Mật khẩu vượt 72 byte UTF-8 |
| 401 | `INVALID_CREDENTIALS` | Sai mật khẩu, email không tồn tại hoặc account không phải ADMIN |
| 403 | `ACCOUNT_SUSPENDED` | Admin bị khóa |
| 403 | `EMAIL_NOT_VERIFIED` | Admin chưa ACTIVE hoặc chưa xác thực email |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Account bị yêu cầu đổi mật khẩu |
| 403 | `CSRF_INVALID` | Thiếu/sai cookie hoặc header CSRF |
| 401 | `AUTHENTICATION_REQUIRED` | `/me` thiếu access JWT hợp lệ |
| 401 | `REFRESH_TOKEN_INVALID` / `REFRESH_TOKEN_REUSED` | Refresh không hợp lệ hoặc bị dùng lại; controller xóa cookie refresh |
| 429 | `LOGIN_RATE_LIMITED` | Chờ số giây trong header `Retry-After` |

## 6. Trình tự kiểm tra thủ công bằng Insomnia

1. Người vận hành cấp admin bằng ADM-01 trên database đã chọn; bật backend.
2. Gọi `/csrf`, rồi POST `/login/admin` với cookie/header CSRF và thông tin admin; lưu access token, kiểm tra `accountType=ADMIN`.
3. Gọi `/me` bằng Bearer token vừa nhận.
4. Lấy lại CSRF sau login; POST `/refresh` bằng cookie jar, kiểm tra token mới và `accountType=ADMIN`.
5. POST `/logout` với cookie/CSRF; kiểm tra 204. Lấy CSRF mới rồi gọi refresh phải nhận 401 vì cookie refresh đã bị xóa.

`AdminAuthIntegrationTests` dùng MockMvc, H2 và đồng hồ test để kiểm tra login admin, token và cookie, sai role/trạng thái, CSRF, rate limit dùng chung, `/me`, rotation, reuse và logout. Chưa chạy các bước Insomnia trên PostgreSQL thật trong lần bàn giao này.
