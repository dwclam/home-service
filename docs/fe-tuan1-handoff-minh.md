# Nestify — Tài Liệu Bàn Giao Frontend Tuần 1, 2 & 3 (Minh — FE2)

**Ngày cập nhật:** 14/11/2026  
**Người thực hiện:** Minh (FE2 — Khu vực Nhà cung cấp & Admin vận hành)  
**Đối tượng sử dụng tài liệu:**
- **TLam (FE1):** Sử dụng các Component UI dùng chung (`DashboardLayout`, `DataTable`, `Pagination`, `StatusBadge`, `EmptyState`, `ProtectedRoute`), các hàm API trong `features/booking/api.js` và `features/catalog/api.js`, và phối hợp luồng Khách hàng (UC05, UC08, UC11, UC38).
- **Cường (BE):** Đối chiếu hợp đồng Request/Response đã kết nối cho **UC18 (Hồ sơ NCC)**, **UC19 (Dịch vụ NCC)**, **UC30 (Cây danh mục)**, **UC05 (Tìm kiếm dịch vụ)** và điểm chờ API **UC40 (Danh sách đơn phía NCC)**.
- **Thuỷ (BE):** Đối chiếu hợp đồng Request/Response đã kết nối cho **UC20 (Lịch rảnh NCC + Batch + Auto-Merge)**, **UC21 (Chấp nhận / Từ chối đơn)**, **UC22 (Bắt đầu / Hoàn thành dịch vụ)**, **UC38 (Lịch rảnh & Giá gói dịch vụ)**, **UC51 (Quét hết hạn đơn & Nhả lịch rảnh)** và **UC08 / UC11**.
- **Lâm & Cả nhóm:** Đối chiếu cổng đăng nhập Quản trị viên **UC27 (`/api/auth/login/admin`)** và hướng dẫn chạy demo luồng P0 cuối Tuần 2 & Tuần 3.

---

## 1. Tổng Quan Bàn Giao Tuần 1

| Hạng mục | File chính | Trạng thái | Ghi chú tích hợp |
| :--- | :--- | :--- | :--- |
| **Hằng số Vai trò & Trạng thái** | `frontend/src/constants/roles.js`<br/>`frontend/src/constants/status.js` | Hoàn thành | Đồng bộ 100% với Enum Java phía Backend (`AccountType`, `BookingStatus`, `ServiceStatus`, `AvailabilityState`, `BankVerificationStatus`). |
| **Badge trạng thái chuẩn Guideline** | `frontend/src/components/ui/StatusBadge.jsx` | Hoàn thành | Không nền, không viền, chỉ icon Lucide (`-600`) + chữ đậm (`-700`); riêng `IN_PROGRESS` xoay icon (`animate-spin`). |
| **Bảng dữ liệu & Phân trang** | `frontend/src/components/ui/DataTable.jsx`<br/>`frontend/src/components/ui/Pagination.jsx`<br/>`frontend/src/components/ui/EmptyState.jsx` | Hoàn thành | Hỗ trợ `isLoading`, `error` + `onRetry`, `empty` và phân trang khớp `PageResponse<T>` (`items`, `page`, `size`, `totalElements`, `totalPages`). |
| **Dashboard Layout & Sidebar** | `frontend/src/layouts/DashboardLayout.jsx` | Hoàn thành | Sidebar trái `240px` + Topbar `64px` + nội dung `padding 24px`, tự động chuyển thành Drawer trên mobile; hỗ trợ cả `PROVIDER` và `ADMIN`. |
| **Bảo vệ Route theo vai trò (RBAC)** | `frontend/src/routes/ProtectedRoute.jsx`<br/>`frontend/src/app/router.jsx` | Hoàn thành | Kiểm tra `allowedRoles` (`CUSTOMER`, `PROVIDER`, `ADMIN`), hiển thị màn `403` khi không đủ quyền. |
| **Hồ sơ Nhà cung cấp (UC18)** | `frontend/src/pages/provider/ProviderProfilePage.jsx`<br/>`frontend/src/features/provider/api.js` | Hoàn thành UI + Hợp đồng API | Tự động gọi `/api/v1/provider/profile`; tự fallback sang dữ liệu mẫu khi BE của Cường chưa bật. |
| **Gói dịch vụ & Ảnh NCC (UC19)** | `frontend/src/pages/provider/ProviderServicesPage.jsx`<br/>`frontend/src/features/catalog/api.js` | Hoàn thành UI + Hợp đồng API | Tự động gọi `/api/v1/provider/services` & `/api/v1/public/categories`; hỗ trợ quản lý thứ tự ảnh (`sortOrder`). |
| **Lịch rảnh & Khóa lịch NCC (UC20)** | `frontend/src/pages/provider/ProviderAvailabilityPage.jsx`<br/>`frontend/src/features/provider/api.js` | Hoàn thành UI + Hợp đồng API | Tự động gọi `/api/v1/provider/availability`; kiểm tra khoảng nửa mở `[startsAt, endsAt)`. |
| **Khách Đặt lịch (UC08) & Hủy đơn (UC11)** | `frontend/src/pages/customer/CreateBookingPage.jsx`<br/>`frontend/src/pages/customer/CustomerBookingsPage.jsx`<br/>`frontend/src/features/booking/api.js` | Hoàn thành & Nối BE | Đã nối khớp `CustomerBookingController` của Thuỷ (`POST /api/v1/customer/bookings` và `POST /api/v1/customer/bookings/{id}/cancel`). |

