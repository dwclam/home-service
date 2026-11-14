# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)
**Module:** Quản lý vòng đời đơn đặt dịch vụ (Booking Lifecycle)  
**Use Case:** UC21 — Nhà cung cấp chấp nhận / từ chối đơn đặt lịch (Provider Accept / Reject Booking)  
**Phiên bản:** 1.0.0  
**Ngày cập nhật:** 01/11/2026  
**Người phụ trách backend:** Nguyễn Đình Thủy  

---

## 1. Tổng Quan

Tài liệu này đặc tả chi tiết 02 endpoint API cho chức năng **Nhà cung cấp (NCC) xử lý yêu cầu đặt lịch (UC21)** của hệ thống Nestify:
1. **Chấp nhận đơn đặt lịch (Accept Booking):** Chuyển trạng thái đơn từ `PENDING_PROVIDER` sang `PENDING_DEPOSIT`, tính toán hạn nộp cọc `deposit_due_at` (15 phút) để giữ chỗ độc quyền cho khách thanh toán.
2. **Từ chối đơn đặt lịch (Reject Booking):** Chuyển trạng thái đơn sang `REJECTED`, bắt buộc ghi nhận lý do từ chối (tối đa 500 ký tự) và hoàn lại 100% tiền tạm thu (nếu có).

Tài liệu cung cấp đầy đủ thông số request/response, ma trận mã lỗi, quy tắc chuyển trạng thái và mã mẫu tích hợp TypeScript/React dành riêng cho Frontend.

### 1.1. Base URL & Môi trường
- **Môi trường phát triển cục bộ (Local / Dev):** `http://localhost:8080`
- **Môi trường Production (dự kiến):** `https://api.nestify.vn`

