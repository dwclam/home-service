# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)

- **Module:** Xác thực nhà cung cấp (NCC)
- **Use Case:** UC17 — Đăng nhập NCC
- **Ngày cập nhật:** 15/11/2026
- **Người phụ trách backend:** Lâm

## 1. Điều kiện đăng nhập

NCC dùng email đã xác thực và mật khẩu tạm nhận được sau khi [hồ sơ được duyệt](UC28_DUYET_NCC.md), hoặc mật khẩu mới nếu đã [đổi lần đầu](UC42_DOI_MAT_KHAU_LAN_DAU.md). Backend yêu cầu account `PROVIDER`, trạng thái `ACTIVE) và profile liên kết với hồ sơ `APPROVED` cùng email. NCC dùng endpoint riêng `/api/auth/login/provider`.

Base URL local là `http://localhost:8080`. Login trả JSON trực tiếp và đặt `Cache-Control: no-store`.

## 2. CSRF và cookie

1. Gọi `GET /api/auth/csrf`. Giữ cookie `XSRF-TOKEN` trong cookie jar và lấy `headerName`, `token` từ JSON.
2. Với POST login, đổi mật khẩu lần đầu, refresh và logout, gửi cookie cùng header `X-XSRF-TOKEN: <token>` lấy từ JSON. Dùng `Content-Type: application/json` cho request có body JSON.
3. Login, đổi mật khẩu lần đầu và logout thành công xóa CSRF cũ. Gọi lại `/api/auth/csrf` trước POST tiếp theo cần CSRF.

Frontend dùng `credentials: 'include'` hoặc Axios `withCredentials: true` cho request cần cookie. Cookie CSRF là HttpOnly. Giá trị header lấy từ JSON của `/csrf`.

Cookie refresh `NESTIFY_REFRESH` là HttpOnly, SameSite=Lax, Path=/api/auth và dùng Secure theo cấu hình. Trình duyệt tự gửi cookie khi gọi refresh và logout. Frontend giữ access token và token đổi mật khẩu trong bộ nhớ.

## 3. Đăng nhập — `POST /api/auth/login/provider`

```json
{
  "email": "ncc@example.com",
  "password": "<mat-khau-ncc>"
}
```

Email bắt buộc, hợp lệ, tối đa 254 ký tự. Backend bỏ khoảng trắng đầu/cuối email và chuyển về chữ thường. Mật khẩu bắt buộc, tối đa 72 ký tự và 72 byte UTF-8, giữ nguyên khoảng trắng. Login luôn kiểm tra CSRF và bỏ qua Bearer header.

### 200 OK khi cần đổi mật khẩu

```json
{
  "mustChangePassword": true,
  "passwordChangeToken": "<jwt-doi-mat-khau>",
  "expiresAt": "2026-11-15T01:05:00Z"
}
```

Response chỉ cấp token cho [UC42](UC42_DOI_MAT_KHAU_LAN_DAU.md) và xóa cookie refresh cũ trên client. Chuỗi refresh cũ trong DB của tài khoản khác vẫn còn hiệu lực. FE mở form đổi mật khẩu. Token hết hạn sau tối đa 5 phút theo cấu hình và chỉ dùng cho `POST /api/auth/provider/first-password`.

### 200 OK khi đã đổi mật khẩu

Backend đặt cookie refresh và trả `LoginResponse` dùng chung.

```json
{
  "account": {
    "id": 42,
    "email": "ncc@example.com",
    "accountType": "PROVIDER",
    "displayName": "Nhà cung cấp mẫu",
    "phone": null,
    "status": "ACTIVE",
    "emailVerifiedAt": "2026-11-14T07:30:00Z",
    "mustChangePassword": false
  },
  "accessToken": "<access-jwt>",
  "tokenType": "Bearer",
  "expiresAt": "2026-11-15T01:15:00Z"
}
```

FE gửi `Authorization: Bearer <accessToken>` cho API nghiệp vụ NCC. Dùng `expiresAt` của response để theo dõi hạn của token theo cấu hình backend.

## 4. Endpoint dùng chung sau khi đăng nhập