---

## 2. Hướng Dẫn Dùng Chung Cho TLam (FE1)

### 2.1. Sử dụng `StatusBadge`
Tuân thủ nghiêm ngặt `docs/FE-guideline-lite (1).md` (không nền, không viền). Có thể truyền trực tiếp mọi mã trạng thái của đơn hàng, dịch vụ, lịch rảnh hoặc xác minh ngân hàng:

```jsx
import { StatusBadge } from '../components/ui/StatusBadge'

// Hiển thị trạng thái đơn (PENDING_PROVIDER, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, REJECTED, EXPIRED)
<StatusBadge status={booking.status} />

// Hoặc tùy biến nhãn hiển thị
<StatusBadge status="PUBLISHED" customLabel="Đang hoạt động" />
```

### 2.2. Sử dụng `DataTable` & `Pagination`
`DataTable` nhận mảng `columns`, `data`, trạng thái tải/lỗi và đối tượng `pagination` khớp chuẩn `PageResponse<T>` của Backend:

```jsx
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'

const columns = [
  { key: 'bookingCode', title: 'Mã đơn' },
  {
    key: 'totalAmountVnd',
    title: 'Tổng tiền',
    align: 'right',
    render: (row) => `${row.totalAmountVnd.toLocaleString('vi-VN')} đ`,
  },
  {
    key: 'status',
    title: 'Trạng thái',
    render: (row) => <StatusBadge status={row.status} />,
  },
]

<DataTable
  columns={columns}
  data={pageData.items}
  isLoading={isLoading}
  error={error}
  onRetry={reloadData}
  emptyTitle="Chưa có dữ liệu"
  emptyDescription="Mô tả khi danh sách trống."
  pagination={pageData} // { items, page, size, totalElements, totalPages }
  onPageChange={(nextPage) => setCurrentPage(nextPage)}
/>
```

### 2.3. Sử dụng `ProtectedRoute` & `DashboardLayout` khi thêm trang Admin cơ bản
Khi TLam thêm các trang Admin cơ bản (Người dùng UC29, Duyệt NCC UC28, Danh mục UC30), chỉ cần khai báo thêm route con bên trong nhánh `/admin` tại `frontend/src/app/router.jsx` và bật mục menu tương ứng trong `ADMIN_NAV_ITEMS` tại `frontend/src/layouts/DashboardLayout.jsx`:

```jsx
// Trong frontend/src/app/router.jsx
{
  path: '/admin',
  element: (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
      <DashboardLayout role={ROLES.ADMIN} />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <AdminOverviewPage /> },
    // TLam thêm các trang Admin cơ bản tại đây:
    // { path: 'providers', element: <ProviderApplicationsPage /> },
    // { path: 'categories', element: <AdminCategoriesPage /> },
    // { path: 'users', element: <AdminUsersPage /> },
  ],
}
```

