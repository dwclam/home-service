# API Conventions — Nestify

**Cập nhật:** 27/10/2026. Quy ước API dùng chung, đồng bộ với xác thực JWT hiện tại. Request/response chi tiết cho tài khoản nằm ở [customer-auth.md](customer-auth.md); cấu hình nằm ở [backend-config.md](backend-config.md).

## 1. Định dạng chung

- Body request/response dùng JSON và UTF-8. Response 204 không có body; không gọi `response.json()` khi nhận 204.
- Thời gian trong JSON API là ISO-8601; claim `iat`/`exp` bên trong JWT dùng NumericDate theo JWT.
- Tiền là số nguyên đồng VND; không dùng số thực cho số tiền.
- Request/response DTO dùng class thông thường với constructor/getter/setter và validation phù hợp. Không trả trực tiếp entity JPA hoặc hash/bí mật nội bộ.

## 2. Đường dẫn API

| Phạm vi | Đường dẫn | Trạng thái |
| --- | --- | --- |
| Xác thực khách | `/api/auth/...` | Đã triển khai; dùng chính xác tiền tố này. |
| Health | `/api/health` | Đã triển khai. |
| Nghiệp vụ khách/NCC/admin | `/api/v1/customer/...`, `/api/v1/provider/...`, `/api/v1/admin/...` | Tiền tố dùng cho khung nghiệp vụ; từng endpoint phải được triển khai riêng. |
| Nội dung công khai | `/api/v1/public/...` | Quy ước cho chức năng triển khai sau; chưa tự động được mở trong SecurityConfig. |

Không gọi `/api/v1/auth/...` để thay cho `/api/auth/...`: code hiện tại chưa có alias này. SecurityConfig kiểm tra vai trò cho cả `/api/{customer,provider,admin}/**` và các đường dẫn tương ứng có `/v1`; điều đó không tạo thêm controller hoặc API.

URI tài nguyên dùng danh từ số nhiều, chữ thường, gạch nối khi có nhiều từ. Các action xác thực đã có như `/login`, `/refresh`, `/logout` giữ theo hợp đồng hiện tại.

## 3. Xác thực và quyền

API được bảo vệ nhận access JWT qua header:

```http
Authorization: Bearer <access JWT>
```

- Access JWT hết hạn mặc định sau 15 phút. Server kiểm tra chữ ký/claim, lấy `sub` làm account ID và `role` làm quyền; không dùng cookie refresh để xác thực API nghiệp vụ.
- Refresh JWT tối đa 14 ngày kể từ login, nằm trong cookie HttpOnly `NESTIFY_REFRESH`. Không gửi refresh token trong query string, URL hoặc body của API nghiệp vụ.
- `POST /api/auth/refresh` dùng cookie refresh và CSRF, trả access JWT mới trong JSON, đồng thời thay cookie refresh. Mỗi refresh token chỉ được dùng một lần; frontend điều phối để tránh refresh đồng thời, kể cả giữa các tab.
- `POST /api/auth/logout` thu hồi chuỗi refresh và xóa cookie; frontend xóa access token trong bộ nhớ. Access token đã cấp vẫn có thể dùng tới `exp`; không hứa chặn ngay mọi request sau logout/khóa account.
- Quyền URL kiểm tra vai trò; quyền sở hữu tài nguyên phải kiểm tra trong service nghiệp vụ dựa trên principal. Account ID/role do client gửi không quyết định người đang đăng nhập.
- Mới có login/refresh cho CUSTOMER. Các API NCC/admin và reset/khóa account được bổ sung theo kế hoạch, không coi là đã xong chỉ vì SecurityConfig có rule role.

- Đăng ký trả `registrationToken` ngẫu nhiên gắn với lần nhập thông tin/mật khẩu. Verify gửi `email`, `code`, `registrationToken`; resend gửi `email`, `registrationToken`. Đây không phải access/refresh JWT. Chỉ lưu hash trong DB; frontend giữ token theo đúng form. Đăng ký lại CUSTOMER đang PENDING_EMAIL cập nhật thông tin và thay OTP/token sau thời gian chờ gửi mã. Token cũ không được dùng với OTP mới. ACTIVE, SUSPENDED và các loại account khác vẫn bị từ chối đăng ký lại.

## 4. Cookie và CSRF

| Request | Access JWT | Cookie và CSRF |
| --- | --- | --- |
| `GET /api/auth/csrf` | Không cần. | Trả cookie CSRF và `{headerName, token}`. |
| POST đăng ký/OTP/login dưới `/api/auth` | Không cần. | Gửi cookie CSRF và header lấy từ JSON. Login thành công đặt cookie refresh. |
| `POST /api/auth/refresh` | Không cần. | Cookie refresh và CSRF bắt buộc để làm mới thành công. |
| `POST /api/auth/logout` | Không cần. | CSRF hợp lệ; nếu có refresh hợp lệ thì thu hồi chuỗi. |
| `GET /api/auth/me` và API nghiệp vụ được bảo vệ | Gửi Bearer access JWT. | Không dùng refresh cookie làm danh tính; Bearer request không cần mã CSRF. |

