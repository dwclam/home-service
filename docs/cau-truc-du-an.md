# Nestify — Cấu trúc thư mục và trách nhiệm từng phần

**Ngày cập nhật:** 24/10/2026.

**Công nghệ:** Java 21, Spring Boot 4, PostgreSQL; React, Vite, Tailwind CSS và Ant Design.  
**Tài liệu liên quan:** [Phân công nhóm](phan-cong-nhom.md), [Kế hoạch 5 tuần](ke-hoach-trien-khai-5-tuan.md), [Use case](usecase-final.md), [Database final](database-design-final.md).

Tài liệu mô tả cấu trúc hiện tại và cấu trúc đề xuất để nhóm triển khai dần. Các file trong cây đề xuất là vị trí/tên minh họa, chưa phải toàn bộ file đã tồn tại. Việc viết tài liệu này không tạo sẵn các class, màn hình hoặc cấu hình tương ứng.

Theo kế hoạch hiện tại, P0/P1/P2 là mức ưu tiên đề xuất cho 5 tuần, không phải quyết định loại bỏ use case. Chỉ tạo thư mục và file khi chức năng thực sự cần đến.

## 1. Cấu trúc hiện tại

Cây dưới đây rút gọn những phần chính đang có trong repository:

```text
home-service/
├── README.md                              # Giới thiệu, yêu cầu và cách chạy dự án
├── .gitignore                             # Các file/thư mục không đưa lên Git
├── docs/                                  # Tài liệu nghiệp vụ, thiết kế và kế hoạch nhóm
│   ├── usecase-final.md
│   ├── database-design-final.md
│   ├── phan-cong-nhom.md
│   ├── ke-hoach-trien-khai-5-tuan.md
│   ├── cau-truc-du-an.md
│   ├── customer-auth.md                    # Luồng JWT và hợp đồng frontend
│   ├── backend-config.md                   # Cấu hình bảo mật, JWT, SMTP và môi trường
│   ├── api-conventions.md                  # Đường dẫn, JSON, quyền và xử lý lỗi
│   ├── FE-guideline-lite (1).md
│   └── test-cnweb.html                     # Mẫu giao diện ban đầu
├── backend/
│   ├── pom.xml                            # Dependency và cấu hình build Maven
│   ├── mvnw                               # Chạy Maven Wrapper trên Linux/macOS
│   ├── mvnw.cmd                           # Chạy Maven Wrapper trên Windows
│   ├── .mvn/wrapper/                       # Cấu hình Maven Wrapper
│   ├── .env.example                       # Mẫu biến môi trường, không chứa bí mật thật
│   └── src/
│       ├── main/
│       │   ├── java/com/homeservice/
│       │   │   ├── BackendApplication.java # Điểm khởi động Spring Boot
│       │   │   ├── config/                 # SecurityConfig, JwtConfig, CorsConfig, AuthConfig, properties
│       │   │   ├── security/               # Principal, lỗi bảo mật và cookie refresh
│       │   │   ├── auth/
│       │   │   │   ├── controller/         # CustomerAuthController, CsrfController
│       │   │   │   ├── dto/                # Request/response class, validation và JSON
│       │   │   │   ├── entity/             # EmailIdentity, EmailChallenge, RefreshToken
│       │   │   │   ├── repository/         # Truy vấn danh tính, OTP và refresh token
│       │   │   │   └── service/            # CustomerAuthService, JwtTokenService, RefreshTokenService, TokenService
│       │   │   ├── account/                # Account, địa chỉ và truy vấn/khóa account
│       │   │   ├── common/                 # DTO/lỗi chung
│       │   │   ├── integration/mail/       # EmailService, SmtpEmailService
│       │   │   └── system/HealthController.java # GET /api/health
│       │   └── resources/                 # application*.yaml, migration placeholder và mail templates
│       └── test/java/com/homeservice/
│           ├── BackendApplicationTests.java
│           ├── config/SecurityConfigTests.java
│           └── auth/CustomerAuthIntegrationTests.java
└── frontend/
    ├── package.json                       # Dependency và lệnh dev/build/lint
    ├── vite.config.js                     # Cấu hình Vite
    ├── tailwind.config.js                 # Cấu hình Tailwind
    ├── postcss.config.js                  # Cấu hình xử lý CSS
    ├── eslint.config.js                   # Quy tắc lint JavaScript/React
    ├── index.html                         # HTML gốc, nơi React được gắn vào
    ├── public/                            # Favicon và file tĩnh theo đường dẫn cố định
    └── src/
        ├── main.jsx                       # Khởi động React, gắn App vào DOM
        ├── App.jsx                        # Hiện đang ghép các phần trang chủ
        ├── App.css                        # CSS của giao diện hiện tại
        ├── index.css                      # CSS toàn cục và Tailwind
        ├── components/
        │   ├── Layout.jsx                 # Header/Footer hiện tại
        │   ├── Hero.jsx                   # Phần giới thiệu đầu trang
        │   └── HomeSections.jsx           # Các phần nội dung trang chủ
        ├── data/home.js                   # Dữ liệu mẫu của trang chủ
        └── assets/                        # Ảnh/SVG được import trong mã nguồn
```

