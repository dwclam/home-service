# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)

**Module:** Tài khoản và xác thực khách hàng  
**Use Case:** UC01 — Đăng ký; UC35 — Xác thực email; UC02 — Đăng nhập; UC03 — Đăng xuất  
**Phiên bản:** 1.0.0  
**Ngày cập nhật:** 03/11/2026  
**Người phụ trách backend:** Lâm

## 1. Tổng Quan

- Base URL local: `http://localhost:8080`. Khi deploy, dùng địa chỉ backend của môi trường đó.
- Dữ liệu JSON; thời gian ISO-8601 UTC. Các giá trị `<...>` trong ví dụ phải thay bằng dữ liệu API trả về.
- Đã có đăng ký, OTP, login, refresh, `/me`, logout cho khách. Chưa có quên mật khẩu, login NCC hoặc đổi mật khẩu lần đầu. Login admin có endpoint riêng; xem [UC27](UC27_DANG_NHAP_ADMIN.md).

## 2. Xác Thực & Phân Quyền

| API | Yêu cầu |
| --- | --- |
| `GET /api/auth/csrf` | Công khai; FE gửi kèm cookie. |
| Các `POST /api/auth/...` trong tài liệu | Cookie CSRF + header `X-XSRF-TOKEN`; không cần Bearer. |
| `POST /api/auth/refresh`, `/logout` | Gửi thêm cookie `NESTIFY_REFRESH` do backend cấp khi login. |
| `GET /api/auth/me` | `Authorization: Bearer <accessToken>`, vai trò CUSTOMER hoặc ADMIN (tài liệu này mô tả luồng CUSTOMER). |

FE dùng `credentials: 'include'` với fetch hoặc `withCredentials: true` với Axios để trình duyệt nhận/gửi cookie. Body JSON cần `Content-Type: application/json`.

Access JWT nằm trong JSON, FE giữ trong bộ nhớ. Refresh JWT nằm trong cookie HttpOnly; FE không đọc hoặc tự đưa nó vào body. Cookie CSRF cũng HttpOnly: lấy token từ JSON của `/csrf`, không đọc `document.cookie`.

## 3. Quy Ước Response

Các endpoint này trả DTO trực tiếp, **không có lớp bọc `success/data/timestamp`**. Logout trả `204`, không có body. Response có `Cache-Control: no-store`.

Lỗi dùng chung cấu trúc:

```json
{
  "code": "OTP_INVALID",
  "message": "Mã xác thực không hợp lệ hoặc đã hết hạn.",
  "fieldErrors": {}
}
```

## 4. Chi Tiết API

### 4.1. Lấy CSRF — `GET /api/auth/csrf`

Không có body. **200 OK**, đồng thời backend đặt cookie `XSRF-TOKEN`:

```json
{
  "headerName": "X-XSRF-TOKEN",
  "token": "<csrfToken>"
}
```

FE giữ `token`, gửi vào header mang tên `headerName` cho các POST. Sau login/logout thành công, lấy lại CSRF trước POST tiếp theo vì backend đã xóa cookie CSRF cũ.

### 4.2. Đăng ký khách — `POST /api/auth/register/customer`

| Trường | Bắt buộc | Ràng buộc |
| --- | --- | --- |
| `email` | Có | Email hợp lệ, tối đa 254 ký tự; backend bỏ khoảng trắng đầu/cuối và chuyển chữ thường. |
| `password` | Có | 8–72 ký tự và tối đa 72 byte UTF-8; không tự cắt khoảng trắng. |
| `displayName` | Có | Không rỗng, tối đa 150 ký tự. |
| `phone` | Không | Tối đa 32 ký tự; bỏ trống được lưu thành null. |

```json
{
  "email": "lam@example.com",
  "password": "Password-123!",
  "displayName": "Lâm",
  "phone": "0901234567"
}
```

**201 Created:** tạo account `PENDING_EMAIL`, gửi OTP đến email đăng ký.

```json
{
  "email": "lam@example.com",
  "registrationToken": "<token-cua-luot-dang-ky>",
  "expiresAt": "2026-11-03T09:10:00Z",
  "resendAvailableAt": "2026-11-03T09:01:00Z"
}
```