| Endpoint | Request | Kết quả |
| --- | --- | --- |
| `GET /api/auth/me` | Bearer access JWT | `200` với `AccountResponse`, chính là cấu trúc `account` bên trên |
| `POST /api/auth/refresh` | Cookie refresh + CSRF, body rỗng | `200 LoginResponse` và cookie refresh mới |
| `POST /api/auth/logout` | Cookie + CSRF, body rỗng | `204 No Content`, thu hồi chuỗi refresh hiện tại, xóa cookie refresh và CSRF |

Refresh kiểm tra lại điều kiện của NCC và yêu cầu `must_change_password=false`. Mỗi refresh token chỉ dùng một lần. Dùng lại token đã tiêu thụ sẽ thu hồi cả chuỗi, gồm token mới. Hạn tuyệt đối của chuỗi giữ nguyên sau refresh. FE điều phối một request refresh tại một thời điểm và tránh tự gửi lại khi mất response.

`/me` kiểm tra lại account và liên kết hồ sơ NCC trong database. Nếu điều kiện đã thay đổi, endpoint có thể trả `403 ACCOUNT_SUSPENDED`, `403 EMAIL_NOT_VERIFIED`, `403 PASSWORD_CHANGE_REQUIRED` hoặc `409 DATA_CONFLICT`.

FE xóa access token và token đổi mật khẩu khỏi bộ nhớ khi logout. Access JWT đã cấp có hiệu lực tới `exp`. JWT đổi mật khẩu hết hạn theo `expiresAt` và chỉ dùng được khi tài khoản còn phải đổi mật khẩu.

## 5. Mã lỗi

| HTTP | Code | Ý nghĩa |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Thiếu hoặc sai định dạng trường, mật khẩu vượt giới hạn ký tự |
| 400 | `PASSWORD_TOO_LONG` | Mật khẩu vượt 72 byte UTF-8 |
| 401 | `INVALID_CREDENTIALS` | Sai email, mật khẩu hoặc loại tài khoản. Gồm hồ sơ chưa được cấp account. |
| 403 | `ACCOUNT_SUSPENDED` | Tài khoản bị khóa |
| 403 | `EMAIL_NOT_VERIFIED` | Tài khoản chưa ACTIVE hoặc email chưa xác thực |
| 403 | `CSRF_INVALID` | Thiếu hoặc sai cookie/header CSRF |
| 409 | `DATA_CONFLICT` | Account thiếu liên kết profile hoặc hồ sơ đã duyệt hợp lệ |
| 429 | `LOGIN_RATE_LIMITED` | Vượt giới hạn dùng chung theo email/IP và IP. Chờ số giây trong `Retry-After`. |

`/me` yêu cầu access JWT hợp lệ, lỗi trả `401 AUTHENTICATION_REQUIRED`. Refresh token không hợp lệ hoặc bị dùng lại trả `401 REFRESH_TOKEN_INVALID` hoặc `401 REFRESH_TOKEN_REUSED` và xóa cookie refresh.

## 6. Kiểm tra thủ công bằng Insomnia

1. Duyệt một hồ sơ đã xác thực theo [UC28](UC28_DUYET_NCC.md), lấy email và mật khẩu tạm từ hộp thư test.
2. Giữ cùng collection và hostname. Gọi `GET /api/auth/csrf`, chép `token` JSON vào header `X-XSRF-TOKEN` cho POST. Insomnia tự gửi cookie CSRF khi dùng cookie jar.
3. POST `/api/auth/login/provider` bằng mật khẩu tạm. Kiểm tra `200` và `mustChangePassword=true`. Dùng token vừa nhận làm Bearer cho `GET /api/provider/availability` để kiểm tra API nghiệp vụ từ chối.
4. Lấy CSRF mới, [đổi mật khẩu lần đầu](UC42_DOI_MAT_KHAU_LAN_DAU.md). Gọi `GET /api/auth/me` và `GET /api/provider/availability` bằng access token mới, kiểm tra cả hai trả `200`.
5. Lấy CSRF mới sau đổi mật khẩu. POST `/api/auth/refresh` rồi POST `/api/auth/logout` bằng cùng cookie jar, kiểm tra lần lượt `200` và `204`.
6. Lấy CSRF mới. Đăng nhập lại với mật khẩu mới để kiểm tra nhận `LoginResponse`. Lấy CSRF thêm một lần rồi thử mật khẩu tạm cũ, kiểm tra nhận `401 INVALID_CREDENTIALS`.
