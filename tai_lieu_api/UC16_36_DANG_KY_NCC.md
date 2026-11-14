# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)

**Module:** Đăng ký nhà cung cấp (NCC)  
**Use Case:** UC16 — Nộp hồ sơ NCC; UC36 — Xác thực email hồ sơ NCC  
**Phiên bản:** 1.0.0  
**Ngày cập nhật:** 03/11/2026  
**Người phụ trách backend:** Lâm

## 1. Tổng Quan

- Base URL local: `http://localhost:8080`; JSON, thời gian ISO-8601 UTC.
- Luồng đã có: nộp hồ sơ → `PENDING_EMAIL` → xác thực OTP → `PENDING_REVIEW`.
- Chưa có API duyệt/từ chối trong module này. Nộp/xác thực hồ sơ chưa tạo account, mật khẩu, profile hoặc JWT cho NCC.

## 2. Xác Thực & Phân Quyền

Ba POST bên dưới công khai, không cần Bearer nhưng bắt buộc **CSRF**:

1. Gọi `GET /api/auth/csrf` kèm cookie; response 200 gồm `headerName` và `token`, backend đặt cookie `XSRF-TOKEN`.
2. Gửi `Content-Type: application/json`, header `X-XSRF-TOKEN: <token>` và cookie cho mỗi POST.
3. FE dùng `credentials: 'include'` hoặc Axios `withCredentials: true`; lấy CSRF từ JSON, không đọc cookie HttpOnly.

Chi tiết CSRF dùng chung nằm ở mục 4.1 tài liệu `UC01_02_03_35_AUTH_KHACH_HANG.md` trong cùng thư mục.

## 3. Quy Ước Response

Trả JSON trực tiếp, không bọc `success/data/timestamp`. Các trường null của response NCC được bỏ khỏi JSON. Response có `Cache-Control: no-store`.

```json
{
  "code": "OTP_INVALID",
  "message": "Mã xác thực không hợp lệ hoặc đã hết hạn.",
  "fieldErrors": {}
}
```

## 4. Chi Tiết API

### 4.1. Nộp hồ sơ — `POST /api/provider-applications`

Tất cả trường đều bắt buộc. Email được bỏ khoảng trắng đầu/cuối, chuyển chữ thường; các chuỗi còn lại được bỏ khoảng trắng đầu/cuối.

| Trường | Kiểu | Ràng buộc |
| --- | --- | --- |
| `email` | String | Email hợp lệ, tối đa 254 ký tự. |
| `applicantName` | String | Tên người nộp/đại diện, tối đa 150 ký tự. |
| `phone` | String | Số điện thoại liên hệ, tối đa 32 ký tự. |
| `businessName` | String | Tên cơ sở/NCC, tối đa 200 ký tự. |
| `city` | String | Khu vực hoạt động, tối đa 150 ký tự. |
| `description` | String | Mô tả dịch vụ/năng lực, tối đa 5.000 ký tự. |
| `documentUrl` | String | Tối đa 2.048 ký tự; URL HTTPS trên `drive.google.com` hoặc `docs.google.com`, có đường dẫn tài liệu/thư mục, không chứa user info; chỉ dùng cổng mặc định hoặc 443. |

```json
{
  "email": "provider@example.com",
  "applicantName": "Nguyễn Văn A",
  "phone": "0901234567",
  "businessName": "Dịch vụ tại nhà A",
  "city": "Hà Nội",
  "description": "Cung cấp dịch vụ dọn dẹp và sửa chữa tại nhà.",
  "documentUrl": "https://drive.google.com/drive/folders/your-folder-id"
}
```

Thay link ví dụ bằng link tài liệu thật đã cấp quyền đọc cho người xét duyệt. Backend kiểm tra định dạng và lưu link, không upload hoặc kiểm tra quyền truy cập Drive.

**201 Created:**

```json
{
  "email": "provider@example.com",
  "status": "PENDING_EMAIL",
  "registrationToken": "<token-cua-luot-nop-ho-so>",
  "expiresAt": "2026-11-03T09:10:00Z",
  "resendAvailableAt": "2026-11-03T09:01:00Z"
}
```

`registrationToken` là chuỗi 43 ký tự `[A-Za-z0-9_-]` trả cho FE, không gửi trong email, không phải JWT. Giữ token cùng form để verify/resend. `expiresAt` là hạn OTP; `resendAvailableAt` dùng đếm ngược gửi lại. Các giá trị `<...>` phải thay bằng giá trị thật API trả về.

### 4.2. Xác thực email — `POST /api/provider-applications/verify-email`

Ba trường đều bắt buộc; `code` là chuỗi đúng 6 chữ số.