Backend đã có đăng ký/OTP/login/refresh/me/logout cho khách hàng bằng JWT access + refresh; xem [hợp đồng xác thực](customer-auth.md) và [cấu hình backend](backend-config.md). Access JWT đi qua Bearer header; refresh JWT trong cookie HttpOnly, quản lý rotation ở bảng `refresh_tokens`. Không còn `AccountSession` hoặc bộ lọc session cũ. Frontend chưa nối hoàn chỉnh các luồng này; NCC/admin/reset/khóa account triển khai tiếp. Cây trên chỉ liệt kê phần xác thực và các phần nền liên quan, các module nghiệp vụ khác được rút gọn.

## 2. Cách tổ chức tổng thể đề xuất

Giữ một repository, một ứng dụng Spring Boot và một ứng dụng React. Backend chia package theo nghiệp vụ; mỗi nghiệp vụ chia tiếp thành controller/service/repository/entity/DTO khi cần. Frontend chia trang theo khu vực sử dụng và gom API/logic theo tính năng.

```text
home-service/
├── backend/                               # API, nghiệp vụ, bảo mật và truy cập database
├── frontend/                              # Giao diện, form, gọi API và trạng thái hiển thị
├── docs/                                  # Đặc tả, hợp đồng API, thiết kế và kế hoạch
├── README.md                              # Cách cài đặt/chạy/kiểm tra từ một checkout mới
└── .gitignore                             # Bỏ qua bí mật, dependency và kết quả build
```

Các thư mục `backend/target/`, `frontend/node_modules/`, `frontend/dist/` là kết quả cài đặt/build, không phải mã nguồn cần tự viết. File `.env` chứa cấu hình thật được giữ ngoài Git; `.env.example` mô tả tên biến để người khác cấu hình.

## 3. Cây backend đề xuất