---

## 3. Hợp Đồng API Dành Cho Backend (Cường & Thuỷ)

Frontend đã cài đặt sẵn các hàm gọi API trong `features/provider/api.js` và `features/catalog/api.js` (hỗ trợ cả trường hợp Backend trả trực tiếp DTO hoặc bọc trong `StandardResponse<T>`). Khi Backend triển khai đúng các đường dẫn và tên trường dưới đây, Frontend sẽ **tự động chuyển từ chế độ Mock sang dữ liệu thật** mà không cần sửa lại giao diện.

### 3.1. UC18 — Quản lý Hồ sơ Nhà cung cấp (Đầu mối BE: Cường)

- **Lấy hồ sơ của NCC đang đăng nhập:**
  - `GET /api/v1/provider/profile` (Yêu cầu `ROLE_PROVIDER`)
  - **Response (`200 OK` — bọc trong `StandardResponse`):**
    ```json
    {
      "success": true,
      "message": "Thao tác thành công",
      "data": {
        "accountId": 2001,
        "applicationId": 101,
        "businessName": "Điện Lạnh & Gia Dụng Bách Khoa 247",
        "bio": "Mô tả kinh nghiệm và cam kết...",
        "city": "Hà Nội",
        "address": "Số 18 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
        "logoUrl": "https://example.com/logo.jpg",
        "isVisible": true,
        "bankCode": "VCB - Vietcombank",
        "bankAccountNumberMasked": "**** **** 8829",
        "bankAccountHolderName": "NGUYEN VAN MINH",
        "bankVerificationStatus": "VERIFIED",
        "updatedAt": "2026-10-31T10:00:00Z"
      }
    }
    ```
- **Cập nhật thông tin công khai của NCC:**
  - `PUT /api/v1/provider/profile` (Yêu cầu `ROLE_PROVIDER`)
  - **Request Body (`application/json`):**
    ```json
    {
      "businessName": "Điện Lạnh & Gia Dụng Bách Khoa 247",
      "city": "Hà Nội",
      "address": "Số 18 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
      "bio": "Mô tả năng lực...",
      "logoUrl": "https://example.com/logo.jpg",
      "isVisible": true
    }
    ```
  - *Lưu ý:* Không nhận cập nhật các trường ngân hàng hoặc trạng thái duyệt ở API này.

---

### 3.2. UC30 & UC19 — Danh mục & Quản lý Dịch vụ của NCC (Đầu mối BE: Cường)

- **Lấy danh mục đang hoạt động (để đổ vào dropdown chọn danh mục):**
  - `GET /api/v1/public/categories`
  - **Response `data`:** Mảng các danh mục `{ id, name, slug, description, iconName, sortOrder, isActive }`.
- **Lấy danh sách gói dịch vụ của NCC (có phân trang & lọc):**
  - `GET /api/v1/provider/services?page=0&size=6&status=PUBLISHED&keyword=...`
  - **Response `data` (`PageResponse<ProviderServiceResponse>`):**
    ```json
    {
      "items": [
        {
          "id": 301,
          "providerId": 2001,
          "categoryId": 1,
          "categoryName": "Điện lạnh & Điều hòa",
          "title": "Vệ sinh & Bảo dưỡng điều hòa treo tường trọn gói",
          "description": "Mô tả chi tiết công việc...",
          "basePriceVnd": 250000,
          "durationMinutes": 60,
          "status": "PUBLISHED",
          "images": [
            {
              "id": 1001,
              "imageUrl": "https://example.com/service-1.jpg",
              "altText": "Vệ sinh điều hòa",
              "sortOrder": 0
            }
          ],
          "createdAt": "2026-10-18T03:00:00Z",
          "updatedAt": "2026-10-24T04:30:00Z"
        }
      ],
      "page": 0,
      "size": 6,
      "totalElements": 1,
      "totalPages": 1
    }
    ```
