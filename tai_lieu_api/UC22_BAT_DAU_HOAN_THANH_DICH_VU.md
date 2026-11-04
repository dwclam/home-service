# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)
**Module:** Quản lý vòng đời đơn đặt dịch vụ (Booking Lifecycle)  
**Use Case:** UC22 — Nhà cung cấp bắt đầu / hoàn thành dịch vụ (Provider Start / Complete Service)  
**Phiên bản:** 1.0.0  
**Ngày cập nhật:** 04/11/2026  
**Người phụ trách backend:** Nguyễn Đình Thủy  

---

## 1. Tổng Quan

Tài liệu này đặc tả chi tiết 02 endpoint API cho chức năng **Nhà cung cấp (NCC) Bắt đầu và Hoàn thành dịch vụ (UC22)** trong hệ thống Nestify:
1. **Bắt đầu dịch vụ (Start Service):** Chuyển trạng thái đơn từ `CONFIRMED` sang `IN_PROGRESS`, ghi nhận thời gian bắt đầu thực tế `started_at = now`, kiểm tra ràng buộc thời gian hẹn và tính độc quyền thi công của thợ.
2. **Hoàn thành dịch vụ (Complete Service):** Chuyển trạng thái đơn từ `IN_PROGRESS` sang `COMPLETED`, ghi nhận thời gian hoàn thành `completed_at = now`, thiết lập hạn chót thanh toán 70% số tiền còn lại `balance_due_at = completed_at + 24h` (chính sách `balanceDueHours = 24`), giữ nguyên trạng thái quyết toán `settlement_status = DRAFT`.

Tài liệu cung cấp đầy đủ thông số request/response, ma trận mã lỗi, quy tắc chuyển trạng thái, mã mẫu cURL và code mẫu tích hợp TypeScript/React dành cho Frontend.

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
  - NCC chỉ có quyền thao tác trên đơn **được giao cho chính tài khoản của mình** (`booking.provider.accountId == currentAccount.getId()`).
  - Nếu NCC cố tình thao tác trên đơn của NCC khác $\rightarrow$ Hệ thống lập tức trả về mã lỗi `403 ACCESS_DENIED`.
  - Tài khoản NCC phải đang ở trạng thái kích hoạt (`AccountStatus.ACTIVE`).

---

## 3. Quy Ước Chung (Common Conventions)