```text
backend/
├── pom.xml
├── mvnw
├── mvnw.cmd
├── .mvn/wrapper/
├── .env.example
└── src/
    ├── main/
    │   ├── java/com/homeservice/
    │   │   ├── BackendApplication.java     # Điểm khởi động, giữ ở package gốc
    │   │   ├── config/
    │   │   │   ├── SecurityConfig.java     # Khai báo bảo mật HTTP, CSRF và PasswordEncoder
    │   │   │   ├── CorsConfig.java         # Origin, header Authorization và credential
    │   │   │   ├── JwtConfig.java          # Encoder/decoder, khóa HS256 và kiểm tra claim
    │   │   │   ├── AuthConfig.java         # Clock UTC và cấu hình OTP
    │   │   │   ├── properties/            # AppSecurityProperties, AuthProperties, JwtProperties
    │   │   │   └── SchedulingConfig.java   # Kích hoạt/cấu hình tác vụ định kỳ
    │   │   ├── security/
    │   │   │   ├── SecurityErrorHandler.java # Lỗi xác thực/phân quyền/CSRF dạng JSON
    │   │   │   ├── RefreshTokenCookieService.java # Cookie chứa refresh JWT
    │   │   │   └── CurrentAccount.java     # Principal của request từ access JWT
    │   │   ├── common/
    │   │   │   ├── exception/
    │   │   │   │   ├── GlobalExceptionHandler.java # Đổi lỗi Java thành lỗi HTTP thống nhất
    │   │   │   │   ├── BusinessException.java      # Lỗi vi phạm điều kiện nghiệp vụ
    │   │   │   │   └── ResourceNotFoundException.java # Không tìm thấy tài nguyên
    │   │   │   └── dto/
    │   │   │       ├── ApiError.java        # Cấu trúc code/message/lỗi từng trường
    │   │   │       └── PageResponse.java    # Kết quả phân trang thống nhất
    │   │   ├── auth/                       # Đăng nhập, JWT access/refresh, OTP; khôi phục triển khai sau
    │   │   ├── account/                    # Account, hồ sơ khách và địa chỉ
    │   │   ├── provider/                   # Hồ sơ đăng ký/hoạt động của NCC
    │   │   │   └── availability/           # Lịch mở nhận việc/khóa lịch của NCC
    │   │   ├── catalog/                    # Danh mục, gói dịch vụ và ảnh
    │   │   ├── booking/                    # Đơn, trạng thái, lịch sử và deadline
    │   │   ├── payment/                    # Thu/hoàn/đối soát/chi trả
    │   │   ├── review/                     # Đánh giá và kiểm duyệt, theo ưu tiên mở rộng
    │   │   ├── chat/                       # Hội thoại/tin nhắn dùng chung
    │   │   ├── support/                    # Yêu cầu hỗ trợ/khiếu nại
    │   │   ├── reporting/                  # Truy vấn thu nhập/dashboard/báo cáo
    │   │   ├── audit/                      # Nhật ký hành động quản trị
    │   │   ├── integration/
    │   │   │   ├── mail/EmailService.java  # Gửi email qua dịch vụ được cấu hình
    │   │   │   └── storage/FileStorageService.java # Lưu ảnh/tệp khi tích hợp upload
    │   │   └── system/
    │   │       └── HealthController.java   # Endpoint kiểm tra ứng dụng hoạt động
    │   └── resources/
    │       ├── application.yaml           # Cấu hình chung và tham chiếu biến môi trường
    │       ├── application-dev.yaml       # Cấu hình môi trường phát triển nếu tách profile
    │       ├── application-demo.yaml      # Cấu hình môi trường demo nếu cần
    │       ├── db/migration/              # SQL migration khi tích hợp Flyway
    │       │   ├── V1__init_core_schema.sql # Tạo schema cốt lõi theo thứ tự phụ thuộc
    │       │   └── V2__add_booking_constraints.sql # Ví dụ bổ sung ràng buộc lịch
    │       └── templates/mail/
    │           ├── verify-email.html      # Nội dung email OTP/xác thực
    │           └── provider-approved.html # Nội dung email kết quả duyệt NCC
    └── test/
        ├── java/com/homeservice/
        │   ├── BackendApplicationTests.java
        │   ├── auth/                      # Kiểm tra OTP, JWT, rotation/reuse và giới hạn tài khoản
        │   ├── booking/                   # Kiểm tra lịch, trạng thái và deadline
        │   ├── payment/                   # Kiểm tra callback, số tiền và tính lặp
        │   └── catalog/                   # Kiểm tra quyền, điều kiện hiển thị quan trọng
        └── resources/application-test.yaml # Cấu hình dành cho kiểm tra
```

Giữ các package bên dưới `com.homeservice` để nằm trong phạm vi quét của `BackendApplication`. `security` xác thực và xác định quyền chung; `auth` triển khai nghiệp vụ đăng ký/đăng nhập/OTP. Quyền sở hữu từng đơn/dịch vụ vẫn phải kiểm tra trong nghiệp vụ liên quan.

Các vị trí chưa có code trong cây đề xuất không đồng nghĩa đã được triển khai. Cấu hình hiện tại dùng `ddl-auto: update` mặc định và ở profile dev; profile prod dùng `validate`. Flyway đang tắt, các migration hiện có là placeholder. Profile test dùng H2 `create-drop`, không truy cập Neon. Khi dùng Flyway để deploy, cần đối chiếu schema thực tế, thiết lập baseline nếu cần, review SQL rồi dùng Hibernate `validate`. Việc đổi entity phiên thành refresh token không tự xóa bảng `account_sessions` cũ.