- **Tạo mới / Cập nhật gói dịch vụ của NCC:**
  - `POST /api/v1/provider/services` và `PUT /api/v1/provider/services/{id}`
  - **Request Body (`application/json`):**
    ```json
    {
      "title": "Vệ sinh & Bảo dưỡng điều hòa treo tường trọn gói",
      "categoryId": 1,
      "description": "Mô tả quy trình thực hiện...",
      "basePriceVnd": 250000,
      "durationMinutes": 60,
      "status": "PUBLISHED",
      "images": [
        {
          "imageUrl": "https://example.com/service-1.jpg",
          "altText": "Ảnh bìa dịch vụ",
          "sortOrder": 0
        }
      ]
    }
    ```

---

### 3.3. UC20 — Quản lý Lịch rảnh của NCC (Đầu mối BE: Thuỷ)

- **Lấy danh sách các khoảng lịch của NCC:**
  - `GET /api/v1/provider/availability?state=AVAILABLE` (nếu không truyền `state` thì trả tất cả `AVAILABLE` và `BLOCKED`).
  - **Response `data`:** Mảng các khoảng lịch `{ id, providerId, startsAt, endsAt, state, createdAt, updatedAt }` (thời gian chuẩn ISO-8601 UTC).
- **Thêm mới / Cập nhật / Xóa khoảng lịch:**
  - `POST /api/v1/provider/availability`
  - `PUT /api/v1/provider/availability/{id}`
  - `DELETE /api/v1/provider/availability/{id}`
  - **Request Body (`POST` / `PUT`):**
    ```json
    {
      "startsAt": "2026-11-05T01:00:00.000Z",
      "endsAt": "2026-11-05T05:00:00.000Z",
      "state": "AVAILABLE"
    }
    ```
  - *Quy tắc nghiệp vụ:* Khoảng nửa mở `[startsAt, endsAt)`. Nếu trùng khung lịch hoặc làm mất chỗ đơn đang giữ cọc/đã xác nhận/đang thực hiện, Backend trả HTTP `400` (`BUSINESS_ERROR`) hoặc `409` (`DATA_CONFLICT`) kèm `message` tiếng Việt để FE hiển thị toast thông báo.

---

## 4. Hướng Dẫn Kiểm Thử Nhanh Cho Cả Nhóm

### 4.1. Khởi chạy Frontend
```bash
cd frontend
npm ci
npm run dev
```
Mở trình duyệt tại `http://localhost:5173`.

### 4.2. Chuyển nhanh giữa 3 vai trò (Dev Seed trên trang `/login`)
Khi chạy ở chế độ phát triển (`npm run dev`), tại cuối trang **`http://localhost:5173/login`** có sẵn 3 nút chuyển nhanh phiên làm việc (không cần chờ cấu hình SMTP/OTP):
1. **Khách (UC08/11):** Vào phiên `CUSTOMER` và điều hướng tới `/customer/bookings` để kiểm thử:
   - Đặt lịch mới tại `/customer/bookings/new` (kiểm tra quy tắc giờ hẹn $\ge 60$ phút `MD01`, chọn sổ địa chỉ hoặc nhập địa chỉ mới, tính cọc `30%` / còn lại `70%`).
   - Xem đồng hồ đếm ngược `requestExpiresAt` và bấm **"Hủy đơn đặt lịch"** (UC11) để kiểm tra cảnh báo hoàn cọc `50%` (hủy sớm $\ge 30$ phút), `0%` (hủy sát giờ $< 30$ phút) và miễn phí khi chưa thu cọc (`PENDING_PROVIDER`).
2. **Khu vực NCC:** Vào phiên `PROVIDER` để kiểm thử:
   - `/provider/profile` — Cập nhật hồ sơ công khai & xem trước thẻ hiển thị (UC18).
   - `/provider/services` — Bảng danh sách, bộ lọc trạng thái, tìm kiếm, phân trang và Modal tạo/sửa gói dịch vụ kèm sắp xếp ảnh (UC19).
   - `/provider/availability` — Quản lý khoảng lịch `AVAILABLE` / `BLOCKED` và kiểm tra chống chồng lấn khung giờ (UC20).
   - `/provider/bookings` — Quản lý đơn đặt dịch vụ của NCC: nhận đơn / từ chối đơn (UC21), bắt đầu / hoàn thành dịch vụ (UC22), xem chi tiết Snapshot & dòng thời gian (UC40).