```json
{
  "email": "provider@example.com",
  "code": "012345",
  "registrationToken": "<token-cua-luot-nop-ho-so>"
}
```

**200 OK:**

```json
{
  "email": "provider@example.com",
  "status": "PENDING_REVIEW"
}
```

FE hiển thị “Hồ sơ đã xác thực, đang chờ xét duyệt”. Chưa chuyển sang trạng thái đăng nhập NCC.

### 4.3. Gửi lại OTP — `POST /api/provider-applications/resend-verification`

```json
{
  "email": "provider@example.com",
  "registrationToken": "<token-cua-luot-nop-ho-so>"
}
```

**200 OK:** cấu trúc như nộp hồ sơ, giữ token hiện tại, thay OTP và các mốc thời gian. OTP cũ bị vô hiệu, số lần nhập sai được đặt lại.

## 5. Quy Tắc Nghiệp Vụ

- Mặc định OTP tối đa 10 phút, 5 lần nhập sai; gửi lại/nộp lại sau ít nhất 60 giây từ lần gửi mã gần nhất.
- Hồ sơ pending có hạn 24 giờ từ lúc tạo. Nộp lại/resend trong hạn không kéo dài deadline; OTP mới không vượt deadline này.
- Hết hạn thì verify/resend bị từ chối dù job chưa dọn. Nộp lại sẽ dọn lượt hết hạn và tạo lượt mới nếu email đủ điều kiện.
- Chỉ dọn pending hết hạn và challenge của nó. Hồ sơ đã xác thực/lịch sử bị từ chối được giữ; chỉ giải phóng email khi không còn dữ liệu cần giữ.

| Tình trạng email/hồ sơ | Khi nộp hồ sơ |
| --- | --- |
| Email mới | Tạo `PENDING_EMAIL`, gửi OTP và trả token. |
| `PENDING_EMAIL` còn hạn | Sau khoảng chờ, cập nhật cùng hồ sơ bằng thông tin mới; thay OTP và token. |
| `PENDING_EMAIL` hết hạn | Dọn lượt cũ, tạo hồ sơ mới với ID, mốc tạo và token mới. |
| `PENDING_REVIEW` hoặc `APPROVED` | 409; không ghi đè. |
| `REJECTED` | Giữ lịch sử; tạo hồ sơ mới, cần xác thực lại. |
| Email đã thuộc account/hồ sơ khác cần giữ | 409. Nếu chỉ có account khách pending hết hạn và không còn tham chiếu cần giữ, backend dọn để cho phép nộp NCC mới. |

## 6. Mã Lỗi & Xử Lý FE

| HTTP | Code | Xử lý |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Hiển thị `fieldErrors`; lỗi link có thể nằm ở khóa `documentUrlValid`. |
| 400 | `BAD_REQUEST` | Kiểm tra body JSON. |
| 400 | `REGISTRATION_INVALID` | Lượt không còn pending hợp lệ, hết 24 giờ hoặc token sai/cũ; dùng lượt hiện tại hoặc nộp lại. |
| 400 | `OTP_INVALID` | OTP sai, hết hạn, đã dùng hoặc đã bị thay thế. |
| 403 | `CSRF_INVALID` | Lấy lại CSRF và bảo đảm gửi cookie trước khi thử lại. |
| 409 | `EMAIL_ALREADY_USED` | Email bị giữ cho loại khác hoặc đã có account. |
| 409 | `APPLICATION_ALREADY_EXISTS` | Hồ sơ đang chờ duyệt hoặc đã được duyệt. |
| 409 | `DATA_CONFLICT` | Có yêu cầu đồng thời/xung đột dữ liệu; hiển thị `message`. |
| 429 | `OTP_RESEND_TOO_SOON` | Chờ đến `resendAvailableAt`. |
| 429 | `OTP_ATTEMPTS_EXCEEDED` | Gửi lại mã sau khoảng chờ, nếu hồ sơ còn hạn. |
| 503 | `EMAIL_DELIVERY_FAILED` | Báo gửi mail thất bại; thao tác cập nhật hồ sơ/OTP được rollback. |

## 7. Luồng Tích Hợp FE

1. Lấy CSRF → nhập thông tin và link tài liệu → nộp hồ sơ.
2. Nhận 201 → giữ email/token → mở màn hình OTP và đếm ngược theo response.
3. Gửi lại OTP khi được phép; cập nhật thời gian trả về.
4. Verify nhận `PENDING_REVIEW` → hiển thị chờ duyệt, không gọi login/refresh để đăng nhập NCC.

Mất registration token thì cho người dùng nộp lại sau khoảng chờ. Không tự nộp lại hồ sơ khi gặp lỗi mạng vì thao tác đó có thể thay thông tin, OTP và token của lượt hiện tại.