### 3.1. Các tầng bên trong một module

| Thư mục | Trách nhiệm | Ví dụ |
| --- | --- | --- |
| `controller/` | Nhận HTTP request, validation đầu vào, lấy danh tính đã xác thực, gọi service và trả DTO. | `CustomerBookingCommandController.java` |
| `dto/request/` | Dữ liệu API nhận vào và quy tắc validation của từng thao tác. | `CreateBookingRequest.java` |
| `dto/response/` | Dữ liệu API trả về theo quyền/ngữ cảnh; không lộ trường nội bộ. | `BookingDetailResponse.java` |
| `service/` | Điều phối nghiệp vụ, kiểm tra quyền sở hữu, transaction và thay đổi trạng thái. | `BookingService.java` |
| `entity/` | Ánh xạ Java với bảng/cột/quan hệ database. | `Booking.java` |
| `repository/` | Truy vấn và lưu entity hoặc projection theo yêu cầu của service. | `BookingRepository.java` |
| `enums/` | Trạng thái/phân loại của nghiệp vụ sở hữu nó. | `BookingStatus.java` |
| `mapper/` | Chuyển entity/projection thành DTO; chỉ tách khi giúp mã rõ hơn. | `BookingMapper.java` |
| `policy/` | Các quy tắc tính/kiểm tra nghiệp vụ cần dùng lại hoặc kiểm tra độc lập. | `BookingCancellationPolicy.java` |
| `job/` | Kích hoạt tác vụ định kỳ, gọi lại nghiệp vụ service. | `BookingExpirationJob.java` |

Module nhỏ có thể chỉ cần vài file. Viết service dạng class trực tiếp là đủ khi chỉ có một cách triển khai. Chỉ thêm interface, mapper hoặc các thư mục phụ khi có nhu cầu cụ thể. `common` dành cho thành phần dùng chung rõ ràng; quy tắc đặt lịch/tính tiền vẫn ở module sở hữu.

DTO API dùng class thường với constructor, getter/setter và annotation validation. Chuẩn hóa email/tên/điện thoại ở setter của request DTO; không tự trim mật khẩu. Record cấu hình và `RefreshTokenService.TokenPair` là kiểu nội bộ, không phải DTO JSON được trả ra API.

Đọc luồng JWT theo thứ tự: `CustomerAuthController.login()` → `CustomerAuthService.login()` → `RefreshTokenService.issueOnLogin()` → `JwtTokenService`; request API tiếp theo được kiểm tra trong filter chain của `SecurityConfig` bằng decoder của `JwtConfig`. `RefreshTokenService` truy vấn DB để đổi/thu hồi refresh, còn xác thực access JWT không tra bảng token. Chi tiết từng file và diagram ở [customer-auth.md](customer-auth.md).

### 3.2. Ví dụ chi tiết module booking và cách chia file

