# Đăng ký làm nhà cung cấp

Luồng nộp hồ sơ và xác thực OTP kết thúc ở `PENDING_REVIEW`. Tài khoản NCC chỉ được tạo khi admin duyệt. Đăng nhập NCC và đổi mật khẩu lần đầu thuộc UC17/UC42. Xem [API xét duyệt hồ sơ](../tai_lieu_api/UC28_DUYET_NCC.md).

## Chuẩn bị

Chạy backend như [README](../README.md), cấu hình SMTP như [xác thực khách hàng](customer-auth.md). Không cần dependency hoặc bảng dữ liệu mới cho luồng này; dùng các entity hồ sơ, email identity và OTP hiện có.

Ba endpoint bên dưới đều công khai nhưng bắt buộc CSRF:

1. Gọi `GET /api/auth/csrf`, giữ cookie trong cookie jar (Postman tự giữ cookie).
2. Lấy `headerName` và `token` trong JSON, gửi header đó ở các POST tiếp theo. Mặc định là `X-XSRF-TOKEN`.
3. Khi dùng trình duyệt, gửi cookie với `credentials: 'include'`. CORS phải cho phép origin của frontend.

Không cần Bearer token. Các endpoint này bỏ qua Authorization header và vẫn kiểm tra CSRF. Response có `Cache-Control: no-store`.

## 1. Nộp hồ sơ

`POST /api/provider-applications`

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

Tất cả trường đều bắt buộc. Email được bỏ khoảng trắng đầu/cuối và chuyển chữ thường. Các chuỗi còn lại được bỏ khoảng trắng đầu/cuối.

| Trường | Độ dài tối đa |
| --- | --- |
| email | 254 |
| applicantName | 150 |
| phone | 32 |
| businessName | 200 |
| city | 150 |
| description | 5.000 |
| documentUrl | 2.048 |

`documentUrl` là một link HTTPS trên `drive.google.com` hoặc `docs.google.com`, có đường dẫn tài liệu/thư mục, không chứa user info hoặc cổng khác 443. Có thể gom nhiều tài liệu trong một thư mục Drive rồi gửi link. Backend chỉ kiểm tra định dạng và lưu link, không upload, tải tài liệu hoặc kiểm tra quyền truy cập. Người nộp cần cấp quyền đọc cho người xét duyệt.

Thành công trả `201`:

```json
{
  "email": "provider@example.com",
  "status": "PENDING_EMAIL",
  "registrationToken": "<token ngẫu nhiên 43 ký tự>",
  "expiresAt": "2026-10-28T03:10:00Z",
  "resendAvailableAt": "2026-10-28T03:01:00Z"
}
```

Giữ `registrationToken` cùng form đang nhập. Token không phải JWT và không gửi trong email, URL hoặc log; DB chỉ lưu hash. Backend gửi OTP sáu chữ số qua email, mặc định hạn 10 phút, tối đa 5 lần nhập sai và chờ 60 giây trước lần gửi mã tiếp theo. Các giới hạn dùng chung cấu hình `app.auth.*` với đăng ký khách hàng.

## 2. Xác thực email

`POST /api/provider-applications/verify-email`

```json
{
  "email": "provider@example.com",
  "code": "123456",
  "registrationToken": "<token của lần nộp hồ sơ hiện tại>"
}
```

Thành công trả `200` và tiêu thụ OTP:

```json
{
  "email": "provider@example.com",
  "status": "PENDING_REVIEW"
}
```

Không có ID hồ sơ trong URL hoặc response. OTP phải thuộc đúng hồ sơ mới nhất, email, purpose và token hiện tại. Token sai/cũ không làm tăng bộ đếm OTP. Xác thực thành công chỉ đưa hồ sơ vào hàng chờ xét duyệt; chưa thể đăng nhập NCC.

## 3. Gửi lại OTP

`POST /api/provider-applications/resend-verification`

```json
{
  "email": "provider@example.com",
  "registrationToken": "<token của lần nộp hồ sơ hiện tại>"
}
```

Thành công trả `200` với cùng cấu trúc như nộp hồ sơ. Giữ nguyên token hiện tại, thay OTP, vô hiệu mã cũ và đặt lại bộ đếm nhập sai. Token hiện tại vẫn dùng được để gửi lại sau khi OTP hết hạn hoặc hết lượt thử nếu hồ sơ còn trong hạn đăng ký.

## Nộp lại và xung đột email

