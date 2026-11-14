# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)

- **Module:** Admin quản lý hồ sơ nhà cung cấp
- **Use Case:** UC28 — Xem, duyệt, từ chối và cấp lại mật khẩu tạm (ADM-03 đến ADM-06)
- **Ngày cập nhật:** 14/11/2026
- **Người phụ trách backend:** Lâm

## 1. Phạm vi và trạng thái

Backend có hai GET xem hồ sơ và ba POST để duyệt, từ chối hoặc cấp lại mật khẩu tạm. Đăng nhập NCC (UC17), đổi mật khẩu lần đầu (UC42) và quên mật khẩu (UC04) chưa triển khai.

Controller/service và DTO response nằm trong `com.homeservice.admin`. Chỉ POST từ chối nhận body JSON.

Base URL local: `http://localhost:8080`. Chỉ dùng `/api/admin/provider-applications`, chưa có alias `/api/v1/admin/provider-applications`.

## 2. Xác thực và quyền

Đăng nhập bằng [UC27](UC27_DANG_NHAP_ADMIN.md), sau đó gửi:

```http
Authorization: Bearer <accessJwt-cua-admin>
```

Hai GET chỉ cần Bearer access JWT. Cả ba POST gửi thêm cookie CSRF và header lấy từ `GET /api/auth/csrf`. Trong Insomnia, gọi GET CSRF trong cùng collection và dùng cùng hostname với các POST để dùng chung cookie. Lấy lại CSRF sau khi đăng nhập thành công. Spring Security kiểm tra JWT và quyền ADMIN. Service đọc lại account theo ID từ JWT và yêu cầu ADMIN/ACTIVE, email đã xác thực và `must_change_password=false`. Admin bị khóa bị từ chối dù JWT vẫn còn hạn.

Các admin đủ điều kiện có thể xem mọi hồ sơ; chưa có cơ chế phân công hồ sơ cho từng admin. Hai GET chỉ đọc dữ liệu. Response có `Cache-Control: no-store`.

## 3. Danh sách — `GET /api/admin/provider-applications`

Ví dụ:

```http
GET /api/admin/provider-applications?status=PENDING_REVIEW&page=0&size=20
```