### 3.1. Cấu trúc Response thành công chuẩn (`StandardResponse<T>`)
```json
{
  "success": true,
  "message": "Bắt đầu thực hiện dịch vụ thành công",
  "data": { ... },
  "timestamp": "2026-11-04T15:30:00Z"
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

### 3.3. Bảng mã lỗi của API UC22

| HTTP Status | Error Code | Ý nghĩa | Hành động khuyến nghị cho Frontend |
| :--- | :--- | :--- | :--- |
| **400 Bad Request** | `VALIDATION_ERROR` | Ghi chú `note` vượt quá 500 ký tự | Báo đỏ viền ô nhập và hiển thị text lỗi validation |
| **400 Bad Request** | `BUSINESS_ERROR` | **1.** Đơn không đúng trạng thái (`CONFIRMED` khi start, `IN_PROGRESS` khi complete).<br>**2.** Chưa đến giờ hẹn thực hiện (`now < starts_at`). | Hiển thị Toast/Alert thông báo lỗi nghiệp vụ và làm mới dữ liệu đơn |
| **401 Unauthorized** | `AUTHENTICATION_REQUIRED` | Chưa đăng nhập hoặc Access Token hết hạn | Kích hoạt refresh token hoặc điều hướng sang trang `/login` |
| **403 Forbidden** | `ACCESS_DENIED` | Người dùng có vai trò khác (`CUSTOMER`, `ADMIN`) hoặc không sở hữu đơn | Hiển thị thông báo không có quyền thao tác trên đơn này |
| **404 Not Found** | `NOT_FOUND` | Không tìm thấy mã đơn đặt lịch hoặc tài khoản NCC | Thông báo đơn không tồn tại và quay lại danh sách đơn |
| **409 Conflict** | `DATA_CONFLICT` | **1.** Sai lệch `version` (đơn bị thao tác đồng thời).<br>**2.** Thợ đang có đơn khác ở trạng thái `IN_PROGRESS` (vi phạm quy tắc độc quyền). | Hiển thị cảnh báo xung đột (kèm mã đơn đang chạy nếu có) và tải lại trang chi tiết |

---

## 4. Chi Tiết Endpoint 1: Bắt Đầu Dịch Vụ (Start Service)

### 4.1. Thông tin Endpoint
- **Phương thức:** `POST`
- **URI Path:** `/api/v1/provider/bookings/{bookingId}/start`  
  *(Hỗ trợ alias: `/api/provider/bookings/{bookingId}/start`)*
- **Quyền hạn:** `ROLE_PROVIDER` (Chính chủ đơn)

### 4.2. Path Parameters
| Tham số | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `bookingId` | Long | **Có** | ID của đơn đặt dịch vụ (ví dụ: `105`) |

### 4.3. Request Body (`application/json` - Tùy chọn)
Request body có thể để trống `{}` hoặc gửi kèm:
```json
{
  "version": 1,
  "note": "Đã có mặt tại địa chỉ khách hàng và bắt đầu kiểm tra thiết bị"
}
```
| Trường | Kiểu | Bắt buộc | Ràng buộc / Validation | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `version` | Long | Không | Tùy chọn | Số phiên bản hiện tại của đơn (Optimistic Locking) |
| `note` | String | Không | `@Size(max = 500)` | Ghi chú thêm của thợ khi bắt đầu làm (tối đa 500 ký tự) |

### 4.4. Quy tắc nghiệp vụ kiểm tra khi Bắt đầu (Invariants)
1. **Trạng thái:** Đơn phải đang ở trạng thái `CONFIRMED` (đã nộp cọc thành công).
2. **Quy tắc thời gian hẹn (BR-UC22-03):** Thời điểm hiện tại `now` phải $\ge$ `booking.startsAt`. Hệ thống **từ chối** bắt đầu trước thời gian đã hẹn trong lịch.
3. **Độc quyền thực hiện (BR-UC22-04):** Nhà cung cấp **không được có bất kỳ đơn đặt lịch nào khác** đang ở trạng thái `IN_PROGRESS`. Nếu đang có đơn dở dang, hệ thống trả về mã lỗi `409 DATA_CONFLICT` kèm mã đơn đang thực hiện.
4. **Cập nhật dữ liệu:**
   - Trạng thái chuyển sang `IN_PROGRESS`.
   - Ghi nhận `started_at = now`.
   - Tăng `version` lên 1.
5. **Lịch sử trạng thái:** Tự động ghi nhận vào `booking_status_history`:
   - `from_status = 'CONFIRMED'`
   - `to_status = 'IN_PROGRESS'`
   - `actor_type = 'PROVIDER'`
   - `reason_code = 'PROVIDER_STARTED'`
   - `note = <request.note>`

### 4.5. Response Thành Công Mẫu (`200 OK`)
```json
{
  "success": true,
  "message": "Bắt đầu thực hiện dịch vụ thành công",
  "data": {
    "id": 105,
    "bookingCode": "BK-20261104-A1B2C3",
    "status": "IN_PROGRESS",
    "serviceTitle": "Bảo dưỡng và vệ sinh điều hòa treo tường",
    "startsAt": "2026-11-04T15:00:00Z",
    "endsAt": "2026-11-04T16:30:00Z",
    "acceptedAt": "2026-11-04T10:15:00Z",
    "depositDueAt": "2026-11-04T10:30:00Z",
    "startedAt": "2026-11-04T15:05:00Z",
    "completedAt": null,
    "balanceDueAt": null,
    "totalAmountVnd": 400000,
    "depositAmountVnd": 120000,
    "balanceAmountVnd": 280000,
    "depositPercent": 30,
    "settlementStatus": "DRAFT",
    "recipientName": "Nguyễn Văn A",
    "recipientPhone": "0987654321",
    "addressLine": "Số 123 Đường Cầu Giấy",
    "city": "Hà Nội",
    "version": 2,
    "createdAt": "2026-11-04T10:00:00Z",
    "updatedAt": "2026-11-04T15:05:00Z"
  },
  "timestamp": "2026-11-04T15:05:00Z"
}
```

### 4.6. Mã cURL mẫu để test trên Postman / Terminal
```bash
curl -X POST "http://localhost:8080/api/v1/provider/bookings/105/start" \
  -H "Authorization: Bearer <NCC_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 1,
    "note": "Bắt đầu bảo dưỡng máy điều hòa"
  }'