| Tình trạng email/hồ sơ | Kết quả nộp hồ sơ |
| --- | --- |
| Email mới | Giữ email cho loại PROVIDER, tạo hồ sơ `PENDING_EMAIL`, gửi OTP và token. |
| Đã giữ email PROVIDER nhưng chưa có hồ sơ/account | Cho phép nộp hồ sơ. |
| Hồ sơ mới nhất `PENDING_EMAIL` còn hạn | Sau thời gian chờ gửi mã, cập nhật cùng hồ sơ bằng thông tin mới; thay cả OTP và token, giữ created_at. |
| Pending hết hạn | Dọn lượt hết hạn, tạo hồ sơ và token/OTP mới nếu email không còn xung đột; account khách pending hết hạn cũng được xử lý tương tự. |
| Hồ sơ mới nhất `PENDING_REVIEW` hoặc `APPROVED` | Trả `409 APPLICATION_ALREADY_EXISTS`. |
| Hồ sơ mới nhất `REJECTED` | Tạo hồ sơ mới, giữ nguyên lịch sử hồ sơ cũ; cần xác thực lại. |
| Email thuộc CUSTOMER/ADMIN hoặc đã có account PROVIDER | Trả `409 EMAIL_ALREADY_USED`. |

Hồ sơ `PENDING_EMAIL` có deadline `created_at + app.auth.pending-registration-ttl`, mặc định 24 giờ liên tục. Verify/resend tại hoặc sau deadline trả `400 REGISTRATION_INVALID`; OTP mới không có hạn vượt deadline. `PENDING_REVIEW`, `APPROVED` và `REJECTED` được giữ, kể cả lịch sử challenge của REJECTED.

Nếu người dùng thoát và mất token, nộp lại thông tin từ đầu sau thời gian chờ. Không lấy được OTP mới bằng token của form cũ. Hồ sơ đã xác thực không bị ghi đè bởi thao tác nộp lại.

Các thao tác nộp hồ sơ, xác thực và gửi lại OTP khóa cùng bản ghi email identity trong transaction. Hai yêu cầu tạo email mới cùng lúc chỉ một yêu cầu được tạo. Yêu cầu còn lại có thể nhận `409 DATA_CONFLICT` hoặc `429 OTP_RESEND_TOO_SOON`. API duyệt, từ chối và cấp lại dùng cùng thứ tự khóa email identity, account nếu có, rồi hồ sơ.

Nếu SMTP báo lỗi, transaction rollback: không giữ hồ sơ/email mới, không ghi đè hồ sơ cũ và không vô hiệu OTP trước đó. SMTP và database không có transaction chung; nếu email đã được gửi nhưng commit DB thất bại, mã trong email đó có thể không dùng được.

## Lỗi thường gặp

| HTTP/code | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_ERROR | Thiếu trường, sai định dạng email/OTP/token hoặc link tài liệu không hợp lệ. |
| 400 REGISTRATION_INVALID | Không có lượt nộp hồ sơ pending hợp lệ với email/token này; nộp lại nếu mất token. |
| 400 OTP_INVALID | OTP sai, hết hạn, chưa gửi, đã dùng hoặc đã bị thay thế. |
| 403 CSRF_INVALID | Thiếu/sai cookie hoặc header CSRF. |
| 409 EMAIL_ALREADY_USED | Email đã thuộc loại tài khoản khác hoặc đã có account. |
| 409 APPLICATION_ALREADY_EXISTS | Đã có hồ sơ đang chờ duyệt/đã duyệt. |
| 409 DATA_CONFLICT | Xung đột ghi dữ liệu, ví dụ hai yêu cầu cùng giữ email mới. |
| 429 OTP_RESEND_TOO_SOON | Chưa đủ 60 giây từ lần gửi OTP gần nhất. |
| 429 OTP_ATTEMPTS_EXCEEDED | Đã hết 5 lượt nhập sai; chờ đủ thời gian rồi gửi lại OTP. |
| 503 EMAIL_DELIVERY_FAILED | SMTP báo lỗi; thay đổi dữ liệu được rollback. |

Lỗi dùng cấu trúc `{code, message, fieldErrors}` chung; xem [quy ước API](api-conventions.md).

## Kiểm tra

```bash
cd backend
./mvnw test
```

`ProviderApplicationIntegrationTests` chạy qua HTTP bằng MockMvc, H2 riêng trong bộ nhớ và SMTP giả lập. Bao gồm các trường hợp OTP/token cũ, nộp lại/từ chối, xung đột loại tài khoản, CSRF, lỗi SMTP và yêu cầu đồng thời; không kết nối database hay hộp thư thật.
