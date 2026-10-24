# API Conventions — Nestify

Tài liệu quy định chuẩn thiết kế API RESTful cho hệ thống Nestify.

## 1. Định dạng chung
- Mọi endpoint trả về định dạng `application/json;charset=UTF-8`.
- Định dạng thời gian: ISO-8601 (`YYYY-MM-DDTHH:mm:ssZ` hoặc UTC offset).
- Đơn vị tiền tệ: số nguyên đồng VND (`BIGINT`).
- Mã hóa ký tự: UTF-8.

## 2. Quy ước đặt tên Endpoint
- Sử dụng danh từ số nhiều, chữ thường, gạch nối (`kebab-case`) cho URI path.
- Phân tách theo actor/khu vực:
  - `/api/v1/customer/...`
  - `/api/v1/provider/...`
  - `/api/v1/admin/...`
  - `/api/v1/auth/...`
  - `/api/v1/public/...`

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
