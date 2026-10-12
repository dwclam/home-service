# SƠ ĐỒ USE CASE — Nền tảng đặt dịch vụ tại nhà

**Version:** 1.0


> File này mô tả tất cả use case của hệ thống, actor tham gia và mô tả chi tiết
> các use case quan trọng. Dùng làm cơ sở để thiết kế API và DB.

---

## MỤC LỤC

1. [Actor](#1-actor)
2. [Danh sách use case](#2-danh-sách-use-case)
3. [Sơ đồ use case tổng quan](#3-sơ-đồ-use-case-tổng-quan)
4. [Mô tả chi tiết use case](#4-mô-tả-chi-tiết-use-case)
5. [Ma trận actor — use case](#5-ma-trận-actor--use-case)
6. [Ghi chú thiết kế](#6-ghi-chú-thiết-kế)

---

## 1. ACTOR

Hệ thống có **3 actor chính** (người dùng) và **1 actor phụ** (hệ thống ngoài).

### 1.1. Actor chính

| Actor | Mô tả | Đặc điểm |
|---|---|---|
| **Khách hàng** (Customer) | Người có nhu cầu đặt dịch vụ tại nhà | Đăng ký tự do, không cần duyệt |
| **Nhà cung cấp** (Provider) | Cá nhân/công ty cung cấp dịch vụ | Phải được Admin duyệt mới hoạt động |
| **Quản trị viên** (Admin) | Người vận hành nền tảng | Do hệ thống cấp, không đăng ký công khai |

### 1.2. Actor phụ

| Actor | Mô tả | Vai trò |
|---|---|---|
| **Cổng thanh toán** (Payment Gateway) | Hệ thống ngoài (VNPay, MoMo) | Xử lý giao dịch, callback kết quả |
| **Dịch vụ email** (Email Service) | Hệ thống ngoài (SMTP/SendGrid) | Gửi email xác thực, reset password |

> **Ghi chú:** Actor phụ không tương tác trực tiếp với use case chính mà thông qua
> hệ thống. Trong sơ đồ có thể vẽ bằng đường nét đứt hoặc bỏ qua để đơn giản.

---

## 2. DANH SÁCH USE CASE

### 2.1. Nhóm Khách hàng (Customer)

| Mã | Use case | Ưu tiên |
|---|---|---|
| UC01 | Đăng ký tài khoản | Cao |
| UC02 | Đăng nhập | Cao |
| UC03 | Đăng xuất | Trung bình |
| UC04 | Quên mật khẩu | Trung bình |
| UC05 | Tìm kiếm dịch vụ | Cao |
| UC06 | Xem chi tiết dịch vụ | Cao |
| UC07 | Xem hồ sơ nhà cung cấp | Cao |
| UC08 | **Đặt lịch dịch vụ** | Cao |
| UC09 | Thanh toán đặt cọc | Cao |
| UC10 | Quản lý đơn hàng | Cao |
| UC11 | Hủy đơn hàng | Cao |
| UC12 | **Đánh giá dịch vụ** | Cao |
| UC13 | Chat với nhà cung cấp | Trung bình |
| UC14 | Quản lý profile | Trung bình |
| UC15 | Xem thông báo | Trung bình |

### 2.2. Nhóm Nhà cung cấp (Provider)

| Mã | Use case | Ưu tiên |
|---|---|---|
| UC16 | Đăng ký làm nhà cung cấp | Cao |
| UC17 | Đăng nhập | Cao |
| UC18 | Quản lý hồ sơ NCC | Cao |
| UC19 | **Quản lý dịch vụ** | Cao |
| UC20 | **Quản lý lịch rảnh** | Cao |
| UC21 | **Nhận / Từ chối đơn** | Cao |
| UC22 | **Cập nhật trạng thái đơn** | Cao |
| UC23 | Xem thu nhập | Trung bình |
| UC24 | Chat với khách hàng | Trung bình |
| UC25 | Xem đánh giá | Trung bình |
| UC26 | Xem thông báo | Trung bình |

### 2.3. Nhóm Quản trị viên (Admin)

| Mã | Use case | Ưu tiên |
|---|---|---|
| UC27 | Đăng nhập admin | Cao |
| UC28 | **Duyệt nhà cung cấp** | Cao |
| UC29 | Quản lý người dùng | Cao |
| UC30 | Quản lý danh mục | Trung bình |
| UC31 | Quản lý đơn hàng | Cao |
| UC32 | **Xem dashboard thống kê** | Cao |
| UC33 | Xử lý khiếu nại | Trung bình |
| UC34 | Xem báo cáo | Trung bình |

**Tổng cộng:** 34 use case.
