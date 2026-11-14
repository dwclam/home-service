# ADM-01 — Cấp tài khoản admin nội bộ

Dùng lệnh thủ công `backend/create-admin.sh` để đọc `ADMIN_EMAIL`, `ADMIN_PASS` và cấu hình database từ `backend/.env`, tạo identity/account rồi kết thúc. Backend khởi động bình thường không thực hiện cấp admin; không có cờ seed hay endpoint đăng ký admin.

## 1. Chuẩn bị

- Java 21 và Maven Wrapper của dự án; Bash để chạy script (Windows có thể dùng Git Bash).
- Database PostgreSQL đã có schema phù hợp với entity. Lệnh không tạo bảng, không chạy migration và không dùng `ddl-auto=update`, bất kể cấu hình backend hiện tại.
- Chọn email chưa được tài khoản hoặc hồ sơ NCC giữ. Người cấp phải kiểm tra quyền sở hữu email; `email_verified_at` sẽ là thời điểm cấp nội bộ.

Điền trong `backend/.env` trên máy của bạn:

```properties
DB_URL=jdbc:postgresql://<host>:<port>/<database>?sslmode=require
DB_USERNAME=<database-user>
DB_PASSWORD=<database-password>
ADMIN_EMAIL=<email-admin-chua-duoc-su-dung>
ADMIN_PASS=<mat-khau-admin-do-ban-chon>
```

File `.env` được Git bỏ qua. `.env.example` chỉ chứa các biến rỗng. Không commit mật khẩu hoặc hash thật. Có thể xóa `ADMIN_PASS` sau khi cấp thành công; tài khoản sử dụng hash đã lưu trong database.

Định dạng `.env` là Java `.properties`, đọc UTF-8: dùng `KEY=value`, không dùng `export` và không bọc giá trị bằng dấu nháy của shell. Các ký tự `$`, `#`, dấu nháy và `=` trong phần giá trị được đọc như dữ liệu, không được thực thi. Dấu gạch chéo ngược phải viết `\\`; khoảng trắng đầu giá trị cần escape theo `.properties`. Không dùng tham chiếu `${...}` trong các giá trị của lệnh này. Biến môi trường của tiến trình có cùng tên sẽ ưu tiên hơn nội dung file.

## 2. Chạy chủ động

Từ thư mục `backend`:

```bash
./create-admin.sh
```

Hoặc từ thư mục gốc dự án:

```bash
./backend/create-admin.sh
```

Script luôn chuyển về thư mục `backend`. Script biên dịch và lấy runtime classpath bằng Maven rồi chạy entry point Java riêng `CreateAdmin`. Không chạy Spring Boot, server HTTP, scheduler hoặc SMTP; không cần JWT secrets hay cấu hình SMTP. Lần đầu Maven có thể cần tải dependency. Không truyền email/mật khẩu qua đối số lệnh.

Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte UTF-8; không trim mật khẩu. Email được chuẩn hóa bằng đúng `EmailRequest` của ứng dụng: `strip().toLowerCase(Locale.ROOT)` rồi kiểm tra định dạng/độ dài.

Lệnh dùng chung `PasswordConfig.passwordEncoder()` với ứng dụng. Chỉ hash được ghi vào `password_hash`, không in mật khẩu/hash hay chi tiết SQL/JDBC ra terminal. Thành công in ID account và trả exit code `0`:

```text
Đã tạo tài khoản ADMIN, ID: <id-vua-tao>
```

Lỗi trả exit code `1`. Nếu email đã được giữ, kể cả ADMIN đã tồn tại hoặc hồ sơ NCC REJECTED, lệnh từ chối và không ghi đè vai trò, mật khẩu hay trạng thái. Lệnh không dọn đăng ký pending để lấy email cấp admin.

## 3. Giao dịch và dữ liệu tạo ra

Lệnh kiểm tra email trong `email_identities`, `accounts`, `provider_applications`; sau đó insert identity trước account trong cùng JDBC transaction. Entity `EmailIdentity` không có `account_id`; FK ghép của `Account` trỏ tới `(email, account_type)` của identity. PK email bảo vệ trường hợp hai yêu cầu cùng tạo mới. Lỗi ở insert account rollback cả identity.

| Bảng | Giá trị |
| --- | --- |
| `email_identities` | Email chuẩn hóa, loại `ADMIN`, `created_at`/`updated_at` |
| `accounts` | ID tự sinh, cùng email/loại, hash mật khẩu, tên `Admin`, `ACTIVE`, `email_verified_at`, `must_change_password=false`, `created_at`/`updated_at` |

Các timestamp dùng cùng một mốc UTC. Không thay đổi schema hoặc các account/hồ sơ có sẵn.

Nếu lỗi kết nối xảy ra lúc commit, kết quả có thể chưa rõ; kiểm tra database trước khi chạy lại. Lệnh chạy lại luôn từ chối email đã tồn tại, không đặt lại mật khẩu.

## 4. Kiểm tra kết quả

Có thể dùng truy vấn chỉ đọc dưới đây trong công cụ database, thay placeholder bằng email đã chuẩn hóa:

```sql
SELECT a.id, a.email, a.account_type, a.display_name, a.status,
       a.email_verified_at, a.must_change_password, a.created_at,
       i.account_type AS identity_type
FROM accounts a
JOIN email_identities i ON i.email = a.email AND i.account_type = a.account_type
WHERE a.email = '<email-admin-da-chuan-hoa>';
```

Mong đợi: đúng một account, hai loại đều `ADMIN`, `status=ACTIVE`, `email_verified_at` có giá trị và `must_change_password=false`. Không cần truy vấn/in hash để kiểm tra.

Sau khi cấp tài khoản và bật backend, lấy CSRF rồi gọi `POST /api/auth/login/admin`. Bộ test Maven có kiểm thử tích hợp cho login admin, refresh, `/me` và logout. Xem [hướng dẫn UC27](../tai_lieu_api/UC27_DANG_NHAP_ADMIN.md).

## 5. Kiểm thử và giới hạn

Từ `backend`:

```bash
./mvnw -Dspring.config.import= -Dspring.mail.host=127.0.0.1 -Dspring.mail.port=1 -Dtest=AdminAccountProvisionerTests test
```

Test dùng H2 trong bộ nhớ ở PostgreSQL mode, schema tạo từ entity, Clock xác định và dữ liệu giả. Bao phủ tạo đủ cột, chuẩn hóa email, hash khớp encoder ứng dụng, mật khẩu Unicode/giới hạn byte, email đã giữ/khác loại/lịch sử NCC, rollback insert thứ hai, hai lượt cấp đồng thời trên hai kết nối, đọc file UTF-8 và ưu tiên biến môi trường, output không chứa bí mật. Bộ test không nạp `.env` thật để cấp admin.

H2 không chứng minh đầy đủ SQL, kiểu enum, constraint hoặc hành vi khóa của PostgreSQL. Chưa chạy lệnh trên PostgreSQL test riêng hoặc Neon; schema thực tế cần được đối chiếu trước khi người vận hành chủ động cấp tài khoản. Không có Testcontainers/dependency mới trong task này.