3. **Khu vực Admin:** Vào phiên `ADMIN` tại `/admin` để kiểm tra `DashboardLayout` ở chế độ Quản trị viên, bảng đối chiếu 6 trạng thái `StatusBadge` và nút kích hoạt quét đơn quá hạn theo yêu cầu (UC51).

---

## 5. Tổng Quan Bàn Giao Nối Tiếp Tuần 2 & Tuần 3 (Minh — FE2)

### 5.1. Bảng ánh xạ Use Case ↔ API Backend thật ↔ File Frontend đã kết nối

| Use Case | Đầu mối BE | Endpoint Backend đã tích hợp | File Frontend xử lý | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **UC18** — Hồ sơ Nhà cung cấp | Cường | `GET /api/provider/profile`<br/>`PUT /api/provider/profile` | `frontend/src/features/provider/api.js`<br/>`frontend/src/features/provider/schemas.js`<br/>`frontend/src/pages/provider/ProviderProfilePage.jsx` | Đã nối khớp 100% với `ProviderProfileController` (5 trường `businessName`, `city`, `address`, `bio`, `logoUrl` + trạng thái `visible` chỉ đọc). |
| **UC19 & UC30** — Dịch vụ NCC & Cây danh mục | Cường | `GET /api/public/categories/tree`<br/>`GET /api/provider/services`<br/>`POST /api/provider/services`<br/>`PUT /api/provider/services/{id}`<br/>`PATCH /api/provider/services/{id}/publish`<br/>`PATCH /api/provider/services/{id}/archive` | `frontend/src/features/catalog/api.js`<br/>`frontend/src/pages/provider/ProviderServicesPage.jsx`<br/>`frontend/src/features/catalog/components/ServiceFormModal.jsx` | Đã nối khớp `ProviderServiceController` & `CategoryPublicController`: tự làm phẳng cây danh mục cha-con, đọc `Page<ServiceResponse>` của Spring, và tự động gọi chuỗi `PATCH /publish` hoặc `/archive`. |
| **UC20** — Quản lý lịch rảnh NCC | Thuỷ | `GET /api/v1/provider/availability`<br/>`POST /api/v1/provider/availability`<br/>`POST /api/v1/provider/availability/batch`<br/>`DELETE /api/v1/provider/availability/{id}` | `frontend/src/features/provider/api.js`<br/>`frontend/src/pages/provider/ProviderAvailabilityPage.jsx`<br/>`frontend/src/features/provider/components/AvailabilityFormModal.jsx` | Đã nối khớp `ProviderAvailabilityController`: hỗ trợ mở ca đơn, mở ca hàng loạt 3 ngày tới (`BatchAvailabilityRequest`), Auto-Merge (`BR-UC20-05`) và cảnh báo `409 DATA_CONFLICT` (`BR-UC20-03`). |
| **UC21** — Chấp nhận / Từ chối đơn | Thuỷ | `POST /api/v1/provider/bookings/{id}/accept`<br/>`POST /api/v1/provider/bookings/{id}/reject` | `frontend/src/features/booking/api.js`<br/>`frontend/src/features/booking/components/RejectBookingModal.jsx`<br/>`frontend/src/pages/provider/ProviderBookingsPage.jsx` | Đã nối khớp `ProviderBookingController`: gửi kèm `version` (Optimistic Lock), bắt buộc nhập `reason` (`@NotBlank`, tối đa 500 ký tự) khi từ chối, đếm ngược `requestExpiresAt` và tự reload khi gặp `409 DATA_CONFLICT`. |
| **UC22** — Bắt đầu / Hoàn thành dịch vụ | Thuỷ | `POST /api/v1/provider/bookings/{id}/start`<br/>`POST /api/v1/provider/bookings/{id}/complete` | `frontend/src/features/booking/api.js`<br/>`frontend/src/features/booking/components/ServiceActionModal.jsx`<br/>`frontend/src/pages/provider/ProviderBookingsPage.jsx` | Đã nối khớp `ProviderBookingController`: khóa nút Bắt đầu nếu `now < startsAt` (`BR-UC22-01`), hỗ trợ nhập `note` nghiệm thu (tối đa 500 ký tự), hiển thị `startedAt`, `completedAt`, `balanceDueAt (+24h)`. |
| **UC40** — Danh sách & Chi tiết đơn phía NCC | Cường | `GET /api/v1/provider/bookings` *(đang chờ BE mở endpoint GET)* | `frontend/src/pages/provider/ProviderBookingsPage.jsx`<br/>`frontend/src/features/booking/components/ProviderBookingDetailModal.jsx` | FE đã gọi sẵn `/v1/provider/bookings` (và `/provider/bookings`), có bộ lọc 7 tab trạng thái, tìm kiếm từ khóa, Modal chi tiết Snapshot + Thanh **Thao tác nhanh theo ID đơn** để test trực tiếp đơn thật trong DB. |
| **UC38** — Xem lịch rảnh & giá gói dịch vụ | Thuỷ | `GET /api/v1/customer/services/{serviceId}/available-slots` | `frontend/src/features/booking/api.js`<br/>`frontend/src/pages/customer/CreateBookingPage.jsx` | Khi khách chọn gói dịch vụ tại `/customer/bookings/new`, FE tự động gọi UC38 để hiển thị các khung giờ rảnh khả dụng của NCC; bấm vào ca rảnh sẽ tự điền ngày & giờ hẹn. |
| **UC51** — Quét hết hạn đơn & Nhả lịch rảnh | Thuỷ | `POST /api/v1/admin/bookings/expire-overdue` | `frontend/src/features/booking/api.js`<br/>`frontend/src/pages/admin/AdminOverviewPage.jsx` | Trang `/admin` có nút **"Chạy quét đơn quá hạn (UC51)"** gọi trực tiếp `AdminBookingController` và hiển thị 4 chỉ số kết quả: `providerExpiredCount`, `depositExpiredCount`, `totalExpiredCount`, `totalErrors`. |
| **UC27** — Đăng nhập Quản trị viên | Lâm | `POST /api/auth/login/admin` | `frontend/src/features/auth/api.js`<br/>`frontend/src/features/auth/components/LoginForm.jsx` | Bổ sung công tắc chọn cổng **Khách hàng / Đối tác (UC02)** hoặc **Quản trị viên (UC27)** ngay trên biểu mẫu `/login`. |