| Tham số | Mặc định | Ràng buộc |
| --- | --- | --- |
| `status` | `PENDING_REVIEW` khi không truyền | Một trong `PENDING_EMAIL`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`; đúng chữ hoa, không để rỗng |
| `page` | `0` | Số nguyên không âm; trang bắt đầu từ 0 |
| `size` | `20` | Số nguyên từ 1 đến 100 |

`page`/`size` bị bỏ qua hoặc để rỗng dùng mặc định của Spring MVC. Offset `page * size` không được vượt `Integer.MAX_VALUE` do giới hạn phân trang JPA. Không cho client chọn sort; luôn sắp xếp `createdAt DESC, id DESC`. Bộ lọc chỉ chọn trạng thái yêu cầu, không phải tất cả trạng thái cùng lúc.

**200 OK**, JSON trực tiếp `PageResponse`, không bọc `success/data`:

```json
{
  "items": [
    {
      "id": 15,
      "email": "provider@example.com",
      "applicantName": "Nguyễn Văn A",
      "businessName": "Dịch vụ tại nhà A",
      "city": "Hà Nội",
      "status": "PENDING_REVIEW",
      "createdAt": "2026-11-05T01:00:00Z",
      "emailVerifiedAt": "2026-11-05T01:02:00Z",
      "credentialsEmailStatus": null
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

Nếu không có hồ sơ khớp, `items=[]`, `totalElements=0`, `totalPages=0`; `page`/`size` vẫn theo yêu cầu. Nếu trang vượt số trang hiện có, `items=[]` nhưng tổng số hồ sơ/trang vẫn phản ánh bộ lọc. `emailVerifiedAt` có thể null khi xem PENDING_EMAIL.

Dùng `?status=APPROVED` để xem các hồ sơ đã duyệt và kiểm tra `credentialsEmailStatus` của từng hồ sơ.

## 4. Chi tiết — `GET /api/admin/provider-applications/{id}`

`id` phải là số nguyên dương trong giới hạn Java Long. Ví dụ `/api/admin/provider-applications/15`.

**200 OK**, JSON trực tiếp:

```json
{
  "id": 15,
  "email": "provider@example.com",
  "applicantName": "Nguyễn Văn A",
  "businessName": "Dịch vụ tại nhà A",
  "city": "Hà Nội",
  "status": "PENDING_REVIEW",
  "createdAt": "2026-11-05T01:00:00Z",
  "emailVerifiedAt": "2026-11-05T01:02:00Z",
  "phone": "0901234567",
  "description": "Cung cấp dịch vụ tại nhà.",
  "documentUrl": "https://drive.google.com/drive/folders/example",
  "decidedAt": null,
  "decidedByAdminId": null,
  "rejectionReason": null,
  "credentialsEmailStatus": null
}
```

Nếu đã có quyết định trong dữ liệu, trả các trường quyết định tương ứng; API này không tạo quyết định mới. DTO chỉ chứa ID của admin quyết định, không serialize account hay challenge. Không trả OTP, token đăng ký, mật khẩu hoặc hash. Backend chỉ trả link tài liệu; frontend hiển thị mô tả như văn bản và mở link theo quyền truy cập Drive thực tế.

## 5. Duyệt — `POST /api/admin/provider-applications/{id}/approve`

Gửi Bearer access JWT của admin, cookie `XSRF-TOKEN` và header `X-XSRF-TOKEN` chứa token từ JSON của `GET /api/auth/csrf`. Để trống body. Với hồ sơ `PENDING_REVIEW` đã xác thực email, backend tạo đúng một account `PROVIDER` và một profile, ghi quyết định `APPROVED` cùng audit. Mật khẩu tạm do backend sinh, gửi đến email trong hồ sơ sau khi commit. Account lưu hash và được đánh dấu phải đổi mật khẩu lần đầu.

**200 OK**, ví dụ SMTP báo lỗi sau khi đã lưu quyết định:

```json
{
  "id": 15,
  "status": "APPROVED",
  "decidedAt": "2026-11-13T02:30:00Z",
  "decidedByAdminId": 3,
  "rejectionReason": null,
  "providerAccountId": 27,
  "credentialsEmailStatus": "FAILED"
}
```

| `credentialsEmailStatus` | Cách hiển thị và xử lý |
| --- | --- |
| `SENT` | SMTP đã chấp nhận email. Trạng thái này không xác nhận email đã tới hộp thư. |
| `FAILED` | Gửi email thất bại. Hồ sơ vẫn đã duyệt. Admin có thể cấp lại mật khẩu tạm qua ADM-06. |
| `UNCONFIRMED` | Chưa xác nhận gửi email. Có thể đang gửi, backend đã dừng, kết quả gửi chưa lưu được hoặc hồ sơ cũ chưa có dữ liệu gửi. Tải lại chi tiết để xem trạng thái mới nhất. |
| `null` | Hồ sơ chưa được duyệt. |

Nếu giao dịch duyệt thất bại, backend chưa gửi email. Nếu SMTP báo lỗi sau khi giao dịch đã thành công, response vẫn là `200 APPROVED`. Gọi lại approve cho hồ sơ đã duyệt chỉ đọc quyết định và trạng thái email hiện có, không tạo lại tài khoản hay gửi lại mật khẩu. Khi request mất phản hồi, tải lại hồ sơ để xem quyết định đã được lưu chưa.

Backend dùng `ddl-auto=update` trong môi trường dev để thêm cột `credentials_email_status`. Với `ddl-auto=validate`, áp dụng [SQL bổ sung cột](../backend/src/main/resources/db/manual/add_provider_credentials_email_status.sql) vào schema trước khi chạy bản mới.

## 6. Từ chối — `POST /api/admin/provider-applications/{id}/reject`

Gửi Bearer access JWT của admin, cookie `XSRF-TOKEN` và header `X-XSRF-TOKEN` lấy từ JSON của `GET /api/auth/csrf`. Dùng `Content-Type: application/json` với body:

```json
{
  "reason": "Tài liệu chứng minh năng lực chưa đầy đủ."
}
```

`reason` bắt buộc và dài từ 1 đến 2.000 ký tự sau khi bỏ khoảng trắng ở hai đầu. Chỉ hồ sơ `PENDING_REVIEW` đã xác thực email mới được chuyển sang `REJECTED`. Backend lưu người từ chối, thời điểm, lý do và audit. Email chứa lý do được gửi đến địa chỉ trong hồ sơ. Người nộp có thể tạo hồ sơ mới bằng cùng email sau khi quyết định được lưu.

**200 OK**

```json
{
  "id": 15,
  "status": "REJECTED",
  "decidedAt": "2026-11-13T02:30:00Z",
  "decidedByAdminId": 3,
  "rejectionReason": "Tài liệu chứng minh năng lực chưa đầy đủ.",
  "providerAccountId": null,
  "credentialsEmailStatus": null
}
```

Gọi lại với body hợp lệ cho hồ sơ `REJECTED` trả quyết định cũ và không gửi email lần nữa. Hồ sơ `APPROVED` hoặc chưa vào hàng chờ xét duyệt trả `409 APPLICATION_NOT_REVIEWABLE`.

Nếu SMTP báo lỗi, API trả `503 EMAIL_DELIVERY_FAILED` và rollback quyết định cùng audit. Admin có thể thử từ chối lại. Backend gửi email trước khi commit giao dịch từ chối, nên nếu SMTP đã nhận thư mà commit thất bại, admin cần tải lại chi tiết để biết trạng thái trong DB trước khi thử lại.

## 7. Cấp lại mật khẩu tạm — `POST /api/admin/provider-applications/{id}/reissue-credentials`

Trong Insomnia, chọn **Auth → Bearer Token**, điền access JWT của admin. Gửi cookie `XSRF-TOKEN` và header `X-XSRF-TOKEN` lấy từ JSON của `GET /api/auth/csrf`. Chọn **Body → No Body**.

Dùng ID của hồ sơ `APPROVED` có `credentialsEmailStatus` là `FAILED` hoặc `UNCONFIRMED`. Tài khoản liên kết phải là `PROVIDER`, đang `ACTIVE`, đã xác thực email và còn `must_change_password=true`. Hồ sơ đã duyệt nhưng thiếu liên kết account/profile trả `409 DATA_CONFLICT`. Các trạng thái không cho phép cấp lại trả `409 CREDENTIAL_REISSUE_NOT_ALLOWED`.

**200 OK**, ví dụ gửi email thành công:

```json
{
  "id": 15,
  "status": "APPROVED",
  "decidedAt": "2026-11-13T02:30:00Z",
  "decidedByAdminId": 3,
  "rejectionReason": null,
  "providerAccountId": 27,
  "credentialsEmailStatus": "SENT"
}
```

`decidedAt` và `decidedByAdminId` vẫn là thông tin của lần duyệt. Audit ghi admin thực hiện lần cấp lại. Backend commit hash mới, thu hồi refresh token của NCC và lưu `UNCONFIRMED` trước khi gửi email. Nếu SMTP báo lỗi, API vẫn trả `200` với `FAILED`. Mật khẩu tạm trước đó đã hết hiệu lực vì hash mới đã commit.

Frontend chặn bấm lặp khi request đang chạy. Nếu mất phản hồi hoặc nhận `UNCONFIRMED`, tải lại hồ sơ bằng GET chi tiết trước khi admin chủ động cấp lại. Mỗi lần cấp lại thành công về dữ liệu thay mật khẩu tạm trước đó. SMTP có thể chuyển thư trễ hoặc sai thứ tự. Trạng thái trong API phản ánh lần cấp hiện tại trên server.

## 8. Mã lỗi

| HTTP | Code | Trường hợp |
| --- | --- | --- |
| 401 | `AUTHENTICATION_REQUIRED` | Thiếu, sai hoặc hết hạn access JWT. Với POST, CSRF phải hợp lệ để request tới bước kiểm tra JWT. |
| 403 | `ACCESS_DENIED` | Sai vai trò; hoặc account admin trong DB không còn đủ điều kiện |
| 403 | `CSRF_INVALID` | POST thiếu hoặc sai cookie/header CSRF |
| 400 | `VALIDATION_ERROR` | ID/page/size không phải số nguyên, vượt giới hạn hoặc sai khoảng; status không hợp lệ; lý do từ chối thiếu, trống hoặc quá dài |
| 404 | `NOT_FOUND` | ID hợp lệ nhưng không có hồ sơ; chỉ tra cứu sau khi đã kiểm tra quyền |
| 409 | `APPLICATION_NOT_REVIEWABLE` | Hồ sơ chưa đủ điều kiện xét duyệt, duyệt hồ sơ đã bị từ chối hoặc từ chối hồ sơ đã duyệt |
| 409 | `CREDENTIAL_REISSUE_NOT_ALLOWED` | Hồ sơ chưa duyệt, trạng thái email không cho cấp lại hoặc NCC đã đổi mật khẩu, bị khóa hoặc chưa xác thực |
| 409 | `DATA_CONFLICT` | Xung đột account/profile hoặc dữ liệu đã duyệt thiếu liên kết hợp lệ |
| 503 | `EMAIL_DELIVERY_FAILED` | Gửi email từ chối thất bại. Quyết định và audit được rollback. |

Ví dụ lỗi input:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Tham số không hợp lệ.",
  "fieldErrors": {
    "page": "Giá trị phải là số nguyên trong giới hạn được hỗ trợ."
  }
}
```

Lỗi kiểm tra khoảng/status ở service có thể có `fieldErrors={}` và thông báo cụ thể. Không trả SQL hoặc giá trị token trong lỗi.

## 9. Trình tự kiểm tra thủ công

1. Đăng nhập admin theo UC27 và lưu access token.
2. Gọi GET danh sách không truyền query: kiểm tra mặc định PENDING_REVIEW, phân trang và thứ tự.
3. Gọi danh sách với từng trạng thái, `page`/`size` khác nhau và trang rỗng; dùng ID từ danh sách để gọi chi tiết.
4. Kiểm tra thiếu token, token CUSTOMER/PROVIDER, token admin đã bị khóa trong DB; các trường hợp này không được trả dữ liệu hồ sơ.
5. Kiểm tra status lạ/rỗng, page âm, size 0/101, ID 0/âm/không tồn tại và giá trị vượt giới hạn số nguyên.
6. Với hồ sơ đã xác thực, lấy lại CSRF rồi gọi POST approve. Kiểm tra `APPROVED`, `providerAccountId` và `credentialsEmailStatus`. Gọi lại cùng ID và kiểm tra quyết định giữ nguyên.
7. Với SMTP giả lập báo lỗi, kiểm tra POST vẫn trả `200`, trạng thái email là `FAILED` và hai GET đọc được kết quả sau khi tải lại.
8. Chọn hồ sơ `PENDING_REVIEW` khác và gọi POST reject với lý do. Kiểm tra `REJECTED`, lý do trong email và GET chi tiết. Gọi lại với lý do khác để xác nhận quyết định cũ được giữ nguyên.
9. Thử từ chối hồ sơ đã duyệt (`409`), lý do trống (`400`) và giả lập SMTP lỗi (`503`, hồ sơ vẫn `PENDING_REVIEW`). Sau khi từ chối thành công, thử nộp hồ sơ mới bằng cùng email.
10. Trên môi trường test, lấy ID của hồ sơ `APPROVED` có email `FAILED` hoặc `UNCONFIRMED`. Sau khi SMTP hoạt động, gọi POST cấp lại với Bearer và CSRF. Kiểm tra cùng `providerAccountId` và quyết định cũ, email mới tới hộp thư test, GET chi tiết hiển thị `SENT`. Thử cấp lại sau `SENT` để kiểm tra `409`.

Các luồng này có kiểm thử tích hợp trong bộ Maven với MockMvc, H2 và SMTP giả lập. Chưa chạy trình tự Insomnia trên PostgreSQL hoặc SMTP thật trong lần bàn giao này.