Frontend dùng `credentials: 'include'` hoặc `withCredentials: true` cho các request cần cookie. Cookie CSRF là HttpOnly; gửi token được trả trong JSON, không đọc cookie bằng JavaScript. Token JSON đã được che bằng XOR nên không so sánh chuỗi trực tiếp với giá trị cookie.

Các POST xác thực công khai kiểm tra CSRF kể cả khi có Authorization header và bỏ qua Bearer token ở những endpoint này. Sau login/logout thành công, lấy lại CSRF trước POST xác thực tiếp theo. Cookie refresh và CSRF có SameSite=Lax; môi trường HTTPS đặt Secure, origin FE phải có trong CORS.

## 5. Cấu trúc response

Dữ liệu phân trang dùng `PageResponse<T>`. Login và refresh dùng cùng `LoginResponse`:

## 3. Cấu trúc Response
- **Response thành công chuẩn**: Mọi API trả về dữ liệu bọc trong `StandardResponse<T>`:
  ```json
  {
    "success": true,
    "message": "Đặt lịch thành công",
    "data": { ... },
    "timestamp": "2026-10-24T07:20:00Z"
  }
  ```
- **Dữ liệu phân trang**: Được bọc trong `data` dưới dạng `PageResponse<T>`.
- **Xử lý lỗi tập trung**: Trả về mã lỗi và thông báo chi tiết qua `GlobalExceptionHandler` (sử dụng `ApiError`).
```text
account       → AccountResponse, không có password hash
accessToken   → JWT để gọi API
tokenType     → "Bearer"
expiresAt     → hạn access token theo ISO-8601
```

Refresh JWT chỉ đi qua `Set-Cookie`; không có trường `refreshToken` trong JSON. Verify-email và `/me` trả trực tiếp `AccountResponse`. Logout trả 204, không có body. Response tài khoản/CSRF có `Cache-Control: no-store`.

Lỗi trả `ApiError`; ví dụ:

```json
{
  "code": "AUTHENTICATION_REQUIRED",
  "message": "Bạn cần đăng nhập để thực hiện thao tác này.",
  "fieldErrors": {}
}
```

`fieldErrors` chứa lỗi theo tên trường khi validation đầu vào thất bại. Lỗi ở filter do `SecurityErrorHandler` xử lý; lỗi trong controller/service do `GlobalExceptionHandler` xử lý. Không chỉ dựa vào thông báo hiển thị để quyết định nhánh xử lý.

## 6. HTTP status và retry

| Status/code | Xử lý |
| --- | --- |
| 400 / VALIDATION_ERROR | Hiển thị lỗi từng trường; không refresh token. |
| 401 / INVALID_CREDENTIALS | Thông tin login không đúng; không gọi refresh để lặp login. |
| 401 / AUTHENTICATION_REQUIRED | API được bảo vệ chưa xác thực. Có thể thử refresh đúng một lần rồi thử lại request nếu phù hợp. |
| 401 / REFRESH_TOKEN_INVALID hoặc REFRESH_TOKEN_REUSED | Xóa access token local, yêu cầu login lại; không gọi refresh tiếp. |
| 403 / CSRF_INVALID | Lấy lại CSRF, kiểm tra cookie/origin; không xử lý như access token hết hạn. |
| 403 / ACCESS_DENIED hoặc lỗi trạng thái account | Hiển thị giới hạn quyền/trạng thái; không tự lặp request. |
| 409 / EMAIL_ALREADY_USED hoặc DATA_CONFLICT | Xử lý dữ liệu trùng/xung đột theo chức năng. |
| 400 / REGISTRATION_INVALID | Lượt đăng ký không còn hợp lệ; bắt đầu đăng ký lại để lấy OTP/token mới. |
| 429 / OTP_RESEND_TOO_SOON hoặc OTP_ATTEMPTS_EXCEEDED | Chờ đủ thời gian trước khi xin mã tiếp. |
| 429 / LOGIN_RATE_LIMITED | Chờ số giây trong header `Retry-After` rồi thử đăng nhập lại. Không tự refresh token để lặp lại login. |
| 503 / EMAIL_DELIVERY_FAILED | Kiểm tra SMTP/thử lại theo luồng gửi mã. |

Không tự retry thao tác ghi khi response bị mất hoặc kết quả chưa rõ. Riêng refresh token chỉ dùng một lần: retry bằng token cũ sau một lần đổi đã thành công trên server có thể làm cả chuỗi bị thu hồi. Hợp đồng chống lặp của các API thanh toán/đặt lịch cần được thống nhất riêng cho từng thao tác.
