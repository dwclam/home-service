# QUY TẮC THÀNH PHẦN & GIAO DIỆN FRONTEND (UI COMPONENT GUIDELINES)

Tài liệu này bổ sung cho [FE-guideline-lite (1).md](./FE-guideline-lite%20(1).md), quy định chi tiết cách xây dựng và tái sử dụng các thành phần giao diện (Button, Select/Dropdown, Input, Table, Modal, Filter Tabs) cũng như quy chuẩn ngôn ngữ hiển thị cho người dùng cuối (Anti-AI-Slop).

---

## 1. NGUYÊN TẮC NỘI DUNG HIỂN THỊ (ANTI-AI-SLOP)

1. **Chỉ hiển thị thông tin người dùng cuối (End-User) thực sự quan tâm:**
   - **Tuyệt đối không** đưa mã Use Case (`UC08`, `UC19`, `UC20`, `UC51`...), mã Business Rule (`BR-UC20-03`, `MD01`...), tên biến/trường dữ liệu (`startsAt`, `endsAt`, `customerNote`, `addressInstructions`...), đường dẫn API (`POST /api/v1/...`), tên Controller hay trạng thái kỹ thuật (`AVAILABLE`, `BLOCKED`, `PUBLISHED`, `DRAFT`, `EXPIRED`, `Version #0`, `ID #101`, `Snapshot`, `Batch`) lên giao diện.
   - **Không hiển thị** các banner giải thích kiến trúc hệ thống, thông báo chế độ Mock/Seed hay thanh công cụ debug trực tiếp trên màn hình người dùng.
2. **Bỏ các dòng chữ xám chú thích dư thừa:**
   - Tiêu đề trang (`h1`, `h2`), tiêu đề thẻ (`h3`) và tiêu đề Modal **không** kèm dòng mô tả phụ màu xám (`text-neutral-500`) bên dưới nếu tiêu đề đã tự giải thích rõ chức năng.
   - Không thêm dòng `hint` màu xám dưới mỗi ô nhập liệu (`FormField`) để giải thích những điều hiển nhiên (như số ký tự tối đa, kiểu số nguyên, v.v.). Chỉ hiển thị thông báo khi có lỗi (`error`).
3. **Không dùng ngoặc đơn `(...)` để giải thích kèm trong nhãn:**
   - Viết nhãn ngắn gọn, trực diện:
     - Đúng: `Mở nhận việc`, `Khóa lịch`, `Giá niêm yết`, `Thời lượng dự kiến`, `Tiền cọc giữ lịch`, `Lý do hủy đơn`.
     - Sai: `Mở nhận việc (AVAILABLE)`, `Giá niêm yết cố định (VND)`, `Tiền cọc (30%)`, `Lý do hủy đơn (Tùy chọn)`.

---

## 2. HỆ THỐNG NÚT BẤM (`Button`)

Sử dụng thống nhất component [`src/components/ui/Button.jsx`](../frontend/src/components/ui/Button.jsx) với bo góc chuẩn `rounded-md` (`8px`). Không tự ý trộn lẫn `rounded-full` và `rounded-md` cho các nút chức năng.

### 2.1. Các kiểu nút chuẩn (Variants)

| Variant | Giao diện | Khi nào sử dụng |
|---|---|---|
| `primary` | Nền `bg-primary-500`, chữ trắng | Hành động chính của trang, thẻ hoặc modal (tối đa **1 nút Primary** trong mỗi khu vực/nhóm thao tác). |
| `secondary` | Nền trắng, viền `border-neutral-200`, chữ `text-ink` | Hành động phụ đi kèm nút chính (`Hủy`, `Quay lại`, `Làm mới`, `Mở nhanh 3 ngày tới`). |
| `ghost` | Nền trong suốt, hover `bg-neutral-100`, chữ `text-neutral-600` | Thao tác phụ ít ưu tiên hơn trong thẻ hoặc thanh điều hướng (`Xem chi tiết`, `Lưu trữ`). |
| `danger` | Nền `bg-red-500`, chữ trắng | Hành động mang tính hủy bỏ/từ chối đơn (`Từ chối`, `Hủy đơn`). |
| `link` | Không nền, chữ `text-primary-500`, hover gạch chân | Liên kết điều hướng dạng văn bản. |

### 2.2. Kích thước nút (Sizes)
- `sm`: Cao `36px` (`h-9 px-3 text-xs`) — dùng trong thẻ danh sách, thanh công cụ nhỏ, header phụ.
- `md`: Cao `40px` (`h-10 px-4 text-[14px]`) — mặc định cho trang và modal.
- `lg`: Cao `48px` (`h-12 px-6 text-base`) — dùng cho nút submit chính của form lớn (Đăng nhập, Đăng ký, Đặt lịch).