```

---

## 5. Chi Tiết Endpoint 2: Hoàn Thành Dịch Vụ (Complete Service)

### 5.1. Thông tin Endpoint
- **Phương thức:** `POST`
- **URI Path:** `/api/v1/provider/bookings/{bookingId}/complete`  
  *(Hỗ trợ alias: `/api/provider/bookings/{bookingId}/complete`)*
- **Quyền hạn:** `ROLE_PROVIDER` (Chính chủ đơn)

### 5.2. Path Parameters
| Tham số | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `bookingId` | Long | **Có** | ID của đơn đặt dịch vụ (ví dụ: `105`) |

### 5.3. Request Body (`application/json` - Tùy chọn)
Request body có thể để trống `{}` hoặc gửi kèm:
```json
{
  "version": 2,
  "note": "Đã hoàn thành bảo dưỡng và chạy thử nghiệm máy lạnh mát sâu"
}
```
| Trường | Kiểu | Bắt buộc | Ràng buộc / Validation | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `version` | Long | Không | Tùy chọn | Số phiên bản hiện tại của đơn (Optimistic Locking) |
| `note` | String | Không | `@Size(max = 500)` | Ghi chú nghiệm thu của thợ khi hoàn thành (tối đa 500 ký tự) |

### 5.4. Quy tắc nghiệp vụ kiểm tra khi Hoàn thành (Invariants)
1. **Trạng thái:** Đơn phải đang ở trạng thái `IN_PROGRESS`.
2. **Quy tắc thời gian (BR-UC22-07):** Thời điểm hoàn thành `now` phải $\ge$ `booking.startedAt`.
3. **Cập nhật dữ liệu:**
   - Trạng thái chuyển sang `COMPLETED`.
   - Ghi nhận `completed_at = now`.
   - **Tính hạn nộp 70% tiền còn lại (BR-UC22-08):** Thiết lập `balance_due_at = completed_at + 24 giờ`. Khách hàng có 24 giờ để thanh toán 70% còn lại.
   - **Trạng thái quyết toán:** `settlement_status` tiếp tục giữ nguyên là `DRAFT`. Hệ thống **chưa** thực hiện quyết toán ví cho NCC ở bước này (sẽ được quyết toán sau khi khách hoàn tất thanh toán trong UC43 hoặc bảo lãnh bởi Admin).
   - Tăng `version` lên 1.
4. **Lịch sử trạng thái:** Tự động ghi nhận vào `booking_status_history`:
   - `from_status = 'IN_PROGRESS'`
   - `to_status = 'COMPLETED'`
   - `actor_type = 'PROVIDER'`
   - `reason_code = 'PROVIDER_COMPLETED'`
   - `note = <request.note>`

### 5.5. Response Thành Công Mẫu (`200 OK`)
```json
{
  "success": true,
  "message": "Hoàn thành thực hiện dịch vụ thành công",
  "data": {
    "id": 105,
    "bookingCode": "BK-20261104-A1B2C3",
    "status": "COMPLETED",
    "serviceTitle": "Bảo dưỡng và vệ sinh điều hòa treo tường",
    "startsAt": "2026-11-04T15:00:00Z",
    "endsAt": "2026-11-04T16:30:00Z",
    "acceptedAt": "2026-11-04T10:15:00Z",
    "depositDueAt": "2026-11-04T10:30:00Z",
    "startedAt": "2026-11-04T15:05:00Z",
    "completedAt": "2026-11-04T16:20:00Z",
    "balanceDueAt": "2026-11-05T16:20:00Z",
    "totalAmountVnd": 400000,
    "depositAmountVnd": 120000,
    "balanceAmountVnd": 280000,
    "depositPercent": 30,
    "settlementStatus": "DRAFT",
    "recipientName": "Nguyễn Văn A",
    "recipientPhone": "0987654321",
    "addressLine": "Số 123 Đường Cầu Giấy",
    "city": "Hà Nội",
    "version": 3,
    "createdAt": "2026-11-04T10:00:00Z",
    "updatedAt": "2026-11-04T16:20:00Z"
  },
  "timestamp": "2026-11-04T16:20:00Z"
}
```

### 5.6. Mã cURL mẫu để test trên Postman / Terminal
```bash
curl -X POST "http://localhost:8080/api/v1/provider/bookings/105/complete" \
  -H "Authorization: Bearer <NCC_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 2,
    "note": "Đã hoàn thành bảo dưỡng điều hòa sạch sẽ"
  }'