```text
booking/
├── controller/
│   ├── CustomerBookingQueryController.java   # Cường: khách xem đơn
│   ├── ProviderBookingQueryController.java   # Cường: NCC xem đơn
│   ├── CustomerBookingCommandController.java # Thuỷ: khách tạo/hủy đơn theo phạm vi đã làm
│   ├── ProviderBookingCommandController.java # Thuỷ: nhận/từ chối/bắt đầu/hoàn thành
│   └── AdminBookingController.java           # Thuỷ: admin vận hành đơn
├── dto/
│   ├── request/
│   │   ├── CreateBookingRequest.java         # Gói dịch vụ, thời gian, liên hệ/địa chỉ
│   │   └── CancelBookingRequest.java         # Lý do hủy, khi triển khai chức năng hủy
│   └── response/
│       ├── BookingSummaryResponse.java      # Thông tin ngắn cho danh sách
│       └── BookingDetailResponse.java       # Chi tiết đơn và thông tin được phép xem
├── service/
│   ├── BookingService.java                  # Thuỷ: nghiệp vụ tạo/thay đổi đơn
│   └── BookingQueryService.java             # Cường: đọc/lọc/phân trang đơn
├── entity/
│   ├── Booking.java                         # Thuỷ chủ trì entity/migration
│   └── BookingStatusHistory.java            # Lịch sử chuyển trạng thái, chỉ ghi thêm
├── repository/
│   ├── BookingRepository.java               # Thuỷ: lưu và truy vấn phục vụ nghiệp vụ ghi
│   └── BookingQueryRepository.java          # Cường: truy vấn/projection phục vụ API đọc
├── enums/
│   ├── BookingStatus.java                   # Trạng thái dịch vụ
│   └── TerminationReason.java               # Nguyên nhân kết thúc đơn
├── policy/
│   └── BookingCancellationPolicy.java       # Chọn tỷ lệ hoàn theo thời điểm/nguyên nhân
├── mapper/
│   └── BookingMapper.java                   # Chuyển dữ liệu đơn thành response
└── job/
    └── BookingExpirationJob.java            # Xử lý yêu cầu/giữ cọc hết hạn
```

`Query` là tra cứu; `Command` là tạo hoặc thay đổi dữ liệu. Phân tách này giúp Cường và Thuỷ làm song song. Hai người thống nhất DTO đọc; chỉ một người chủ trì thay đổi entity/migration. Cần kiểm tra deadline trong thao tác nghiệp vụ ngay cả khi job chưa chạy.

### 3.3. Module dữ liệu và chủ sở hữu

| Package | Entity/dữ liệu chính | Người phụ trách |
| --- | --- | --- |
| `auth` | EmailIdentity, EmailChallenge, RefreshToken. | Lâm |
| `account` | Account, CustomerAddress; hồ sơ và quản lý tài khoản. | Lâm chủ trì Account/cơ chế truy cập; Cường làm hồ sơ, địa chỉ và API quản lý theo phân công. |
| `provider` | ProviderApplication, ProviderProfile. | Lâm chủ trì entity, nộp/duyệt và ngân hàng; Cường sửa/xem trường công khai. |
| `provider.availability` | ProviderAvailability. | Thuỷ |
| `catalog` | Category, ServiceOffering, ServiceImage. | Cường |
| `booking` | Booking, BookingStatusHistory. | Thuỷ nghiệp vụ ghi; Cường API đọc. |
| `payment` | PaymentTransaction, GatewayEvent, Refund, Payout. | Lâm |
| `review` | Review. | Cường |
| `chat` | Conversation, Message. | Thuỷ |
| `support` | Complaint. | Thuỷ |
| `reporting` | Query/projection từ đơn và giao dịch nguồn. | Cường; Lâm review định nghĩa chỉ số tiền. |
| `audit` | AdminAuditLog. | Lâm cung cấp cơ chế, các BE ghi hành động liên quan. |

Tên entity `ServiceOffering` đại diện gói dịch vụ trong bảng `services`, giúp phân biệt với các lớp xử lý có hậu tố `Service`. Không cần tạo bảng riêng cho mỗi package; `reporting` có thể chỉ đọc dữ liệu hiện có. Không tạo các entity dư như ProviderPayoutAccount hoặc Notification khi bản database final đã gộp/hoãn chúng.

### 3.4. Ví dụ phần thanh toán

```text
payment/
├── controller/                            # Tạo lượt thanh toán, nhận callback, API vận hành
├── dto/                                   # Request/response đã chốt với FE
├── service/
│   ├── PaymentService.java                # Cọc/phần còn lại và nghĩa vụ thanh toán
│   ├── PaymentCallbackService.java        # Xác minh, chống tác động lặp, tiền muộn
│   ├── RefundService.java                 # Nghĩa vụ/yêu cầu/kết quả hoàn
│   ├── SettlementService.java             # Chốt tiền ròng, phần Nestify và NCC
│   └── PayoutService.java                 # Duyệt và ghi nhận chuyển khoản NCC
├── gateway/
│   ├── PaymentGateway.java                # Hợp đồng kết nối cổng nếu cần tách triển khai
│   └── vnpay/VnpayGateway.java             # Chi tiết kết nối VNPay theo kế hoạch tích hợp
├── entity/                                # Chứng từ thu/hoàn/chi và sự kiện cổng
├── repository/
└── enums/                                 # Trạng thái tiền, tách với BookingStatus
```

