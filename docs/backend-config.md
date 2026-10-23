# Nestify — Cấu hình backend trước khi làm đăng nhập

Phạm vi hiện tại: cấu hình Security, CORS, CSRF, hash mật khẩu, lỗi JSON và nền tảng migration. Chưa có bảng tài khoản, bộ lọc xác thực phiên hoặc API đăng nhập/đăng xuất.

## 1. Tổ chức mã nguồn

| Vị trí | Trách nhiệm |
| --- | --- |
| `config/SecurityConfig.java` | Khai báo filter chain, quyền truy cập, PasswordEncoder và nơi lưu mã CSRF. |
| `config/CorsConfig.java` | Cho phép frontend gọi API từ các origin đã cấu hình. |
| `config/properties/AppSecurityProperties.java` | Đọc và kiểm tra các giá trị `app.security.*`. |
| `security/SecurityErrorHandler.java` | Trả lỗi xác thực/phân quyền/CSRF từ filter chain. |
| `common/dto/ApiError.java` | Dạng lỗi JSON chung: `code`, `message`, `fieldErrors`. |
| `common/exception/GlobalExceptionHandler.java` | Chuẩn hóa lỗi HTTP và validation của Spring MVC. |
| `auth/controller/CsrfController.java` | Cấp mã CSRF để frontend gửi request thay đổi dữ liệu. |
| `system/HealthController.java` | Kiểm tra ứng dụng qua `/api/health`. |

