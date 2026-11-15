# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)

- **Module:** Xác thực nhà cung cấp (NCC)
- **Use Case:** UC42 — Đổi mật khẩu lần đầu
- **Ngày cập nhật:** 15/11/2026
- **Người phụ trách backend:** Lâm

## 1. Khi nào hiển thị form

Mở form khi [đăng nhập NCC](UC17_DANG_NHAP_NCC.md) trả `mustChangePassword=true` và `passwordChangeToken`. NCC nhập mật khẩu tạm hiện tại và mật khẩu mới. Frontend kiểm tra ô xác nhận mật khẩu ngay trên form và gửi hai trường bên dưới.

## 2. Đổi mật khẩu — `POST /api/auth/provider/first-password`

Gọi `GET /api/auth/csrf` sau login để lấy CSRF mới vì login đã xóa CSRF cũ. Gửi cookie CSRF, `X-XSRF-TOKEN: <token-tu-json-csrf>`, `Authorization: Bearer <passwordChangeToken>` và `Content-Type: application/json`.

```json
{
  "currentPassword": "<mat-khau-tam-hien-tai>",
  "newPassword": "<mat-khau-moi>"
}
```

Backend lấy ID account từ JWT đã xác thực. Chỉ gửi `currentPassword` và `newPassword` trong body. `newPassword` phải có 8–72 ký tự, tối đa 72 byte UTF-8 và khác mật khẩu hiện tại. `currentPassword` cũng tối đa 72 byte UTF-8. Khoảng trắng thuộc giá trị mật khẩu.

JWT chỉ dùng cho đúng endpoint đổi mật khẩu. Token có `token_use=first_password_change`, audience `nestify-first-password`, `sub` là ID account và hết hạn sau tối đa 5 phút. Backend kiểm tra chữ ký, issuer, hạn và mục đích trước khi đọc account.

## 3. Kết quả thành công

**200 OK** trả [`LoginResponse`](UC17_DANG_NHAP_NCC.md#200-ok-khi-đã-đổi-mật-khẩu) với `account.accountType=PROVIDER` và `account.mustChangePassword=false`. Response đặt cookie `NESTIFY_REFRESH`, xóa CSRF cũ và đặt `Cache-Control: no-store`.

Backend khóa account, kiểm tra mật khẩu tạm khớp hash hiện tại rồi lưu hash mới, tắt cờ bắt buộc đổi, thu hồi mọi refresh token cũ và cấp cặp token mới trong một transaction. Response chỉ được trả khi transaction thành công.

Hai yêu cầu đổi đồng thời chỉ một yêu cầu thành công. Nếu admin [cấp lại mật khẩu tạm](UC28_DUYET_NCC.md) trước, mật khẩu tạm cũ bị từ chối dù token đổi mật khẩu còn hạn. Nếu NCC đổi trước, cờ đã tắt và admin không thể cấp lại mật khẩu tạm bằng ADM-06.

## 4. Mã lỗi và xử lý trên FE

| HTTP | Code | Cách xử lý |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Kiểm tra trường bắt buộc và độ dài ký tự |
| 400 | `PASSWORD_TOO_LONG` | Yêu cầu nhập mật khẩu trong giới hạn 72 byte UTF-8 |
| 400 | `PASSWORD_UNCHANGED` | Yêu cầu nhập mật khẩu mới khác mật khẩu tạm |
| 401 | `PASSWORD_CHANGE_TOKEN_INVALID` | Token thiếu, sai loại, sai chữ ký hoặc hết hạn. Quay lại login để lấy token đúng. |
| 401 | `INVALID_CREDENTIALS` | Kiểm tra mật khẩu tạm, dùng email cấp mật khẩu gần nhất nếu đã được cấp lại |
| 403 | `ACCOUNT_SUSPENDED` | Hiển thị tài khoản bị khóa |
| 403 | `EMAIL_NOT_VERIFIED` | Hiển thị tài khoản chưa ACTIVE hoặc email chưa xác thực |
| 403 | `CSRF_INVALID` | Lấy lại CSRF và kiểm tra cookie/header |
| 409 | `PASSWORD_CHANGE_NOT_REQUIRED` | Tài khoản đã đổi mật khẩu. Quay lại login với mật khẩu mới. |
| 409 | `DATA_CONFLICT` | Thiếu liên kết profile/hồ sơ hợp lệ. Dừng quy trình và báo lỗi. |
| 429 | `LOGIN_RATE_LIMITED` | Dùng chung giới hạn với login. Chờ số giây trong `Retry-After` trước khi cho gửi tiếp. |

FE giữ token đổi mật khẩu trong bộ nhớ và khóa nút gửi khi đang chờ response. Khi thành công, bỏ token đổi mật khẩu, giữ access token trong bộ nhớ, bật các chức năng NCC và lấy lại CSRF trước POST kế tiếp cần CSRF. Nếu reload làm mất token đổi mật khẩu, quay lại login.

Nếu mất response lúc đổi mật khẩu, thử login bằng mật khẩu mới sau khi lấy CSRF. Việc đăng nhập thành công xác nhận lần đổi đã commit. Nếu mật khẩu mới bị từ chối, người dùng có thể đăng nhập lại bằng mật khẩu tạm hiện tại và tự gửi một yêu cầu đổi mới. FE không tự gửi lại request đổi mật khẩu đã mất response.

## 5. Kiểm tra thủ công bằng Insomnia

1. Sau login bằng mật khẩu tạm, giữ nguyên collection/hostname. Gọi lại `GET /api/auth/csrf` và dùng `token` từ JSON cho header CSRF.
2. Đặt Bearer token là `passwordChangeToken`, điền body rồi gửi POST. Kiểm tra trả `200`, cookie refresh được đặt và `mustChangePassword=false` trong `account`.
3. Dùng `accessToken` mới cho `GET /api/auth/me`. Nếu gọi lại endpoint đổi bằng token đổi mật khẩu còn hạn và CSRF mới, kiểm tra nhận `409 PASSWORD_CHANGE_NOT_REQUIRED`.