Đây là cấu trúc cho toàn phạm vi phân công; phần hoàn/đối soát/chi trả được tạo theo mức ưu tiên trong kế hoạch. `VnpayGateway` kết nối thu/hoàn qua cổng được cấp; `PayoutService` quản lý luồng chi trả NCC riêng. Cổng thanh toán không tự tính tỷ lệ chia tiền của Nestify.

Lưu yêu cầu tiền trước khi gọi dịch vụ ngoài, gọi ngoài transaction DB và ghi kết quả trong transaction phù hợp. Lâm/Thuỷ thống nhất phương thức cập nhật đơn dưới khóa; phần callback gọi nghiệp vụ hợp lệ thay vì tự gán tùy ý trạng thái dịch vụ.

## 4. Cây frontend đề xuất

```text
frontend/
├── package.json                           # Dependency và script
├── vite.config.js                         # Dev server/build, proxy nếu chọn dùng
├── tailwind.config.js                     # Token/cấu hình Tailwind
├── postcss.config.js
├── eslint.config.js
├── index.html
├── .env.example                           # Đề xuất: mẫu VITE_API_BASE_URL và biến công khai
├── public/                                # File tĩnh giữ URL cố định
└── src/
    ├── main.jsx                           # Khởi động React
    ├── App.jsx                            # Gắn app provider và router ở cấp ứng dụng
    ├── index.css                          # CSS toàn cục/Tailwind
    ├── app/
    │   ├── router.jsx                     # Khai báo các route toàn ứng dụng
    │   └── providers.jsx                  # Khởi tạo thư viện dùng chung, ví dụ QueryClient
    ├── routes/
    │   ├── ProtectedRoute.jsx             # Kiểm tra đăng nhập/vai trò trước khi hiển thị trang
    │   └── RequirePasswordChange.jsx      # Điều hướng NCC phải đổi mật khẩu lần đầu
    ├── layouts/
    │   ├── PublicLayout.jsx               # Header/Footer khu vực giới thiệu/xác thực
    │   ├── CustomerLayout.jsx             # Khung các trang dành cho khách
    │   └── DashboardLayout.jsx            # Sidebar/nội dung chung cho NCC/admin
    ├── pages/
    │   ├── public/HomePage.jsx            # Trang giới thiệu
    │   ├── auth/                          # Đăng nhập/đăng ký/OTP/nộp hồ sơ NCC
    │   ├── customer/                      # Dịch vụ, đặt lịch, đơn và thanh toán của khách
    │   ├── provider/                      # Hồ sơ/dịch vụ/lịch/đơn NCC
    │   └── admin/                         # Trang quản trị, chia theo nghiệp vụ được giao
    ├── features/
    │   ├── auth/
    │   │   ├── api.js                     # Hàm gọi API xác thực
    │   │   ├── queries.js                 # Hook/query/mutation và cập nhật cache
    │   │   ├── schemas.js                 # Validation form theo hợp đồng API
    │   │   └── authStore.js               # Account và access JWT trong bộ nhớ của FE
    │   ├── catalog/
    │   │   ├── api.js                     # Tra cứu/quản lý danh mục, dịch vụ
    │   │   ├── queries.js
    │   │   ├── schemas.js
    │   │   └── components/ServiceCard.jsx  # Component đặc thù dịch vụ
    │   ├── provider/                      # API/hook/form hồ sơ, lịch NCC
    │   ├── booking/                       # API/hook/form/hiển thị đơn dùng giữa các khu vực
    │   ├── payment/                       # Tạo lượt thanh toán, đọc kết quả đã xác minh
    │   ├── review/                        # Tạo khi triển khai phần đánh giá
    │   ├── chat/                          # Component và logic chat dùng chung
    │   ├── support/                       # Yêu cầu hỗ trợ, tạo khi nhận phần này
    │   └── reporting/                     # Query và hiển thị báo cáo khi triển khai
    ├── components/
    │   ├── ui/                            # Loading, EmptyState, ConfirmDialog, bảng dùng chung
    │   └── home/                          # Hero và các section của trang chủ
    ├── lib/
    │   ├── http.js                        # Base URL, Bearer header, cookie/CSRF, điều phối refresh/lỗi
    │   └── queryClient.js                 # Cấu hình cache/request dùng chung
    ├── constants/
    │   ├── roles.js                       # Vai trò và nhãn hiển thị
    │   └── bookingStatus.js               # Ánh xạ trạng thái đơn sang nhãn/màu
    ├── mocks/
    │   ├── auth.json                      # Dữ liệu mẫu cùng cấu trúc response đã chốt
    │   ├── services.json
    │   └── bookings.json
    ├── styles/tokens.css                  # Token màu/font/khoảng cách nếu dùng CSS variables
    ├── data/home.js                       # Dữ liệu trình bày trang chủ hiện tại
    └── assets/                            # Ảnh/SVG được import
```