---

## 6. Ghi Chú Phối Hợp Dành Cho TLam (FE1), Cường (BE2) & Thuỷ (BE3) Ở Tuần 2–3

### 6.1. Dành cho TLam (FE1 — Khu vực Khách hàng & Admin cơ bản)
1. **Hàm API đã có sẵn để tái sử dụng**:
   - `getServiceAvailableSlots(serviceId, { from, to })` trong `frontend/src/features/booking/api.js` (UC38).
   - `getBookableServices()` trong `frontend/src/features/booking/api.js` đã kết nối với `GET /api/customer/services` (UC05 của Cường).
   - `getActiveCategories()` trong `frontend/src/features/catalog/api.js` đã kết nối với `GET /api/public/categories/tree` (UC30 của Cường).
2. **Đồng bộ hiển thị vòng đời đơn hàng**:
   - Trang `/customer/bookings` (`CustomerBookingsPage.jsx`) đã được bổ sung đủ 7 tab trạng thái (`ALL`, `PENDING_PROVIDER`, `PENDING_DEPOSIT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) và hiển thị đồng bộ các mốc `acceptedAt`, `depositDueAt`, `startedAt`, `completedAt`, `balanceDueAt` khớp với màn hình Nhà cung cấp.

### 6.2. Dành cho Cường (BE2) & Thuỷ (BE3)
1. **Điểm lưu ý về tiền tố URL (`/api/...` vs `/api/v1/...`)**:
   - Các Controller của Thuỷ (`CustomerBookingController`, `ProviderBookingController`, `AdminBookingController`, `ProviderAvailabilityController`, `CustomerServiceAvailabilityController`) đều đã hỗ trợ song song cả `/api/v1/...` và `/api/...`.
   - Các Controller của Cường (`ProviderProfileController`, `ProviderServiceController`) hiện dùng `/api/provider/profile` và `/api/provider/services`. Frontend của Minh đã cập nhật khớp chính xác với các đường dẫn này.
2. **Endpoint danh sách đơn của NCC (UC40)**:
   - Hiện tại `ProviderBookingController` đã có đủ 4 API hành động (`POST accept`, `POST reject`, `POST start`, `POST complete`). Khi Cường hoặc Thuỷ bổ sung thêm `GET /api/v1/provider/bookings` (trả `PageResponse<BookingResponse>` hoặc `List<BookingResponse>`), trang `/provider/bookings` của Minh sẽ tự động hiển thị danh sách đơn từ Database mà không cần chỉnh sửa lại FE.
   - Trong thời gian chờ API `GET` danh sách, mọi người có thể dùng ngay khung **"Thao tác nhanh theo ID đơn"** ở đầu trang `/provider/bookings`: chỉ cần nhập `bookingId` (ví dụ đơn vừa tạo từ phía Khách hàng) và bấm `Accept` / `Reject` / `Start` / `Complete` để gọi thẳng xuống Backend thật.

---

## 7. Kịch Bản Diễn Tập Thông Luồng P0 (Khách → NCC → Admin)

1. **Bước 1 — Nhà cung cấp mở lịch rảnh (UC20)**:
   - Đăng nhập quyền Nhà cung cấp (hoặc bấm nút **Khu vực NCC** tại `/login`) → vào `/provider/availability`.
   - Bấm **"Mở ca nhanh 3 ngày tới (Batch)"** hoặc **"+ Thêm khoảng lịch"** để mở ca rảnh cho ngày mai.
2. **Bước 2 — Khách hàng xem lịch rảnh & đặt lịch (UC38 & UC08)**:
   - Chuyển sang quyền Khách hàng → vào `/customer/bookings/new`.
   - Chọn gói dịch vụ, bấm vào một **Khung giờ rảnh khả dụng của Nhà cung cấp (UC38)** để điền nhanh ngày giờ, chọn địa chỉ và bấm **"Xác nhận đặt lịch"**. Đơn mới sẽ ở trạng thái `PENDING_PROVIDER` kèm đồng hồ đếm ngược `requestExpiresAt`.
3. **Bước 3 — Nhà cung cấp Chấp nhận hoặc Từ chối đơn (UC21)**:
   - Vào `/provider/bookings` → lọc tab **Chờ xác nhận (UC21)**.
   - Bấm **"Chấp nhận"** để chuyển đơn sang `PENDING_DEPOSIT` (thiết lập `acceptedAt` và `depositDueAt`), hoặc bấm **"Từ chối"** để mở hộp thoại nhập lý do bắt buộc (`RejectBookingModal`) và chuyển đơn sang `REJECTED` (nhả lịch về `AVAILABLE`).
4. **Bước 4 — Khách hàng đặt cọc 30% & Nhà cung cấp Bắt đầu / Hoàn thành dịch vụ (UC22)**:
   - Trên thẻ đơn `PENDING_DEPOSIT` tại `/provider/bookings`, có thể bấm nút **"Dev: Mô phỏng khách đã cọc 30%"** để chuyển đơn sang `CONFIRMED`.
   - Với đơn `CONFIRMED` đã tới giờ hẹn (`now >= startsAt`), bấm **"Bắt đầu dịch vụ (UC22)"** → nhập ghi chú bắt đầu → đơn chuyển sang `IN_PROGRESS` (icon xoay `animate-spin`, ghi nhận `startedAt`).
   - Khi làm xong, bấm **"Hoàn thành dịch vụ (UC22)"** → nhập biên bản nghiệm thu → đơn chuyển sang `COMPLETED` (ghi nhận `completedAt` và `balanceDueAt = +24 giờ`).
5. **Bước 5 — Admin quét đóng các đơn quá hạn phản hồi / quá hạn đặt cọc (UC51)**:
   - Vào `/admin` → tại khối **Quét đóng đơn quá hạn & Nhả lịch rảnh tự động (UC51)**, bấm **"Chạy quét đơn quá hạn (UC51)"** để gọi `POST /api/v1/admin/bookings/expire-overdue` và kiểm tra bảng thống kê số đơn chuyển sang `EXPIRED`.