`registrationToken` là chuỗi ngẫu nhiên 43 ký tự `[A-Za-z0-9_-]`, không phải JWT. FE giữ cùng form để verify/resend. `expiresAt` là hạn **OTP**, `resendAvailableAt` là thời điểm sớm nhất được gửi lại.

### 4.3. Xác thực email — `POST /api/auth/verify-email`

Ba trường đều bắt buộc; `code` là **chuỗi 6 chữ số** để giữ được số 0 ở đầu.

```json
{
  "email": "lam@example.com",
  "code": "012345",
  "registrationToken": "<token-cua-luot-dang-ky>"
}
```

**200 OK:** account chuyển sang `ACTIVE`. Đây là cấu trúc `AccountResponse`, cũng dùng cho `/me` và trường `account` của login/refresh:

```json
{
  "id": 12,
  "email": "lam@example.com",
  "accountType": "CUSTOMER",
  "displayName": "Lâm",
  "phone": "0901234567",
  "status": "ACTIVE",
  "emailVerifiedAt": "2026-11-03T09:02:00Z",
  "mustChangePassword": false
}
```

`phone` có thể null. Xác thực email **chưa đăng nhập**, FE chuyển sang màn hình login.

### 4.4. Gửi lại OTP — `POST /api/auth/resend-verification`

```json
{
  "email": "lam@example.com",
  "registrationToken": "<token-cua-luot-dang-ky>"
}
```

**200 OK:** cấu trúc như đăng ký, giữ token hiện tại, cấp OTP mới và cập nhật hai mốc thời gian. OTP cũ bị vô hiệu, số lần nhập sai được đặt lại.

### 4.5. Đăng nhập — `POST /api/auth/login`

```json
{
  "email": "lam@example.com",
  "password": "Password-123!"
}
```

Email bắt buộc, hợp lệ, tối đa 254 ký tự. Mật khẩu bắt buộc, tối đa 72 ký tự và 72 byte UTF-8. Chỉ chấp nhận CUSTOMER đã xác thực, đang ACTIVE và không bị yêu cầu đổi mật khẩu.

**200 OK**, đồng thời đặt cookie HttpOnly `NESTIFY_REFRESH`:

```json
{
  "account": {
    "id": 12,
    "email": "lam@example.com",
    "accountType": "CUSTOMER",
    "displayName": "Lâm",
    "phone": "0901234567",
    "status": "ACTIVE",
    "emailVerifiedAt": "2026-11-03T09:02:00Z",
    "mustChangePassword": false
  },
  "accessToken": "<accessJwt>",
  "tokenType": "Bearer",
  "expiresAt": "2026-11-04T09:03:00Z"
}
```

`expiresAt` ở đây là hạn **access token**. YAML hiện mặc định access 24 giờ, refresh 14 ngày, có thể bị ghi đè theo môi trường; FE dùng thời gian response, không cố định thời hạn trong code.

### 4.6. Làm mới đăng nhập — `POST /api/auth/refresh`

- Không có body; gửi cookie refresh và CSRF/header như mục 2.
- **200 OK:** cùng cấu trúc login; backend thay cookie refresh, FE thay access token trong bộ nhớ.
- Refresh mới giữ hạn cuối của chuỗi đăng nhập ban đầu. Dùng lại refresh đã tiêu thụ sẽ thu hồi cả chuỗi.
- FE chỉ cho một yêu cầu refresh chạy tại một thời điểm, kể cả phối hợp giữa các tab. Nếu refresh trả 401, về màn hình login, không lặp refresh vô hạn.

### 4.7. Thông tin account hiện tại — `GET /api/auth/me`

Không có body; gửi `Authorization: Bearer <accessToken>`. **200 OK:** `AccountResponse` như mục 4.3. API trả thông tin tài khoản đang đăng nhập, không nhận ID người dùng và chưa phải API chỉnh sửa hồ sơ.

### 4.8. Đăng xuất — `POST /api/auth/logout`

Không có body. Gửi cookie và CSRF. **204 No Content:** thu hồi chuỗi refresh hiện tại, xóa cookie refresh/CSRF. FE xóa access token và trạng thái đăng nhập; không gọi `response.json()` trên body rỗng.

