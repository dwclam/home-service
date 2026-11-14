# Nestify — Tài Liệu Tích Hợp API (Handoff Frontend)
**Module:** Quản lý lịch rảnh Nhà Cung Cấp (Provider Availability Management)  
**Use Case:** UC 20 — Quản lý lịch làm việc và khóa lịch (AVAILABLE / BLOCKED)  
**Phiên bản:** 1.0.0  
**Ngày cập nhật:** 31/10/2026  
**Người phụ trách backend:** Nguyễn Đình Thủy  

---

## 1. Tổng Quan

Tài liệu này đặc tả chi tiết toàn bộ các endpoint REST API cho chức năng **Quản lý lịch rảnh của Thợ / Nhà cung cấp (UC 20)** trong hệ thống Nestify. Tài liệu cung cấp đầy đủ thông tin về các phương thức HTTP, cấu trúc Request/Response, các quy tắc nghiệp vụ bất biến (Business Rules), thuật toán tự động hợp nhất khoảng thời gian (Auto-Merge), bảng mã lỗi chi tiết và hướng dẫn UI/UX để đội ngũ Frontend (React/Vite) tích hợp màn hình Calendar/Timeline lịch làm việc một cách dễ dàng và chuẩn xác.

### 1.1. Base URL & Môi trường
- **Môi trường phát triển cục bộ (Local / Dev):** `http://localhost:8080`
- **Môi trường Production (dự kiến):** `https://api.nestify.vn`
- **URI Prefix:** `/api/v1/provider/availability` *(Hỗ trợ alias ngắn `/api/provider/availability`)*

