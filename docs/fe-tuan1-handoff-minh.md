# Nestify — Tài Liệu Bàn Giao Frontend Tuần 1 (Minh — FE2)

**Ngày cập nhật:** 31/10/2026  
**Người thực hiện:** Minh (FE2 — Khu vực Nhà cung cấp & Admin vận hành)  
**Đối tượng sử dụng tài liệu:**
- **TLam (FE1):** Sử dụng các Component UI dùng chung (`DashboardLayout`, `DataTable`, `Pagination`, `StatusBadge`, `EmptyState`, `ProtectedRoute`) và phối hợp luồng Khách hàng (UC08, UC11).
- **Cường (BE):** Đối chiếu hợp đồng Request/Response cho **UC18 (Hồ sơ NCC)**, **UC19 (Dịch vụ NCC)** và **UC30 (Danh mục hoạt động)**.
- **Thuỷ (BE):** Đối chiếu hợp đồng Request/Response cho **UC20 (Lịch rảnh NCC)** và nghiệm thu tích hợp **UC08 (Đặt lịch)**, **UC11 (Khách hủy đơn)**.
- **Lâm & Cả nhóm:** Hướng dẫn chạy demo và kiểm tra phân quyền theo vai trò cuối Tuần 1.

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
3. **Khu vực Admin:** Vào phiên `ADMIN` tại `/admin` để kiểm tra `DashboardLayout` ở chế độ Quản trị viên và bảng đối chiếu 6 trạng thái `StatusBadge`.
