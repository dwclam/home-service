# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)

**Module:** Xác thực admin  
**Use Case:** UC27 — Đăng nhập admin; refresh, thông tin hiện tại và đăng xuất dùng chung  
**Ngày cập nhật:** 03/11/2026  
**Người phụ trách backend:** Lâm

## 1. Phạm vi và trạng thái

Backend đã bổ sung đăng nhập ADMIN cấp nội bộ bằng [ADM-01](../docs/admin-provisioning.md). Chưa bổ sung kiểm thử tự động riêng cho ADM-02 theo yêu cầu trong chat; cần kiểm tra thủ công trước khi nghiệm thu. Chức năng duyệt/từ chối NCC thuộc các task sau. PROVIDER vẫn chưa được đăng nhập/refresh.

Base URL local: `http://localhost:8080`. Response JSON trực tiếp, không bọc `success/data`; có `Cache-Control: no-store`. Mật khẩu/hash và refresh JWT không được trả trong JSON.

## 2. CSRF và cookie

1. Gọi `GET /api/auth/csrf`, giữ cookie do backend trả và lấy `headerName`, `token` trong JSON.
2. Khi POST login/refresh/logout, gửi cookie và header `X-XSRF-TOKEN: <token>`; body JSON dùng `Content-Type: application/json`.
3. Login/logout thành công xóa CSRF cũ; gọi lại `/csrf` trước POST xác thực tiếp theo. Cookie CSRF HttpOnly, không đọc bằng JavaScript.

Các POST xác thực này không cần Bearer và bỏ qua Bearer cũ/hết hạn, nhưng luôn kiểm tra CSRF. Trình duyệt dùng `credentials: 'include'` hoặc Axios `withCredentials: true`; Insomnia cần giữ cookie jar của cùng backend.

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

Access JWT có `role=ADMIN`, `sub` là ID account, `token_use=access`. TTL dùng cấu hình `JWT_ACCESS_TTL`/`JWT_REFRESH_TTL` hiện hành; YAML mặc định 24 giờ/14 ngày. Ví dụ thời gian chỉ minh họa; client dùng `expiresAt` thực tế.

Cookie `NESTIFY_REFRESH` chứa refresh JWT: HttpOnly, SameSite=Lax, Path=/api/auth, Secure theo cấu hình. Không đọc hoặc tự đưa refresh JWT vào body. Nếu đổi từ tài khoản khác trên cùng cookie jar, logout trước khi login để kết thúc chuỗi cũ; login khác account không tự thu hồi refresh của account trước.

Login admin và khách dùng chung bộ đếm rate limit theo email/IP và IP. Yêu cầu login có dữ liệu hợp lệ được tính trước kiểm tra mật khẩu, kể cả thành công; vượt ngưỡng trả 429 kèm `Retry-After`.

## 4. Các endpoint dùng chung

| Endpoint | Cách gọi | Kết quả |
| --- | --- | --- |
| `GET /api/auth/me` | Bearer access JWT CUSTOMER hoặc ADMIN | 200 `AccountResponse` của chính principal, không có lớp bọc `account` |
| `POST /api/auth/refresh` | Cookie refresh + CSRF, không body | 200 `LoginResponse`, thay cookie refresh; access mới giữ đúng vai trò account trong DB |
| `POST /api/auth/logout` | Cookie + CSRF, không body | 204, thu hồi family refresh hiện tại và xóa cookie refresh/CSRF |

Refresh kiểm tra account vẫn CUSTOMER/ADMIN ACTIVE, đã xác thực và không phải đổi mật khẩu. Rotation dùng một lần; dùng lại token đã tiêu thụ thu hồi cả chuỗi, kể cả token mới. Hạn tuyệt đối của chuỗi không kéo dài. Client điều phối một refresh tại một thời điểm và không tự retry khi mất response.

Logout không thu hồi access JWT đã cấp; token này vẫn chịu `exp` hiện hành. Các API nghiệp vụ quản trị sẽ phải kiểm tra trạng thái admin trong DB khi triển khai, không chỉ dựa vào role trong access JWT. `/me` đọc thông tin tài khoản hiện tại, không phải API quản trị tài khoản.

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

Chưa thực hiện trình tự này trên database thật trong phiên triển khai. Các kiểm tra tự động admin về sai role/trạng thái, rate limit, CSRF, rotation/reuse và logout được hoãn, không coi kiểm thử hồi quy khách/NCC là bằng chứng cho toàn bộ ADM-02.