### 1.2. Định dạng chung
- **Content-Type:** `application/json;charset=UTF-8`
- **Mã hóa ký tự:** UTF-8
- **Định dạng thời gian:** Chuẩn ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`)
- **Quy ước khoảng thời gian (Interval Convention):** Nửa mở bên phải `[startsAt, endsAt)`.
  - Giờ bắt đầu tính cả biên (`startsAt <= t`), giờ kết thúc không tính biên (`t < endsAt`).
  - Ví dụ: Ca sáng `08:00 - 12:00` và ca chiều `12:00 - 17:00` tiếp giáp nhau tại `12:00` mà **không bị coi là xung đột hay trùng giờ**.

---

## 2. Xác Thực & Phân Quyền (Authentication & Security)

- **Cơ chế xác thực:** JWT Bearer Token (Stateless).
- **Yêu cầu bảo mật:**
  - Header: `Authorization: Bearer <accessToken>`
  - Vai trò bắt buộc: **`ROLE_PROVIDER`**.
- **Chống tấn công IDOR & Bảo vệ dữ liệu:**
  - `providerId` được trích xuất an toàn trực tiếp từ JWT Token của phiên đăng nhập (`CurrentAccount.getId()`). Thợ không cần và không được phép truyền `providerId` qua Path hoặc Request Body.
  - Mọi thao tác sửa/xóa slot lịch đều kiểm tra quyền sở hữu bản ghi. Cố tình thao tác trên slot của thợ khác sẽ nhận lỗi `403 ACCESS_DENIED` hoặc `404 NOT_FOUND`.

---

## 3. Ma Trận Quy Tắc Nghiệp Vụ Bất Biến (Business Rules)

| Mã quy tắc | Tên quy tắc | Nội dung & Điều kiện kiểm tra | Hành vi xử lý khi vi phạm |
| :--- | :--- | :--- | :--- |
| **BR-UC20-01** | Hợp lệ thời gian | `startsAt < endsAt`. `endsAt` phải ở tương lai (`endsAt > now`). | Báo lỗi `400 BUSINESS_ERROR`: *"Thời gian kết thúc phải lớn hơn thời gian bắt đầu và ở tương lai."* |
| **BR-UC20-02** | Phân quyền NCC | Tài khoản thợ phải đang ở trạng thái `ACTIVE`. Thao tác phải đúng slot do mình sở hữu. | Báo lỗi `403 ACCESS_DENIED` hoặc `400 BUSINESS_ERROR` nếu tài khoản chưa kích hoạt/bị khóa. |
| **BR-UC20-03** | Khóa lịch không xâm phạm đơn Active (CRITICAL) | Khi tạo hoặc sửa slot thành `BLOCKED` trong khoảng $[s, e)$: Tuyệt đối **không được trùng khung giờ** với các đơn hàng của thợ đang giữ chỗ độc quyền:<br>1. `CONFIRMED` (Đã xác nhận)<br>2. `IN_PROGRESS` (Đang thực hiện)<br>3. `PENDING_DEPOSIT` (Đang giữ chỗ cọc và `deposit_due_at > now`) | **Từ chối ngay lập tức**.<br>Báo lỗi `409 DATA_CONFLICT`: *"Không thể khóa lịch trong khung giờ này vì đã có đơn đặt lịch [BK-...] đang giữ chỗ hoặc đã xác nhận. Nếu không thể phục vụ, vui lòng vào đơn hàng để thực hiện hủy đơn."* |
| **BR-UC20-04** | Xóa/Thu hẹp AVAILABLE không làm mất chỗ đơn Active | Khi xóa slot `AVAILABLE` hoặc thu hẹp giờ: Nếu tồn tại đơn active mà sau khi sửa/xóa sẽ **không còn slot AVAILABLE nào khác bao phủ**. | **Chặn thao tác**.<br>Báo lỗi `400 BUSINESS_ERROR`: *"Không thể xóa hoặc thu hẹp khung giờ làm việc vì đơn đặt lịch [BK-...] đang được lên lịch trong khoảng thời gian này."* |
| **BR-UC20-05** | Tự động gộp slot (Auto-Merge) | Khi tạo hoặc cập nhật slot `AVAILABLE` (hoặc `BLOCKED`) mà tiếp giáp ($e_1 = s_2$) hoặc giao nhau với slot cùng loại cũ: Hệ thống **tự động gộp** thành một khoảng liên tục duy nhất $[\min, \max)$ và dọn dẹp các bản ghi thừa, giữ lịch luôn chuẩn hóa. | Tự động xử lý ngầm, trả về slot sau khi đã hợp nhất. |
| **BR-UC20-06** | Xóa slot BLOCKED | Xóa slot `BLOCKED` luôn an toàn (mở lại thời gian rảnh). | Cho phép xóa ngay và trả về 200 OK. |

---

## 4. Bảng Mã Lỗi Chi Tiết

| HTTP Status | Error Code | Ý nghĩa | Hành động khuyến nghị cho Frontend |
| :--- | :--- | :--- | :--- |
| **400 Bad Request** | `VALIDATION_ERROR` | Dữ liệu gửi lên thiếu trường bắt buộc (`startsAt`, `endsAt`, `state` bị null hoặc danh sách batch rỗng) | Hiển thị thông báo lỗi ngay dưới ô nhập liệu tương ứng từ `fieldErrors`. |
| **400 Bad Request** | `BUSINESS_ERROR` | Vi phạm quy tắc: `startsAt >= endsAt`, giờ quá khứ, tài khoản thợ bị khóa, hoặc xóa slot `AVAILABLE` làm mất chỗ đơn active | Hiển thị Modal/Alert thông báo `message` cho thợ. |
| **401 Unauthorized** | `AUTHENTICATION_REQUIRED` | Chưa đăng nhập hoặc Access Token hết hạn | Tự động gọi refresh token hoặc chuyển hướng về trang đăng nhập `/login`. |
| **403 Forbidden** | `ACCESS_DENIED` | Không có vai trò `ROLE_PROVIDER` hoặc cố sửa/xóa lịch của thợ khác | Chặn thao tác và cảnh báo không có quyền thực hiện. |
| **404 Not Found** | `NOT_FOUND` | Không tìm thấy slot lịch với ID tương ứng | Thông báo slot không tồn tại, tải lại dữ liệu lịch trên Calendar. |
| **409 Conflict** | `DATA_CONFLICT` | Khóa lịch trùng khung giờ với đơn đặt lịch đang active (`CONFIRMED`, `IN_PROGRESS`, `PENDING_DEPOSIT`) | Bật Modal cảnh báo va chạm đơn active, hiển thị mã đơn và nút điều hướng tới chi tiết đơn để thợ hủy theo luồng UC 41 nếu cần. |

---

## 5. Danh Sách Chi Tiết Các Endpoints

### 5.1. Lấy danh sách lịch rảnh (`GET /api/v1/provider/availability`)
- **Mục đích:** Lấy toàn bộ các slot `AVAILABLE` và `BLOCKED` trong khoảng thời gian xác định để vẽ lên UI Calendar (tuần / tháng).
- **Method:** `GET`
- **URI Path:** `/api/v1/provider/availability`
- **Query Parameters:**
  - `from` (`Instant`, ISO-8601, Tùy chọn): Thời điểm bắt đầu xem (mặc định là thời điểm hiện tại `now`).
  - `to` (`Instant`, ISO-8601, Tùy chọn): Thời điểm kết thúc xem (mặc định là `from + 30 ngày`).

#### Ví dụ Request:
```http
GET /api/v1/provider/availability?from=2026-11-01T00:00:00Z&to=2026-11-07T23:59:59Z HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
```

#### Ví dụ Response thành công (200 OK):
```json
{
  "success": true,
  "message": "Lấy danh sách lịch rảnh thành công",
  "data": [
    {
      "id": 101,
      "providerId": 2,
      "startsAt": "2026-11-02T08:00:00Z",
      "endsAt": "2026-11-02T12:00:00Z",
      "state": "AVAILABLE",
      "createdAt": "2026-10-31T08:00:00Z",
      "updatedAt": "2026-10-31T08:00:00Z"
    },
    {
      "id": 102,
      "providerId": 2,
      "startsAt": "2026-11-02T13:00:00Z",
      "endsAt": "2026-11-02T17:00:00Z",
      "state": "AVAILABLE",
      "createdAt": "2026-10-31T08:00:00Z",
      "updatedAt": "2026-10-31T08:00:00Z"
    },
    {
      "id": 103,
      "providerId": 2,
      "startsAt": "2026-11-03T09:00:00Z",
      "endsAt": "2026-11-03T11:00:00Z",
      "state": "BLOCKED",
      "createdAt": "2026-10-31T08:30:00Z",
      "updatedAt": "2026-10-31T08:30:00Z"
    }
  ],
  "timestamp": "2026-10-31T09:00:00Z"
}
```

---

### 5.2. Tạo một khung lịch đơn lẻ (`POST /api/v1/provider/availability`)
- **Mục đích:** Thợ thêm một khung giờ mở nhận việc (`AVAILABLE`) hoặc khóa nhận việc (`BLOCKED`).
- **Method:** `POST`
- **URI Path:** `/api/v1/provider/availability`
- **Request Body:**
  ```json
  {
    "startsAt": "2026-11-04T08:00:00Z",
    "endsAt": "2026-11-04T12:00:00Z",
    "state": "AVAILABLE"
  }
  ```
  *(Các giá trị hợp lệ của `state`: `"AVAILABLE"`, `"BLOCKED"`)*.

#### Ví dụ Response thành công (201 Created):
```json
{
  "success": true,
  "message": "Tạo khoảng thời gian làm việc thành công",
  "data": {
    "id": 105,
    "providerId": 2,
    "startsAt": "2026-11-04T08:00:00Z",
    "endsAt": "2026-11-04T12:00:00Z",
    "state": "AVAILABLE",
    "createdAt": "2026-10-31T09:05:00Z",
    "updatedAt": "2026-10-31T09:05:00Z"
  },
  "timestamp": "2026-10-31T09:05:00Z"
}
```

#### Ví dụ Response lỗi khi khóa lịch đè lên đơn active (409 Conflict):
```json
{
  "code": "DATA_CONFLICT",
  "message": "Không thể khóa lịch trong khung giờ này vì đã có đơn đặt lịch BK-20261031-89AB12 đang giữ chỗ hoặc đã xác nhận. Nếu không thể phục vụ, vui lòng vào đơn hàng để thực hiện hủy đơn.",
  "fieldErrors": {}
}
```

---

### 5.3. Mở lịch hàng loạt (`POST /api/v1/provider/availability/batch`)
- **Mục đích:** Cho phép thợ thiết lập nhanh lịch làm việc cả tuần hoặc cả tháng với nhiều khung giờ cùng lúc.
- **Method:** `POST`
- **URI Path:** `/api/v1/provider/availability/batch`
- **Request Body:**
  ```json
  {
    "slots": [
      {
        "startsAt": "2026-11-05T08:00:00Z",
        "endsAt": "2026-11-05T12:00:00Z",
        "state": "AVAILABLE"
      },
      {
        "startsAt": "2026-11-05T13:00:00Z",
        "endsAt": "2026-11-05T17:00:00Z",
        "state": "AVAILABLE"
      },
      {
        "startsAt": "2026-11-06T08:00:00Z",
        "endsAt": "2026-11-06T12:00:00Z",
        "state": "AVAILABLE"
      }
    ]
  }
  ```

#### Ví dụ Response thành công (201 Created):
```json
{
  "success": true,
  "message": "Mở lịch hàng loạt thành công",
  "data": [
    {
      "id": 106,
      "providerId": 2,
      "startsAt": "2026-11-05T08:00:00Z",
      "endsAt": "2026-11-05T12:00:00Z",
      "state": "AVAILABLE",
      "createdAt": "2026-10-31T09:10:00Z",
      "updatedAt": "2026-10-31T09:10:00Z"
    },
    {
      "id": 107,
      "providerId": 2,
      "startsAt": "2026-11-05T13:00:00Z",
      "endsAt": "2026-11-05T17:00:00Z",
      "state": "AVAILABLE",
      "createdAt": "2026-10-31T09:10:00Z",
      "updatedAt": "2026-10-31T09:10:00Z"
    },
    {
      "id": 108,
      "providerId": 2,
      "startsAt": "2026-11-06T08:00:00Z",
      "endsAt": "2026-11-06T12:00:00Z",
      "state": "AVAILABLE",
      "createdAt": "2026-10-31T09:10:00Z",
      "updatedAt": "2026-10-31T09:10:00Z"
    }
  ],
  "timestamp": "2026-10-31T09:10:00Z"
}
```

---

### 5.4. Cập nhật khung lịch (`PUT /api/v1/provider/availability/{id}`)
- **Mục đích:** Sửa đổi thời gian bắt đầu, kết thúc hoặc chuyển đổi trạng thái của slot có sẵn.
- **Method:** `PUT`
- **URI Path:** `/api/v1/provider/availability/{id}`
- **Path Variable:** `id` (ID của slot cần sửa).
- **Request Body:**
  ```json
  {
    "startsAt": "2026-11-04T08:00:00Z",
    "endsAt": "2026-11-04T18:00:00Z",
    "state": "AVAILABLE"
  }
  ```

#### Ví dụ Response thành công (200 OK):
```json
{
  "success": true,
  "message": "Cập nhật khoảng thời gian làm việc thành công",
  "data": {
    "id": 105,
    "providerId": 2,
    "startsAt": "2026-11-04T08:00:00Z",
    "endsAt": "2026-11-04T18:00:00Z",
    "state": "AVAILABLE",
    "createdAt": "2026-10-31T09:05:00Z",
    "updatedAt": "2026-10-31T09:15:00Z"
  },
  "timestamp": "2026-10-31T09:15:00Z"
}
```

#### Ví dụ Response lỗi khi thu hẹp giờ làm mất chỗ đơn active (400 Bad Request):
```json
{
  "code": "BUSINESS_ERROR",
  "message": "Không thể cập nhật hoặc thu hẹp khung giờ làm việc vì đơn đặt lịch BK-20261031-77CC88 đang được lên lịch trong khoảng thời gian này.",
  "fieldErrors": {}
}
```

---

### 5.5. Xóa khung lịch (`DELETE /api/v1/provider/availability/{id}`)
- **Mục đích:** Xóa một slot lịch làm việc hoặc slot khóa bận.
- **Method:** `DELETE`
- **URI Path:** `/api/v1/provider/availability/{id}`
- **Path Variable:** `id` (ID của slot cần xóa).

#### Ví dụ Response thành công (200 OK):
```json
{
  "success": true,
  "message": "Xóa khoảng lịch thành công",
  "data": null,
  "timestamp": "2026-10-31T09:20:00Z"
}
```

#### Ví dụ Response lỗi khi xóa slot AVAILABLE có đơn active (400 Bad Request):
```json
{
  "code": "BUSINESS_ERROR",
  "message": "Không thể xóa khung giờ làm việc vì đơn đặt lịch BK-20261031-77CC88 đang được lên lịch trong khoảng thời gian này.",
  "fieldErrors": {}
}
```

---

## 6. Mẫu Lệnh cURL Kiểm Thử Thực Tế

### 6.1. Lấy danh sách lịch rảnh tuần tới
```bash
curl -X GET "http://localhost:8080/api/v1/provider/availability?from=2026-11-01T00:00:00Z&to=2026-11-07T23:59:59Z" \
  -H "Authorization: Bearer <provider_jwt_token>" \
  -H "Accept: application/json"