### 1.2. Định dạng dữ liệu
- **Content-Type:** `application/json;charset=UTF-8`
- **Mã hóa ký tự:** UTF-8
- **Định dạng thời gian:** ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`)
- **Đơn vị tiền tệ:** Số nguyên đồng Việt Nam (`BIGINT`, VND)

---

## 2. Xác Thực & Phân Quyền (Authentication & Authorization)

- **Cơ chế xác thực:** JWT Bearer Token (Stateless).
- **Yêu cầu bảo mật:**
  - Header: `Authorization: Bearer <accessToken>`
  - Vai trò bắt buộc: **`ROLE_PROVIDER`**.
  - **CSRF:** Request nghiệp vụ gửi qua Bearer Token **không bắt buộc mã CSRF**.
- **Phân quyền dữ liệu (Multi-tenant Ownership):**
  - NCC chỉ có quyền thao tác trên đơn **được giao cho chính tài khoản của mình** (`booking.providerId == currentAccount.getId()`).
  - Nếu NCC cố tình thao tác trên đơn của NCC khác $\rightarrow$ Hệ thống lập tức trả về lỗi `403 ACCESS_DENIED`.
  - Tài khoản NCC phải đang ở trạng thái kích hoạt (`AccountStatus.ACTIVE`).

---

## 3. Quy Ước Chung (Common Conventions)

### 3.1. Cấu trúc Response thành công chuẩn (`StandardResponse<T>`)
```json
{
  "success": true,
  "message": "Nhà cung cấp đã chấp nhận đơn đặt lịch thành công",
  "data": { ... },
  "timestamp": "2026-11-01T15:30:00Z"
}
```

### 3.2. Cấu trúc Response lỗi chuẩn (`ApiError`)
```json
{
  "code": "MÃ_LỖI_CHUẨN",
  "message": "Mô tả lỗi chi tiết bằng tiếng Việt để hiển thị lên UI",
  "fieldErrors": {
    "tênField": "Lý do trường này không hợp lệ"
  }
}
```

### 3.3. Bảng mã lỗi của API UC21

| HTTP Status | Error Code | Ý nghĩa | Hành động khuyến nghị cho Frontend |
| :--- | :--- | :--- | :--- |
| **400 Bad Request** | `VALIDATION_ERROR` | Thiếu lý do từ chối (`reason` rỗng) hoặc vượt quá 500 ký tự | Báo đỏ viền input form và hiển thị text lỗi validation |
| **400 Bad Request** | `BUSINESS_ERROR` | Đơn không ở trạng thái `PENDING_PROVIDER`, hoặc đã quá hạn phản hồi (tự chuyển `EXPIRED`), hoặc ngoài lịch làm việc | Hiển thị Toast/Modal thông báo và tải lại chi tiết đơn |
| **401 Unauthorized** | `AUTHENTICATION_REQUIRED` | Chưa đăng nhập hoặc Access Token hết hạn | Kích hoạt refresh token hoặc điều hướng sang trang `/login` |
| **403 Forbidden** | `ACCESS_DENIED` | Người dùng có vai trò khác (`CUSTOMER`, `ADMIN`) hoặc không sở hữu đơn | Hiển thị thông báo không có quyền thao tác trên đơn này |
| **404 Not Found** | `NOT_FOUND` | Không tìm thấy mã đơn đặt lịch hoặc tài khoản NCC | Thông báo đơn không tồn tại và chuyển về danh sách đơn |
| **409 Conflict** | `DATA_CONFLICT` | **1.** Sai lệch `version` (đơn bị thay đổi đồng thời).<br>**2.** Khung giờ này đã có đơn khác đang giữ chỗ (`PENDING_DEPOSIT`) hoặc đã xác nhận (`CONFIRMED`) | Hiển thị thông báo xung đột lịch/dữ liệu và tải lại chi tiết đơn mới nhất |

---

## 4. Chi Tiết Endpoint 1: NCC Chấp Nhận Đơn (Accept Booking)

### 4.1. Thông tin Endpoint
- **Phương thức:** `POST`
- **URI Path:** `/api/v1/provider/bookings/{bookingId}/accept`  
  *(Hỗ trợ alias: `/api/provider/bookings/{bookingId}/accept`)*
- **Quyền hạn:** `ROLE_PROVIDER` (Chính chủ đơn)

### 4.2. Path Parameters
| Tham số | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `bookingId` | Long | **Có** | ID của đơn đặt dịch vụ (ví dụ: `105`) |

### 4.3. Request Body (`application/json` - Tùy chọn)
Request body có thể để trống `{}` hoặc truyền `version` để kích hoạt khóa lạc quan (Optimistic Locking):
```json
{
  "version": 0
}
```
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `version` | Long | Không | Số phiên bản hiện tại của đơn (lấy từ trường `version` trong GET detail) để ngăn chặn race condition |

### 4.4. Quy tắc nghiệp vụ kiểm tra khi Chấp nhận (Invariants)
1. **Trạng thái:** Đơn phải đang ở `PENDING_PROVIDER`.
2. **Hạn phản hồi (MD01):** Thời điểm hiện tại `now` phải trước `booking.request_expires_at`. Nếu quá hạn, hệ thống tự động đánh dấu `EXPIRED` và từ chối chấp nhận đơn.
3. **Lịch làm việc (UC20):** NCC phải có slot `AVAILABLE` bao phủ trọn vẹn `[starts_at, ends_at]` và không bị `BLOCKED`.
4. **Không xung đột lịch:** Không được có đơn khác của NCC đang ở `PENDING_DEPOSIT` (và chưa hết hạn nộp cọc `deposit_due_at > now`), `CONFIRMED`, hoặc `IN_PROGRESS` trùng khung giờ.
5. **Hạn nộp cọc:** Hệ thống thiết lập `deposit_due_at = min(now + 15 phút, starts_at - 15 phút)` để giữ chỗ chờ khách thanh toán.

### 4.5. Response Thành Công Mẫu (`200 OK`)
```json
{
  "success": true,
  "message": "Nhà cung cấp đã chấp nhận đơn đặt lịch thành công",
  "data": {
    "id": 105,
    "bookingCode": "BK-20261101-9F3A12",
    "status": "PENDING_DEPOSIT",
    "serviceTitle": "Vệ sinh máy giặt cửa ngang",
    "startsAt": "2026-11-02T08:00:00Z",
    "endsAt": "2026-11-02T09:30:00Z",
    "acceptedAt": "2026-11-01T15:30:15Z",
    "depositDueAt": "2026-11-01T15:45:15Z",
    "totalAmountVnd": 450000,
    "depositAmountVnd": 135000,
    "balanceAmountVnd": 315000,
    "depositPercent": 30,
    "version": 1,
    "createdAt": "2026-11-01T15:10:00Z",
    "updatedAt": "2026-11-01T15:30:15Z"
  },
  "timestamp": "2026-11-01T15:30:15Z"
}
```

---

## 5. Chi Tiết Endpoint 2: NCC Từ Chối Đơn (Reject Booking)

### 5.1. Thông tin Endpoint
- **Phương thức:** `POST`
- **URI Path:** `/api/v1/provider/bookings/{bookingId}/reject`  
  *(Hỗ trợ alias: `/api/provider/bookings/{bookingId}/reject`)*
- **Quyền hạn:** `ROLE_PROVIDER` (Chính chủ đơn)

### 5.2. Path Parameters
| Tham số | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `bookingId` | Long | **Có** | ID của đơn đặt dịch vụ (ví dụ: `105`) |

### 5.3. Request Body (`application/json`)
```json
{
  "reason": "Thợ đang bận xử lý ca sửa chữa phát sinh tại quận lân cận, không kịp di chuyển",
  "version": 0
}
```
| Trường | Kiểu | Bắt buộc | Ràng buộc / Validation | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `reason` | String | **Có** | `@NotBlank`, `@Size(max = 500)` | Lý do từ chối đơn phục vụ hiển thị cho khách hàng và lưu vết hệ thống |
| `version` | Long | Không | Tùy chọn | Phiên bản đơn hiện tại để kiểm tra xung đột dữ liệu |

### 5.4. Quy tắc nghiệp vụ khi Từ chối
1. **Trạng thái:** Đơn chuyển sang `REJECTED`.
2. **Lưu vết kết thúc:**
   - `termination_kind = 'REJECT'`
   - `termination_actor_type = 'PROVIDER'`
   - `terminated_by_account_id = <providerAccountId>`
   - `termination_reason_code = 'PROVIDER_REJECT'`
   - `termination_reason = <reason>`
   - `refund_percent = 100` (Khách được hoàn 100% nếu có bất kỳ khoản tiền nào đã thu)
3. **Lịch sử trạng thái:** Hệ thống tự động ghi 1 dòng vào bảng `booking_status_history` với `reason_code = 'PROVIDER_REJECT'`.

### 5.5. Response Thành Công Mẫu (`200 OK`)
```json
{
  "success": true,
  "message": "Nhà cung cấp đã từ chối đơn đặt lịch thành công",
  "data": {
    "id": 105,
    "bookingCode": "BK-20261101-9F3A12",
    "status": "REJECTED",
    "terminationKind": "REJECT",
    "terminationActorType": "PROVIDER",
    "terminationReasonCode": "PROVIDER_REJECT",
    "terminationReason": "Thợ đang bận xử lý ca sửa chữa phát sinh tại quận lân cận, không kịp di chuyển",
    "terminatedAt": "2026-11-01T15:35:20Z",
    "refundPercent": 100,
    "version": 1,
    "createdAt": "2026-11-01T15:10:00Z",
    "updatedAt": "2026-11-01T15:35:20Z"
  },
  "timestamp": "2026-11-01T15:35:20Z"
}
```

---

## 6. Hướng Dẫn Tích Hợp Frontend (React / TypeScript)

### 6.1. Khai báo Type TypeScript
```typescript
// types/booking.ts
export type BookingStatus =
  | 'PENDING_PROVIDER'
  | 'PENDING_DEPOSIT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export interface AcceptBookingRequest {
  version?: number;
}

