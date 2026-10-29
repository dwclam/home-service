# Nestify — Cấu hình backend và bảo mật JWT

**Cập nhật:** 27/10/2026. Backend hiện có đăng ký/OTP và xác thực khách hàng bằng JWT access + refresh. Chi tiết luồng, request/response và cách frontend tích hợp nằm trong [customer-auth.md](customer-auth.md). Các chức năng NCC/admin, reset mật khẩu và khóa tài khoản vẫn triển khai sau.

## 1. Tổ chức mã nguồn

Nestify đặt cấu hình bean trong `config`, xử lý xác thực/quyền chung trong `security`, nghiệp vụ đăng ký/đăng nhập trong `auth`. Các package đều nằm dưới `com.homeservice` để Spring quét.

| Vị trí | Trách nhiệm |
| --- | --- |
| `config/SecurityConfig.java` | Filter chain Bearer JWT, quyền URL, PasswordEncoder, CSRF và chế độ không dùng HttpSession. |
| `config/JwtConfig.java` | Encoder/decoder và hai khóa HS256 riêng cho access/refresh; kiểm tra chữ ký và claim. |
| `config/properties/JwtProperties.java` | Đọc `app.jwt.*`, kiểm tra issuer/khóa có giá trị và giới hạn TTL; kiểm tra định dạng/độ dài khóa thực hiện trong JwtConfig. |
| `config/CorsConfig.java`, `config/properties/AppSecurityProperties.java` | Origin được phép, header, credential và thuộc tính Secure của cookie. |
| `config/AuthConfig.java`, `config/properties/AuthProperties.java` | Clock UTC và cấu hình giới hạn OTP. |
| `auth/controller/CustomerAuthController.java` | Đăng ký, OTP, login, refresh, `/me`, logout; đặt/xóa cookie và trả DTO. |
| `auth/controller/CsrfController.java` | Trả token CSRF đã che trong JSON, đặt cookie CSRF. |
| `auth/service/CustomerAuthService.java` | Đăng ký/đăng ký lại CUSTOMER pending; ràng buộc OTP với token đăng ký; kiểm tra điều kiện login. |
| `auth/service/JwtTokenService.java` | Tạo/ký JWT và xác minh refresh JWT; không truy vấn database. |
| `auth/service/RefreshTokenService.java` | Rotation, chống reuse và thu hồi refresh token trong transaction. |
| `auth/entity/RefreshToken.java`, `auth/repository/RefreshTokenRepository.java` | Mapping `refresh_tokens`, tìm token, thu hồi chuỗi token. |
| `security/RefreshTokenCookieService.java` | Cookie refresh JWT HttpOnly. |
| `security/LoginRateLimiter.java`, `config/properties/LoginRateLimitProperties.java` | Giới hạn login theo cặp email–IP và tổng theo IP trước bước kiểm tra mật khẩu. |
| `security/CurrentAccount.java` | Principal của request hiện tại, lấy ID/role từ access JWT. |
| `security/SecurityErrorHandler.java` | Lỗi JSON từ filter xác thực/quyền/CSRF. |
| `common/exception/GlobalExceptionHandler.java`, `common/dto/ApiError.java` | Lỗi nghiệp vụ và validation theo `{code, message, fieldErrors}`. |
| `integration/mail/SmtpEmailService.java` | Gửi OTP qua SMTP. |
| `system/HealthController.java` | `GET /api/health`. |

DTO API dùng class thường với constructor/getter/setter. Các record cấu hình và `TokenPair` nội bộ vẫn giữ nguyên. Chi tiết trách nhiệm từng file và luồng gọi xem [hướng dẫn xác thực](customer-auth.md).

## 2. Dependency JWT trong Maven

