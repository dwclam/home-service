# QUY ĐỊNH FE CƠ BẢN — Nền tảng dịch vụ tại nhà

**Version:** 1.0 rút gọn (2026-10-08)
**Stack:** React + Vite + Tailwind CSS + Ant Design 5 + Lucide Icons
**Phạm vi:** chỉ thống nhất màu sắc, cỡ chữ, hiệu ứng, bố cục. Chi tiết component xem bản đầy đủ `FE-guideline-v3.md`.

---

## 1. MÀU SẮC

Không hardcode màu. Dùng token dưới đây.

### Primary — xanh tin cậy

| Token | Hex | Dùng cho |
|---|---|---|
| primary-500 | #3B82F6 | Nút chính, logo |
| primary-600 | #2563EB | Nút hover, link |
| primary-700 | #1D4ED8 | Nút active |

### Ink — xanh navy đậm

| Token | Hex | Dùng cho |
|---|---|---|
| ink | #0B1437 | Heading chính, nền CTA |

### Neutral — xám slate

| Token | Hex | Dùng cho |
|---|---|---|
| neutral-50 | #F8FAFC | Nền section xen kẽ |
| neutral-100 | #F1F5F9 | Nền hover nhẹ |
| neutral-200 | #E2E8F0 | Viền mặc định |
| neutral-500 | #64748B | Chữ phụ |
| neutral-700 | #334155 | Chữ chính |

### Màu trạng thái (badge KHÔNG nền, chỉ icon + chữ)

| Trạng thái | Màu chữ | Màu icon |
|---|---|---|
| Chờ xác nhận | #B45309 (warning-700) | #D97706 |
| Đã xác nhận | #0369A1 (info-700) | #0284C7 |
| Đang thực hiện | #2563EB (primary-600) | #2563EB |
| Hoàn thành | #047857 (success-700) | #059669 |
| Đã hủy | #64748B (neutral-500) | #64748B |
| Từ chối | #DC2626 (danger-600) | #DC2626 |

> Chữ badge dùng tông đậm (-700) để đủ tương phản trên nền trắng. Icon giữ tông -600.

### Accent

| Token | Hex | Dùng cho |
|---|---|---|
| accent-500 | #F97316 | Chỉ dùng cho sao đánh giá |

---

## 2. CỠ CHỮ

3 font, mỗi font một vai trò:

| Vai trò | Font |
|---|---|
| Logo | Quicksand 700 |
| Heading h1, h2 | Fira Sans 700 |
| Còn lại (body, button, h3/h4, input) | Be Vietnam Pro |

| Token | Cỡ | Dùng cho |
|---|---|---|
| text-display | 76px | Tiêu đề hero desktop |
| text-h1 | 58px | Tiêu đề hero tablet |
| text-h2 | 38px | Tiêu đề section |
| text-h3 | 17px | Tiêu đề card |
| text-body | 15px | Đoạn văn |
| text-body-sm | 14px | Chữ phụ, nút bấm |
| text-caption | 13px | Label, chú thích |

Quy tắc: chữ body không dưới 14px. Không dùng quá 3 font trên một trang.

---

## 3. KHOẢNG CÁCH, BO GÓC, BÓNG ĐỔ

### Spacing (bội số 4px)

| Dùng cho | Giá trị |
|---|---|
| Padding card | 20–24px |
| Cách nhau giữa các field trong form | 20px |
| Padding trang (mobile / tablet / desktop) | 16px / 24px / 32px |
| Cách nhau giữa các section (desktop / mobile) | 80px / 80px |

### Bo góc

| Giá trị | Dùng cho |
|---|---|
| 8px | Input, card nhỏ, nút mặc định |
| 12px | Card lớn, modal |
| 9999px | Avatar, nút hero, tab lọc |

### Bóng đổ

- Card thường: bóng mờ nhẹ màu slate
- Card hover / dropdown: bóng đậm hơn một chút
- Modal: bóng lớn nhất
- Không dùng bóng đen đậm, tối đa 2 lớp bóng

---

## 4. COMPONENT CƠ BẢN

### Nút bấm — 5 loại

| Loại | Kiểu | Dùng khi |
|---|---|---|
| Primary | Nền primary-500, chữ trắng | Hành động chính (mỗi section chỉ 1 nút) |
| Secondary | Nền trắng, viền neutral-200 | Hành động phụ |
| Ghost | Trong suốt, chữ primary-600 | Hành động nhẹ |
| Danger | Nền danger-500, chữ trắng | Xóa, hủy |
| Link | Chữ primary-600 gạch chân khi hover | Link trong đoạn văn |

Cỡ: sm (36px), md (40px, mặc định), lg (48px).

### Input

- Cao 40px, viền neutral-200, bo 8px
- Label nằm trên input, field bắt buộc có dấu * đỏ
- Focus: viền primary-500; lỗi: viền đỏ + chữ lỗi đỏ bên dưới

### Card

- Nền trắng, viền neutral-200, bo 8–12px, bóng nhẹ, padding 20–24px
- Hover (nếu bấm được): bóng đậm hơn, không dùng hiệu ứng nảy lên

### Badge trạng thái

- **Không nền, không viền.** Chỉ icon Lucide + chữ màu, chữ in đậm (semibold)
- Trạng thái "Đang thực hiện" là duy nhất được xoay icon (animate-spin)

---

## 5. HIỆU ỨNG

| Loại | Thời gian |
|---|---|
| Hover nút | 150ms |
| Hover card, dropdown | 150ms |
| Mở modal | 250–300ms |

Được dùng: mờ dần, trượt nhẹ, typewriter (chỉ ở hero), marquee tự chạy (hover thì dừng).
Cấm: nảy (bounce), rung (shake), nhấp nháy liên tục, parallax.
Tôn trọng chế độ giảm chuyển động của người dùng (prefers-reduced-motion).

---

## 6. BỐ CỤC

- **Container:** giữa trang, rộng tối đa 1280px, padding ngang 16px (mobile) → 32px (desktop)
- **Header:** cao 64px, sticky, nền trắng mờ, logo trái + menu giữa + nút phải
- **Section:** padding dọc 80px (desktop), nền xen kẽ trắng / neutral-50
- **Hero:** 2 cột — trái là tiêu đề + nút CTA, phải là ảnh/marquee
- **Dashboard (khách/thợ/admin):** sidebar trái 240px + topbar 64px + nội dung padding 24px; mobile thì sidebar thành drawer
- **Footer:** nền neutral-50, gồm cột brand + cột link + dòng copyright

---

## 7. CẤM

- ❌ Gradient nhiều màu, bóng đen đậm
- ❌ Emoji trong UI
- ❌ Badge trạng thái có nền hoặc viền
- ❌ Hardcode màu sắc, hardcode tên thương hiệu
- ❌ Animation quá 300ms (trừ marquee/typewriter)