### 2.3. Nút thao tác dạng Icon tối giản trong bảng (Table Icon Actions)
Đối với các thao tác lặp lại trên từng dòng của bảng dữ liệu (như **Sửa** và **Xóa** tại `/provider/availability`):
- Chỉ sử dụng **icon đơn thuần** (`Pencil` cho sửa, `Trash2` cho xóa, kích thước `w-4 h-4`).
- **Màu xám mờ** (`text-neutral-400 hover:text-neutral-600`), **không nền, không viền, không bo góc, không kèm chữ tên chức năng, không tô màu sặc sỡ**.
- Luôn có `aria-label` để đảm bảo khả năng truy cập:
  ```jsx
  <button
    type="button"
    onClick={onEdit}
    aria-label="Sửa"
    className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer bg-transparent border-0 rounded-none outline-none"
  >
    <Pencil className="w-4 h-4" />
  </button>
  ```

---

## 3. DROPDOWN & Ô CHỌN (`Select` & Menu Dropdown)

### 3.1. Form Select (`src/components/ui/Select.jsx`)
- Mọi thẻ `<select>` trong form phải dùng chung component [`Select`](../frontend/src/components/ui/Select.jsx) thay vì viết thẻ `<select>` thuần.
- Quy chuẩn đồng bộ với `Input`:
  - Chiều cao `40px` (`h-10`), bo góc `rounded-md` (`8px`), viền `border-neutral-200`, nền trắng.
  - Ẩn mũi tên mặc định của trình duyệt (`appearance-none`) và hiển thị icon `ChevronDown` (`w-4 h-4 text-neutral-400`) cố định bên phải (`right-3`).
  - Trạng thái focus: `focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20`.

### 3.2. Menu Dropdown (User Menu)
- Nút kích hoạt (Trigger): Cao `36px` (`h-9`), bo góc `rounded-md`, viền `border-neutral-200`, nền trắng, gồm avatar tròn nhỏ + tên + icon `ChevronDown`.
- Khung menu xổ xuống: `rounded-md bg-white border border-neutral-200 shadow-md py-1`, các mục bên trong dùng `px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50`.

---

## 4. BỘ LỌC TRẠNG THÁI & CHUYỂN CHẾ ĐỘ (FILTER TABS & SEGMENTED SWITCH)

Chỉ sử dụng **2 kiểu** duy nhất trên toàn hệ thống:

1. **Thanh tab lọc danh sách (Filter Tabs — dùng cho bảng/danh sách đơn, dịch vụ, lịch):**
   - Dùng nút `h-9 px-3.5 rounded-md text-xs font-medium transition-colors duration-150 shrink-0`.
   - Đang chọn (Active): `bg-primary-500 text-white`.
   - Chưa chọn (Inactive): `bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-ink`.
2. **Thanh chuyển đổi 2 lựa chọn trong Form (Segmented Switch — ví dụ: Địa chỉ đã lưu / Địa chỉ mới):**
   - Khung bao: `inline-flex rounded-md bg-neutral-100 border border-neutral-200 p-1`.
   - Nút con: `px-3 h-7 rounded text-xs font-semibold` — khi chọn dùng `bg-white text-ink shadow-xs`, khi không chọn dùng `text-neutral-600 hover:text-ink`.

---

## 5. DASHBOARD & BẢNG DỮ LIỆU (`DashboardLayout`, `DataTable`, `StatusBadge`)

1. **Tối giản Dashboard (Đặc biệt khu vực Admin):**
   - Không đặt các thẻ KPI giả lập hoặc thông tin kỹ thuật dư thừa (như ô `RBAC`, tỷ lệ làm tròn, ghi chú chuẩn badge).
   - Bố cục trang quản trị đi thẳng vào tiêu đề trang, nút thao tác nghiệp vụ cần thiết và bảng dữ liệu chính (`DataTable`).
2. **Thanh điều hướng bên trái (Sidebar):**
   - Chỉ hiển thị các mục điều hướng thực tế của người dùng (Icon + Tên mục), không gắn nhãn `UC...` hay các mục khóa `P1/P2`.
3. **Badge trạng thái (`StatusBadge`):**
   - Giữ đúng quy tắc: **không nền, không viền**, chỉ gồm icon Lucide (`w-3.5 h-3.5`) + chữ `text-xs font-semibold`.