```

### 6.2. Mở ca làm việc 08:00 - 12:00
```bash
curl -X POST "http://localhost:8080/api/v1/provider/availability" \
  -H "Authorization: Bearer <provider_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "startsAt": "2026-11-02T08:00:00Z",
    "endsAt": "2026-11-02T12:00:00Z",
    "state": "AVAILABLE"
  }'
```

### 6.3. Khóa lịch nghỉ bận 14:00 - 16:00
```bash
curl -X POST "http://localhost:8080/api/v1/provider/availability" \
  -H "Authorization: Bearer <provider_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "startsAt": "2026-11-02T14:00:00Z",
    "endsAt": "2026-11-02T16:00:00Z",
    "state": "BLOCKED"
  }'
```

### 6.4. Xóa một slot lịch
```bash
curl -X DELETE "http://localhost:8080/api/v1/provider/availability/101" \
  -H "Authorization: Bearer <provider_jwt_token>" \
  -H "Accept: application/json"
```

---

## 7. Khuyến Nghị Thiết Kế Giao Diện (Frontend UI/UX Guidelines)

1. **Hiển thị Calendar đa màu sắc:**
   - Khung giờ `AVAILABLE`: Hiển thị màu xanh lá nhẹ hoặc xanh da trời (giao diện thợ sẵn sàng).
   - Khung giờ `BLOCKED`: Hiển thị màu xám sọc chéo hoặc màu đỏ nhạt biểu thị khung giờ bận/nghỉ.
   - Các đơn hàng active (`CONFIRMED`, `IN_PROGRESS`): Hiển thị nổi bật đè lên khung giờ làm việc tương ứng.
2. **Kéo thả hoặc tạo ca nhanh (Quick Shifts):**
   - Hỗ trợ các nút chọn nhanh: *"Mở ca sáng (08:00 - 12:00)"*, *"Mở ca chiều (13:00 - 17:00)"*, *"Áp dụng cho cả tuần"* $\rightarrow$ Gọi API Batch `/api/v1/provider/availability/batch`.
3. **Xử lý mượt mà khi Auto-Merge xảy ra:**
   - Khi thợ tạo slot tiếp giáp với slot cũ, API sẽ tự động merge. Frontend chỉ cần reload lại danh sách hoặc cập nhật state từ response trả về để Calendar hiển thị một khối liên tục duy nhất.
4. **Xử lý xung đột (409 Conflict):**
   - Khi thợ muốn khóa lịch nhưng nhận lỗi `409 DATA_CONFLICT` kèm mã đơn (ví dụ `BK-20261031-89AB12`), Frontend hiển thị Modal cảnh báo:
     > *"Bạn đang có đơn hàng [BK-20261031-89AB12] đã được lên lịch trong khung giờ này. Để ngừng nhận việc, vui lòng vào chi tiết đơn hàng để hủy đơn theo quy định của hệ thống."*
   - Cung cấp nút bấm chuyển thẳng đến `/provider/bookings/{id}`.