export interface RejectBookingRequest {
  reason: string;
  version?: number;
}

export interface StandardResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
```

### 6.2. Mã Service gọi API (Axios Client)
```typescript
// services/providerBookingService.ts
import axiosClient from './axiosClient';
import { StandardResponse, AcceptBookingRequest, RejectBookingRequest } from '../types/booking';

export const providerBookingService = {
  // 1. Chấp nhận đơn
  acceptBooking: async (bookingId: number, version?: number) => {
    const payload: AcceptBookingRequest = version !== undefined ? { version } : {};
    const res = await axiosClient.post<StandardResponse<any>>(
      `/api/v1/provider/bookings/${bookingId}/accept`,
      payload
    );
    return res.data;
  },

  // 2. Từ chối đơn
  rejectBooking: async (bookingId: number, reason: string, version?: number) => {
    const payload: RejectBookingRequest = {
      reason: reason.trim(),
      ...(version !== undefined && { version }),
    };
    const res = await axiosClient.post<StandardResponse<any>>(
      `/api/v1/provider/bookings/${bookingId}/reject`,
      payload
    );
    return res.data;
  },
};
```

### 6.3. Xử lý UI/UX khuyến nghị
1. **Đếm ngược thời gian phản hồi (Countdown Timer):**
   - Trên UI danh sách và chi tiết đơn `PENDING_PROVIDER`, hiển thị đồng hồ đếm ngược đến `requestExpiresAt`.
   - Khi hết giờ đếm ngược, vô hiệu hóa (disable) 2 nút [Chấp nhận] và [Từ chối], hiển thị trạng thái `Quá hạn phản hồi (Hết hiệu lực)`.
2. **Modal Xác Nhận Từ Chối:**
   - Khi bấm [Từ chối], hiển thị Modal yêu cầu nhập lý do.
   - Textarea có validation: bắt buộc nhập, hiển thị bộ đếm ký tự `0/500`. Không cho phép submit khi lý do rỗng.
3. **Đếm ngược thời gian giữ chỗ cọc (Sau khi chấp nhận):**
   - Khi đơn chuyển sang `PENDING_DEPOSIT`, hiển thị nhãn trạng thái: `Đang chờ khách thanh toán cọc (Hạn chót: {formatDate(depositDueAt)})`.