Các file trang có thể đặt như `pages/customer/ServiceListPage.jsx`, `pages/customer/CreateBookingPage.jsx`, `pages/provider/BookingListPage.jsx`, `pages/admin/ProviderApplicationsPage.jsx`. `pages` ghép thành màn hình; `features` chứa logic và component nghiệp vụ được màn hình sử dụng.

Các component hiện có được chuyển dần khi cần: nội dung `Layout.jsx` sang layout/header/footer dùng chung; `Hero.jsx` và `HomeSections.jsx` sang `components/home`; phần ghép trang chủ của `App.jsx` sang `HomePage.jsx`. Đây là hướng di chuyển, chưa thực hiện thay đổi mã nguồn trong tài liệu này.

### 4.1. Vai trò từng loại file FE

| Vị trí | Vai trò |
| --- | --- |
| `pages/` | Trang được router hiển thị; ghép form, component và dữ liệu theo từng khu vực. |
| `features/*/api.js` | Hàm gọi endpoint theo nghiệp vụ; dùng HTTP client chung để cấu hình nhất quán. |
| `features/*/queries.js` | Hook tải dữ liệu/thực hiện thao tác, trạng thái tải/lỗi và cập nhật cache sau thao tác. |
| `features/*/schemas.js` | Kiểm tra dữ liệu form; backend vẫn kiểm tra lại dữ liệu và quyền. |
| `features/*/components/` | Component đặc thù nghiệp vụ, ví dụ thẻ dịch vụ hoặc phần tóm tắt đơn. |
| `components/ui/` | Thành phần dùng chung ở nhiều nghiệp vụ, như loading, dialog và trạng thái rỗng. |
| `layouts/` | Bố cục chung của một nhóm trang. |
| `routes/` | Quy tắc hiển thị/điều hướng theo trạng thái tài khoản; không thay thế quyền ở BE. |
| `lib/` | Cấu hình thư viện và kết nối dùng chung. |
| `constants/` | Vai trò, nhãn/màu enum và các hằng số trình bày đã thống nhất. |
| `mocks/` | Response giả theo hợp đồng API để FE làm song song; không phải dữ liệu thật đã xác minh. |
| `assets/` | File được mã nguồn import; `public/` dành cho file cần đường dẫn tĩnh cố định. |

Chọn rõ nơi lưu dữ liệu: query/cache dùng cho dữ liệu tải từ BE; auth store giữ thông tin tài khoản phục vụ giao diện; trạng thái form/đóng mở dialog ở component hoặc hook liên quan. Chỉ tạo `queries.js`/`schemas.js` khi tính năng dùng đến, không tạo file rỗng cho đủ cây.

### 4.2. Chủ sở hữu phần FE

| Phần | Chủ trì |
| --- | --- |
| Router, API client, auth store, route xác thực, các trang auth/public/customer | TLam |
| Admin duyệt NCC, danh mục và người dùng | TLam |
| Dashboard layout/sidebar, bảng/badge dùng chung | Minh |
| Các trang provider và admin vận hành/tài chính/hỗ trợ/báo cáo | Minh |
| `features/chat` | TLam làm phần dùng chung; Minh tích hợp phía NCC/admin. |
| Feature được cả hai khu vực dùng như catalog/booking/payment | Thống nhất một chủ sở hữu file API/hook; hai người dùng chung hợp đồng, không tạo bản sao khác cấu trúc. |