```

---

## 6. Hướng Dẫn Tích Hợp Frontend (React / TypeScript)

### 6.1. Khai báo Interface & Type TypeScript
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

export type SettlementStatus = 'DRAFT' | 'SETTLED' | 'CANCELLED';

export interface StartServiceRequest {
  version?: number;
  note?: string;
}

export interface CompleteServiceRequest {
  version?: number;
  note?: string;
}

export interface BookingDetailResponse {
  id: number;
  bookingCode: string;
  status: BookingStatus;
  serviceTitle: string;
  startsAt: string;
  endsAt: string;
  acceptedAt?: string;
  depositDueAt?: string;
  startedAt?: string;
  completedAt?: string;
  balanceDueAt?: string;
  totalAmountVnd: number;
  depositAmountVnd: number;
  balanceAmountVnd: number;
  depositPercent: number;
  settlementStatus: SettlementStatus;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  city: string;
  version: number;
  createdAt: string;
  updatedAt: string;
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

### 6.2. Module Gọi API với Axios (`services/providerBookingService.ts`)
```typescript
// services/providerBookingService.ts
import axiosClient from './axiosClient';
import {
  StandardResponse,
  BookingDetailResponse,
  StartServiceRequest,
  CompleteServiceRequest
} from '../types/booking';

export const providerBookingService = {
  /**
   * Bắt đầu thực hiện dịch vụ (UC22)
   */
  startService: async (
    bookingId: number,
    payload?: StartServiceRequest
  ): Promise<StandardResponse<BookingDetailResponse>> => {
    const res = await axiosClient.post<StandardResponse<BookingDetailResponse>>(
      `/api/v1/provider/bookings/${bookingId}/start`,
      payload ?? {}
    );
    return res.data;
  },

  /**
   * Hoàn thành thực hiện dịch vụ (UC22)
   */
  completeService: async (
    bookingId: number,
    payload?: CompleteServiceRequest
  ): Promise<StandardResponse<BookingDetailResponse>> => {
    const res = await axiosClient.post<StandardResponse<BookingDetailResponse>>(
      `/api/v1/provider/bookings/${bookingId}/complete`,
      payload ?? {}
    );
    return res.data;
  },
};
```

### 6.3. Xử lý UI/UX Khuyến Nghị Cho Frontend

1. **Nút "Bắt đầu dịch vụ":**
   - **Điều kiện hiển thị:** Chỉ hiển thị khi `booking.status === 'CONFIRMED'`.
   - **Kiểm soát thời gian:** Nếu thời gian hiện tại `new Date() < new Date(booking.startsAt)`:
     - Làm mờ (disable) nút bấm.
     - Hiển thị tooltip hoặc văn bản phụ: *"Chỉ có thể bắt đầu từ {formatDateTime(booking.startsAt)}"*.
   - **Xử lý xung đột thợ (409 Conflict):** Khi nhận lỗi `DATA_CONFLICT`, mở Modal thông báo: *"Bạn đang có một đơn dịch vụ khác đang thực hiện. Vui lòng hoàn thành đơn hiện tại trước khi bắt đầu đơn mới."*

2. **Nút "Hoàn thành dịch vụ":**
   - **Điều kiện hiển thị:** Chỉ hiển thị khi `booking.status === 'IN_PROGRESS'`.
   - **Modal xác nhận:** Khi bấm nút, hiển thị Modal xác nhận với ô ghi chú công việc (Textarea, đếm ký tự `0/500`).
   - Sau khi hoàn thành: Đơn chuyển sang nhãn xanh lá `ĐÃ HOÀN THÀNH`. Hiển thị thêm thông báo hạn nộp 70% số tiền còn lại: *"Hạn chót thanh toán phần còn lại: {formatDateTime(booking.balanceDueAt)}"*.

---

## 7. Bảng Tổng Hợp Vòng Đời Trạng Thái (State Transition Table)

| Trạng thái hiện tại | Thao tác NCC | Điều kiện kiểm tra | Trạng thái tiếp theo | Trường dữ liệu cập nhật |
| :--- | :--- | :--- | :--- | :--- |
| `CONFIRMED` | **Bắt đầu dịch vụ** | `now >= startsAt` && Không có đơn khác `IN_PROGRESS` | `IN_PROGRESS` | `started_at = now`, `version++` |
| `IN_PROGRESS` | **Hoàn thành dịch vụ** | `now >= startedAt` | `COMPLETED` | `completed_at = now`, `balance_due_at = completed_at + 24h`, `settlement_status = 'DRAFT'`, `version++` |

---

## 8. Hướng Dẫn Tự Sinh Token Để Test Postman

Để hỗ trợ kiểm thử thủ công trên Postman, một file script PowerShell sinh JWT token hợp lệ cho tài khoản NCC đã được cấu hình sẵn trong dự án:

```powershell
# Chạy tại thư mục gốc của project
.\generate_provider_token.ps1
```

Script sẽ tự động:
1. Đăng nhập hoặc sinh JWT Access Token chuẩn cho tài khoản Provider với vai trò `ROLE_PROVIDER`.
2. In sẵn mã `Bearer <token>` để copy trực tiếp vào tab **Authorization** của Postman.