Spring không bắt buộc tên package `config` hoặc `security`; các lớp cần nằm trong phạm vi component scan. Nestify chọn `config` cho cấu hình bean, `security` cho xử lý xác thực/quyền, `auth` cho nghiệp vụ tài khoản. Đây cũng là cách phân tách thấy trong [JHipster](https://github.com/jhipster/jhipster-sample-app/blob/main/src/main/java/io/github/jhipster/sample/config/SecurityConfiguration.java) và [ThingsBoard](https://github.com/thingsboard/thingsboard/blob/master/application/src/main/java/org/thingsboard/server/config/ThingsboardSecurityConfiguration.java). Tham khảo cách tổ chức package, không sao chép cơ chế JWT của các dự án đó.

## 2. Biến môi trường

Kết nối Neon tiếp tục lấy từ `backend/.env`. Giữ nguyên `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` đã kết nối thành công; URL JDBC có `sslmode=require`. Không commit `.env`.

| Biến | Mặc định | Cách dùng |
| --- | --- | --- |
| `SERVER_PORT` | `8080` | Cổng API. |
| `FRONTEND_ORIGINS` | `http://localhost:5173` | Danh sách origin chính xác, phân tách bằng dấu phẩy, không có dấu `/` cuối. Không dùng `*` với cookie. |
| `COOKIE_SECURE` | `false` | Cookie CSRF chỉ gửi qua HTTPS khi `true`; đặt `true` khi triển khai HTTPS. |
| `SHOW_SQL` | `false` | Bật khi cần xem SQL ở môi trường phát triển. |
| `FLYWAY_ENABLED` | `false` | Bật sau khi có migration SQL đầu tiên đã được review. |

Các biến mới đều có mặc định nên `.env` hiện có vẫn chạy được. `localhost` và `127.0.0.1` là hai host khác nhau; thống nhất dùng `localhost` cho cả frontend và backend khi phát triển. Cấu hình cookie `SameSite=Lax` hiện dành cho FE–BE cùng site, kể cả khác cổng ở localhost; nếu triển khai khác site, cần thiết kế lại cookie/CSRF tương ứng.

## 3. Quy tắc Security đang áp dụng

| Request | Quyền |
| --- | --- |
| `GET /api/health` | Công khai, trả trạng thái ứng dụng. |
| `GET /api/auth/csrf` | Công khai, trả mã CSRF. |
| `POST /api/auth/login` | Cho qua bước phân quyền nhưng vẫn kiểm tra CSRF. Chưa có controller đăng nhập nên request hợp lệ về CSRF hiện trả `404`. |
| `/api/admin/**` | `ROLE_ADMIN`. |
| `/api/provider/**` | `ROLE_PROVIDER`. |
| `/api/customer/**` | `ROLE_CUSTOMER`. |
| Các request khác | Cần xác thực. |

Vai trò được lấy từ xác thực phía backend khi triển khai đăng nhập; frontend không tự cấp vai trò. Kiểm tra sở hữu tài nguyên vẫn phải làm trong nghiệp vụ. Endpoint đăng ký/OTP sẽ được mở đúng method/path khi triển khai; không mở toàn bộ `/api/auth/**`.

Đã tắt form login, HTTP Basic, logout mặc định, request cache và tài khoản `user` tự sinh. `SessionCreationPolicy.STATELESS` có nghĩa không lưu xác thực vào `HttpSession`/`JSESSIONID`; phiên nghiệp vụ trong `account_sessions` sẽ được kiểm tra qua bộ lọc riêng ở bước đăng nhập.

PasswordEncoder dùng `PasswordEncoderFactories.createDelegatingPasswordEncoder()`. Mật khẩu được hash bằng `encode`, kiểm tra bằng `matches`; giữ nguyên chuỗi có tiền tố thuật toán khi lưu vào database. API JSON không trả hash mật khẩu.

## 4. Hợp đồng CSRF cho TLam

React gọi API với cookie (`withCredentials: true` cho Axios hoặc `credentials: 'include'` cho fetch).

1. Khi mở ứng dụng, gọi `GET /api/auth/csrf`. Server đặt cookie `XSRF-TOKEN` với `HttpOnly`, `SameSite=Lax`, path `/`, đồng thời trả JSON chứa `headerName` và `token`.
2. Giữ `token` từ JSON trong bộ nhớ và gửi theo header có tên `headerName` khi gọi POST/PUT/PATCH/DELETE. Không đọc cookie bằng JavaScript và không dùng giá trị cookie thay token trong JSON: token trả về đã được che bằng cơ chế XOR của Spring.
3. Khi luồng đăng nhập/đăng xuất được triển khai, gọi lại endpoint CSRF sau mỗi lần thành công. Backend của hai luồng này phải vô hiệu mã CSRF cũ bằng cơ chế tương ứng của Spring, cùng với việc cấp/thu hồi phiên nghiệp vụ.

Ví dụ hợp đồng bằng fetch; API login bên dưới là bước triển khai tiếp theo:

```javascript
const baseUrl = 'http://localhost:8080';
const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
  credentials: 'include',
});
if (!csrfResponse.ok) throw new Error('Không lấy được mã CSRF');
const { headerName, token } = await csrfResponse.json();

const response = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', [headerName]: token },
  body: JSON.stringify({ email, password }),
});
```

Thiếu/sai mã CSRF trả `403 / CSRF_INVALID`; chưa xác thực trả `401 / AUTHENTICATION_REQUIRED`; thiếu vai trò trả `403 / ACCESS_DENIED`. Request không an toàn có thể bị CSRF từ chối trước bước xác thực. Frontend phân biệt bằng `code`, không tự thử lại mọi thao tác ghi sau lỗi mạng.

Tham khảo: [Spring Security CORS](https://docs.spring.io/spring-security/reference/7.0/servlet/integrations/cors.html), [CSRF](https://docs.spring.io/spring-security/reference/7.0/servlet/exploits/csrf.html), [PasswordEncoder](https://docs.spring.io/spring-security/reference/7.0/features/authentication/password-storage.html).

## 5. Migration và kiểm tra

Đã thêm starter Flyway của Spring Boot 4 và module PostgreSQL. `ddl-auto: validate` kiểm tra mapping, không tự thay schema. Flyway hiện tắt vì chưa viết migration nghiệp vụ. Khi làm bảng tài khoản, thêm migration vào `backend/src/main/resources/db/migration`, review SQL rồi bật `FLYWAY_ENABLED=true`. Nếu bật khi chưa có thư mục migration, ứng dụng dừng với lỗi cấu hình; không âm thầm coi database đã được khởi tạo. Database đã dùng chung thì thêm migration mới khi thay đổi, không sửa migration đã chạy. `clean` bị vô hiệu để tránh xóa schema ngoài ý muốn.

Chạy từ `backend`:

```bash
./mvnw test
```

Các test hiện dùng profile `test` với H2 trong bộ nhớ, không kết nối Neon. Kiểm tra health, quyền truy cập, lỗi JSON, CORS, CSRF cookie/header thực và PasswordEncoder. H2 chỉ kiểm tra cấu hình này; khi thêm native ENUM/migration PostgreSQL, cần kiểm tra riêng trên PostgreSQL trước khi áp dụng Neon.

Chạy ứng dụng với cấu hình Neon hiện có:

```bash
./mvnw spring-boot:run
```

Bước tiếp theo: tạo migration và entity `email_identities`, `accounts`, `account_sessions`, bộ lọc xác thực phiên, rồi API login/me/logout. Chỉ sau bước đó mới có thể đăng nhập thật.