[pom.xml](../backend/pom.xml) khai báo:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security-oauth2-resource-server</artifactId>
</dependency>
```

Starter kéo theo module Resource Server của Spring Boot, `spring-security-oauth2-resource-server`, `spring-security-oauth2-jose` và thư viện `nimbus-jose-jwt`. Code dùng `NimbusJwtEncoder`/`NimbusJwtDecoder` thông qua API Spring Security; không cần khai báo thêm JJWT cho cách triển khai này. Version được quản lý theo Spring Boot trong POM.

`oauth2ResourceServer(...jwt(...))` cung cấp bộ lọc xác thực Bearer JWT. Ứng dụng tự cấp JWT sau khi kiểm tra email/mật khẩu; cấu hình này không đồng nghĩa đã triển khai đăng nhập Google hoặc một OAuth authorization server đầy đủ.

## 3. Biến môi trường

Các biến được ánh xạ trong [application.yaml](../backend/src/main/resources/application.yaml). Mẫu đầy đủ nằm ở [backend/.env.example](../backend/.env.example). Giữ thông tin Neon thật trong `backend/.env`, ngoài Git; JDBC URL dùng `sslmode=require`.

| Biến | Mặc định | Cách dùng |
| --- | --- | --- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Không có. | Kết nối database, giữ cấu hình Neon đã có. |
| `SERVER_PORT` | `8080` | Cổng backend. |
| `JWT_ACCESS_SECRET` | Bắt buộc. | Base64 của ít nhất 32 byte ngẫu nhiên để ký/xác minh access JWT. |
| `JWT_REFRESH_SECRET` | Bắt buộc. | Khóa khác access, cùng yêu cầu định dạng/độ dài. |
| `JWT_ISSUER` | `nestify` | Giá trị `iss` phải khớp khi ký và xác minh. |
| `JWT_ACCESS_TTL` | `15m` | Số nguyên giây, từ 1 giây đến 15 phút. |
| `JWT_REFRESH_TTL` | `14d` | Số nguyên giây, lớn hơn access TTL và không quá 14 ngày. |
| `FRONTEND_ORIGINS` | `http://localhost:5173` | Danh sách origin chính xác, phân tách bằng dấu phẩy; không có dấu `/` cuối, không dùng `*`. |
| `COOKIE_SECURE` | `false` | Đặt `true` khi phục vụ API qua HTTPS; áp dụng cookie refresh và CSRF. |
| `SHOW_SQL` | `false` | Log SQL; profile dev bật, prod tắt. |
| `DDL_AUTO` | `update` | Profile dev cố định `update`, prod cố định `validate`. |
| `FLYWAY_ENABLED` | `false` | Chỉ bật khi có migration thực tế đã review. |
| `AUTH_OTP_TTL` | `10m` | Từ 1 giây đến 10 phút. |
| `AUTH_OTP_RESEND_INTERVAL` | `60s` | Ít nhất 60 giây. |
| `AUTH_OTP_MAX_ATTEMPTS` | `5` | Từ 1 đến 5 lần nhập sai. |
| `AUTH_LOGIN_MAX_ATTEMPTS_PER_EMAIL_IP` | `5` | Số yêu cầu login tối đa cho mỗi cặp email–IP trong một cửa sổ. |
| `AUTH_LOGIN_MAX_ATTEMPTS_PER_IP` | `30` | Tổng yêu cầu login tối đa theo IP; không nhỏ hơn giới hạn email–IP. |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW` | `1m` | Cửa sổ giới hạn login, số nguyên giây từ 1 giây đến 1 giờ. |
| `SMTP_HOST`, `SMTP_PORT` | `localhost`, `1025` | SMTP local, phù hợp Mailpit. |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Rỗng. | Điền theo SMTP dùng thật. |
| `SMTP_AUTH`, `SMTP_STARTTLS` | `false` | Bật theo cấu hình SMTP; STARTTLS khi bật được yêu cầu thành công. |
| `MAIL_FROM` | `no-reply@nestify.local` | Địa chỉ gửi đã được SMTP cho phép. |

Sinh mỗi khóa JWT riêng bằng `openssl rand -base64 32`. Khóa được cấu hình trước khi chạy, không tự sinh tạm khi khởi động. Giữ khóa qua restart, dùng cùng khóa/issuer giữa các instance và cấp khóa riêng cho từng môi trường. Thay khóa làm token cũ không xác minh được bằng khóa mới. Không chép khóa test sang môi trường thật.

## 4. Security, role và giới hạn thu hồi

| Request | Quyền |
| --- | --- |
| `GET /api/health`, `GET /api/auth/csrf` | Công khai. |
| `POST /api/auth/login`, `/register/customer`, `/verify-email`, `/resend-verification`, `/refresh`, `/logout` dưới `/api/auth` | Công khai về access token nhưng vẫn kiểm tra CSRF; refresh/logout xử lý cookie refresh. |
| `GET /api/auth/me` | Access JWT có `ROLE_CUSTOMER`. |
| `/api/admin/**`, `/api/v1/admin/**` | `ROLE_ADMIN`. |
| `/api/provider/**`, `/api/v1/provider/**` | `ROLE_PROVIDER`. |
| `/api/customer/**`, `/api/v1/customer/**` | `ROLE_CUSTOMER`. |
| Các request khác | Cần xác thực. |

Có quy tắc role không có nghĩa đã có API login NCC/admin hoặc đủ endpoint nghiệp vụ. Hiện login/refresh chỉ cấp token cho CUSTOMER hợp lệ. Access JWT được kiểm tra HS256, chữ ký, issuer, audience, `token_use`, `sub`, `jti`, `iat`, `exp` và role hợp lệ. Role từ account lúc cấp token được chuyển thành `ROLE_...`; frontend không tự cấp quyền. Service nghiệp vụ vẫn phải kiểm tra quyền sở hữu tài nguyên.

Đã tắt form login, HTTP Basic, logout mặc định, request cache và tài khoản `user` tự sinh. `SessionCreationPolicy.STATELESS` ngăn lưu xác thực vào HttpSession. Request Bearer không tra bảng phiên hoặc refresh token. Login/refresh/logout có truy cập database; dữ liệu quản lý refresh token vẫn có trạng thái phía server.

Logout thu hồi refresh token, không vô hiệu ngay access JWT đã cấp. Access hết hiệu lực tại `exp` (tối đa 15 phút). API khóa/reset mật khẩu khi triển khai phải thu hồi toàn bộ refresh token và chặn cấp mới; access cũ vẫn có độ trễ hết hạn. Không mô tả các chức năng khóa/reset là đã hoàn thành.

PasswordEncoder mặc định dùng BCrypt qua DelegatingPasswordEncoder. Mật khẩu và OTP được hash có salt; refresh JWT và token đăng ký lưu hash SHA-256 trong database. Token đăng ký ngẫu nhiên chỉ trả trong response đăng ký/gửi lại cho đúng lượt, không gửi trong email; verify/resend bắt buộc có token hiện tại. Không trả các hash hoặc khóa ký qua API.

## 5. CSRF, CORS và triển khai

- Cookie refresh: `NESTIFY_REFRESH`, HttpOnly, SameSite=Lax, Path=/api/auth. Cookie CSRF: `XSRF-TOKEN`, HttpOnly, SameSite=Lax, Path=/.
- Frontend lấy token **từ JSON** của `/api/auth/csrf` rồi gửi header `X-XSRF-TOKEN`. Cookie/header có quan hệ được Spring kiểm tra; không so sánh trực tiếp chuỗi vì token JSON đã được che bằng XOR.
- Các POST xác thực công khai luôn kiểm tra CSRF, kể cả khi có Bearer header. Chúng bỏ qua access token để refresh/logout không bị chặn bởi access đã hết hạn. API nghiệp vụ xác thực bằng Bearer header không cần mã CSRF.
- Login/logout thành công xóa cookie CSRF cũ; frontend lấy lại trước POST xác thực tiếp theo. Refresh thành công không yêu cầu đổi CSRF.
- CORS cho phép `Content-Type`, `Accept`, `Authorization`, `X-XSRF-TOKEN`, các method GET/POST/PUT/PATCH/DELETE/OPTIONS và credential từ origin đã cấu hình. Preflight không cần access token.
- CORS expose header `Retry-After` để frontend đọc thời gian chờ khi login trả `429 / LOGIN_RATE_LIMITED`.

Local thống nhất dùng `localhost` cho cả FE/BE; khác cổng là khác origin nên vẫn cần CORS. Cookie Lax hiện hỗ trợ mô hình FE–BE cùng site. Khi deploy qua HTTPS, đặt `COOKIE_SECURE=true`, cập nhật `FRONTEND_ORIGINS` bằng origin FE thực tế và cấu hình các secret/SMTP/database của môi trường.

Nếu FE và BE nằm trên hai site khác nhau, cấu hình Lax hiện tại có thể không gửi cookie refresh trong fetch. Đây là thay đổi cần bàn riêng về cookie/CSRF và chính sách trình duyệt; chỉ sửa CORS không đủ. Không tự đổi SameSite hoặc tắt CSRF trong bước cập nhật tài liệu này.

Hợp đồng frontend đầy đủ, bao gồm bootstrap sau reload, refresh một lần và xử lý logout lỗi mạng, nằm trong [customer-auth.md](customer-auth.md).

## 6. Database, chuyển cơ chế cũ và kiểm tra

Bảng xác thực hiện dùng `refresh_tokens` theo [database-design-final.md](database-design-final.md). `AccountSession`, filter/service session cũ đã được thay bằng cơ chế JWT; cookie `NESTIFY_SESSION` không còn dùng để xác thực. Người dùng cần login lại khi chuyển từ bản session sang JWT.

Hibernate mặc định `ddl-auto: update`, có thể tạo bảng `refresh_tokens` khi chạy backend. Nó không tự đổi tên/drop `account_sessions`; code không còn dùng bảng cũ. Profile `prod` dùng `validate`, nên trước deploy phải có schema tương ứng và migration được review theo database thực tế.

Flyway hiện tắt; các file trong `db/migration` là placeholder, chưa phải bộ SQL tạo schema hoàn chỉnh. Khi chuyển sang Flyway, cần đối chiếu/baseline database đã có bảng, viết migration thực tế và giữ Hibernate ở `validate`. `clean` bị vô hiệu. Việc sửa docs không tự chạy DDL hoặc xóa dữ liệu Neon.

Chạy từ `backend`:

```bash
./mvnw test
./mvnw spring-boot:run
```

Lệnh test dùng profile test với H2 trong bộ nhớ, khóa JWT test và JavaMailSender giả. Test bao phủ validation/JSON DTO class, OTP, JWT, CSRF/CORS, quyền, rotation/reuse và thu hồi refresh. Cách chạy PostgreSQL riêng có trong [hướng dẫn xác thực](customer-auth.md); tuyệt đối không dùng database dữ liệu thật cho test `create-drop`.

Tham khảo: [Spring Security JWT](https://docs.spring.io/spring-security/reference/7.0/servlet/oauth2/resource-server/jwt.html), [CORS](https://docs.spring.io/spring-security/reference/7.0/servlet/integrations/cors.html), [CSRF](https://docs.spring.io/spring-security/reference/7.0/servlet/exploits/csrf.html), [PasswordEncoder](https://docs.spring.io/spring-security/reference/7.0/features/authentication/password-storage.html).