TLam/Minh làm màn hình theo phân công và mức ưu tiên hiện tại. Khi chưa nhận P1/P2, chưa cần tạo đầy đủ các trang chat, hỗ trợ, đánh giá hay báo cáo.

## 5. Luồng gọi giữa các phần

Ví dụ khách tạo đơn:

```text
pages/customer/CreateBookingPage.jsx
    → features/booking/queries.js
    → features/booking/api.js
    → lib/http.js
    → HTTP request theo hợp đồng API
    → booking/controller/CustomerBookingCommandController.java
    → booking/service/BookingService.java
    → các service/query kiểm tra dịch vụ, NCC, lịch và người đặt
    → booking/repository/BookingRepository.java
    → PostgreSQL
    → BookingDetailResponse
    → giao diện cập nhật kết quả
```

Controller nhận dữ liệu; service kiểm tra/điều phối; repository truy cập DB. Entity phản ánh cách lưu, DTO phản ánh dữ liệu được phép truyền qua API. Giá và người sở hữu đơn được BE xác định/kiểm tra từ nguồn tin cậy, không lấy giá hoặc danh tính do FE tự khai làm căn cứ.

Với thanh toán, FE yêu cầu BE tạo lượt thanh toán rồi điều hướng đến cổng. Callback/tra cứu đã xác thực được BE xử lý; FE đọc kết quả từ BE để hiển thị. Lịch sử/trạng thái đơn và trạng thái chứng từ tiền là hai nhóm dữ liệu riêng.

## 6. Tài liệu API và dữ liệu mẫu

Tài liệu JWT và quy ước API đã có; OpenAPI và kịch bản demo bên dưới là đề xuất, chưa có file:

```text
docs/
├── customer-auth.md                       # Đã có: luồng JWT, cookie/CSRF, hợp đồng FE và file backend
├── backend-config.md                      # Đã có: dependency, secret/TTL, Security/CORS và deploy
├── api-conventions.md                     # Đã có: đường dẫn thực tế, JSON, lỗi, Bearer/refresh
├── openapi.yaml                           # Endpoint, quyền, request/response và ví dụ đã thống nhất
└── demo-scenarios.md                       # Dữ liệu, vai trò, các bước và kết quả demo
```

Chọn một nơi làm nguồn mô tả endpoint chính thức; nếu dùng OpenAPI thì cập nhật endpoint ở đó. `api-conventions.md` ghi quy tắc chung; `customer-auth.md` là hợp đồng xác thực hiện tại để frontend tích hợp. Dữ liệu FE trong `mocks/` phải khớp ví dụ/hợp đồng đã chốt. Lâm, Thuỷ, Cường cập nhật phần API sở hữu; TLam/Minh kiểm tra dữ liệu đủ cho màn hình.

## 7. Thứ tự dựng cấu trúc trong 5 tuần

1. Dựng `security`, lỗi/phân trang dùng chung, `auth/account/provider` tối thiểu và khung router/layout/API client. Đưa API đầu tiên vào sử dụng qua FE.
2. Dựng `catalog`, `provider/availability`, `booking` theo thứ tự phụ thuộc; chốt DTO/query để Cường và hai FE làm song song.
3. Dựng phần thu tiền trong `payment` và tích hợp vòng đời đơn; kiểm tra callback, deadline, tính lặp và dữ liệu khác chủ.
4. Rà phạm vi P0 trước; tạo phần mở rộng khi nhóm nhận công việc đó. Tuần 5 dành cho kiểm tra, sửa lỗi và demo theo kế hoạch đã ghi.

Các cây trên là bản đồ vị trí mã nguồn cho toàn phạm vi phân công. Kết quả cần đạt là chức năng có thể chạy và kiểm chứng; số lượng thư mục/class không phải tiêu chí hoàn thành.