Access token cũ vẫn có thể dùng tới lúc hết hạn. Logout không đăng xuất tất cả thiết bị. Refresh thiếu/hết hạn vẫn được trả 204 nếu kiểm tra CSRF đã qua.

## 5. Quy Tắc Nghiệp Vụ

- Mặc định OTP có hạn tối đa 10 phút, tối đa 5 lần nhập sai, gửi lại sau 60 giây. Dùng các mốc response để đếm ngược.
- Đăng ký pending có hạn 24 giờ từ lần tạo ban đầu. Đăng ký lại/resend trong hạn không kéo dài mốc này; OTP mới cũng không vượt hạn đăng ký.
- Đăng ký lại cùng email pending còn hạn cập nhật thông tin/mật khẩu, thay OTP và registration token. Mất token có thể đăng ký lại sau khoảng chờ.
- Hết hạn: verify/resend bị từ chối. Đăng ký lại sẽ dọn lượt cũ và tạo lượt mới nếu email không còn bị dữ liệu khác giữ chỗ; không phải chờ job dọn.
- Tài khoản đã xác thực và lịch sử hồ sơ NCC cần giữ không bị dọn. Email đã được giữ cho loại khác có thể bị từ chối đăng ký khách.
- Login mặc định giới hạn 5 yêu cầu/email+IP và 30 yêu cầu/IP mỗi phút, tính cả lần nhập đúng. Khi bị chặn, FE chờ số giây trong header `Retry-After`.

## 6. Mã Lỗi & Xử Lý FE

| HTTP | Code | Xử lý |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Hiển thị lỗi theo `fieldErrors`. |
| 400 | `BAD_REQUEST` | Kiểm tra body JSON. |
| 400 | `PASSWORD_TOO_LONG` | Mật khẩu vượt 72 byte UTF-8. |
| 400 | `REGISTRATION_INVALID` | Token đăng ký sai/cũ; dùng lượt hiện tại hoặc đăng ký lại. |
| 400 | `VERIFICATION_NOT_AVAILABLE` | Không còn account pending hợp lệ, hoặc lượt đã hết 24 giờ. |
| 400 | `OTP_INVALID` | Mã sai, hết hạn hoặc không còn dùng được. |
| 401 | `INVALID_CREDENTIALS` | Email/mật khẩu sai hoặc không phải khách hàng. |
| 401 | `AUTHENTICATION_REQUIRED` | `/me` thiếu access JWT hợp lệ; thử refresh rồi login nếu cần. |
| 401 | `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_REUSED` | Xóa trạng thái đăng nhập và yêu cầu login lại. |
| 403 | `CSRF_INVALID` | Lấy lại CSRF và bảo đảm trình duyệt gửi cookie trước khi thử lại. |
| 403 | `ACCESS_DENIED` | Vai trò không được dùng endpoint. |
| 403 | `EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`, `PASSWORD_CHANGE_REQUIRED` | Hiển thị `message`, không coi là login thành công. |
| 409 | `EMAIL_ALREADY_USED`, `DATA_CONFLICT` | Email đã bị giữ hoặc có yêu cầu xung đột; hiển thị `message`. |
| 429 | `OTP_RESEND_TOO_SOON` | Chờ đến `resendAvailableAt`. |
| 429 | `OTP_ATTEMPTS_EXCEEDED` | Yêu cầu OTP mới sau khoảng chờ, nếu lượt đăng ký còn hạn. |
| 429 | `LOGIN_RATE_LIMITED` | Chờ theo header `Retry-After`. |
| 503 | `EMAIL_DELIVERY_FAILED` | Gửi mail thất bại; báo lỗi và cho người dùng thử lại. |

## 7. Luồng Tích Hợp FE

1. Lấy CSRF → đăng ký → giữ `email` và `registrationToken` → mở form OTP.
2. Verify thành công → login → lưu access token/account → lấy lại CSRF.
3. Gọi `/me` và API nghiệp vụ bằng Bearer; khi reload trang, lấy CSRF rồi thử refresh để khôi phục đăng nhập.
4. Logout → xóa trạng thái FE → về màn hình đăng nhập.

Trong Insomnia: bật cookie jar, gọi `/csrf`, lấy `token` từ JSON vào header cho POST; sau login lấy `accessToken` làm Bearer cho `/me`.
