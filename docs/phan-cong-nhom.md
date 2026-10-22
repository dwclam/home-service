# Nestify — Phân công công việc nhóm

**Ngày cập nhật:** 22/10/2026.  
**Nhóm:** Lâm, Thuỷ, Cường, TLam, Minh.  
**Phạm vi:** phân công triển khai backend và frontend theo phương án đã trao đổi; tài liệu này không phản ánh chức năng đã hoàn thành.

Tài liệu đối chiếu:

- [Use case và đặc tả nghiệp vụ](usecase-final.md).
- [Thiết kế database final](database-design-final.md).
- [Quy định giao diện FE](<FE-guideline-lite (1).md>).

Khi use case cũ khác với quyết định rút gọn trong thiết kế database final phiên bản 1.1, áp dụng bản database 1.1. Hiện có 50 use case triển khai; UC15 và UC26 về thông báo trong ứng dụng đang hoãn. Email OTP, cấp tài khoản và khôi phục mật khẩu vẫn thuộc phạm vi.

## 1. Tổng quan phân công

| Thành viên | Vai trò | Trách nhiệm chính | Số UC backend |
| --- | --- | --- | ---: |
| Lâm | Backend xác thực và tài chính | Tài khoản, OTP, duyệt NCC, thu tiền, hoàn tiền, đối soát, chi trả. | 20 |
| Thuỷ | Backend lịch, đơn và giao tiếp | Lịch rảnh, đặt lịch, chuyển trạng thái đơn, chat và hỗ trợ/khiếu nại. | 13 |
| Cường | Backend quản lý dữ liệu và tra cứu | Dịch vụ, danh mục, hồ sơ, địa chỉ, tra cứu đơn, đánh giá và báo cáo. | 17 |
| TLam | Frontend khách hàng và xác thực | Trang chủ, xác thực, luồng khách hàng, admin cơ bản và chat dùng chung. | — |
| Minh | Frontend NCC và admin vận hành | Khu vực NCC, vận hành đơn, tài chính admin, khiếu nại và báo cáo. | — |

Số use case dùng để kiểm soát phạm vi; độ khó và khối lượng giữa các use case khác nhau. Cường nhận nhiều API quản lý/tra cứu; Lâm và Thuỷ phụ trách phần có ràng buộc trạng thái, tiền và xử lý đồng thời.

Lâm giữ trách nhiệm chính mục 3.1 và 3.3. Năm use case UC14, UC29, UC23, UC32, UC34 được giao Cường triển khai để cân tải. Quy tắc bảo mật và định nghĩa chỉ số tài chính liên quan vẫn do Lâm chốt.

TLam tương ứng FE1, Minh tương ứng FE2 trong phương án phân công FE đã trao đổi. Mỗi use case có một người chịu trách nhiệm backend và các màn hình frontend tương ứng được phân riêng ở mục 3.

## 2. Phân công backend

### 2.1. Lâm — Xác thực và tài chính

| Use case | Chức năng | Phần backend phải bàn giao |
| --- | --- | --- |
| UC01 | Đăng ký khách hàng | Kiểm tra/giữ email, tạo tài khoản chờ xác thực và khởi tạo xác thực email. |
| UC02 | Đăng nhập khách hàng | Xác thực tài khoản khách, kiểm tra trạng thái và cấp phiên. |
| UC03 | Đăng xuất | Thu hồi phiên hiện tại. |
| UC04 | Quên/đặt lại mật khẩu | Xác thực yêu cầu, đổi mật khẩu và thu hồi phiên cũ. |
| UC16 | Nộp hồ sơ NCC | Tạo hồ sơ chờ xác thực; chưa tạo tài khoản NCC đăng nhập. |
| UC17 | Đăng nhập NCC | Kiểm tra tài khoản đã duyệt và giới hạn phiên khi chưa đổi mật khẩu lần đầu. |
| UC27 | Đăng nhập admin | Xác thực đúng vai trò admin. |
| UC28 | Duyệt/từ chối NCC | Xử lý duyệt đúng một lần, tạo account/profile nguyên tử, ghi lịch sử và gửi email kết quả. |
| UC35 | Xác thực email khách | Kiểm tra OTP, kích hoạt đúng tài khoản. |
| UC36 | Xác thực email hồ sơ NCC | Kiểm tra OTP gắn với đúng lần nộp hồ sơ và chuyển sang chờ duyệt. |
| UC42 | Đổi mật khẩu lần đầu | Đổi mật khẩu và gỡ giới hạn của tài khoản NCC. |
| UC09 | Trả cọc 30% | Tạo giao dịch cọc cho đúng đơn, số tiền, người trả và thời hạn. |
| UC43 | Trả 70% còn lại | Tạo giao dịch phần còn lại cho đơn hoàn thành đủ điều kiện. |
| UC44 | Quản lý ngân hàng NCC | Khai báo, xác minh và bảo vệ thông tin tài khoản nhận tiền. |
| UC45 | Xem thanh toán/hoàn tiền | API lịch sử, nghĩa vụ và kết quả thu/hoàn của khách sở hữu đơn. |
| UC46 | Theo dõi/đối soát giao dịch | Tra cứu, xử lý trạng thái chưa rõ, sai lệch và thu trùng. |
| UC47 | Lập/chốt đối soát đơn | Tính từ tiền thực thu/hoàn, kiểm tra điều kiện và lưu snapshot đối soát. |
| UC48 | Duyệt/chuyển tiền NCC | Lập, duyệt và ghi nhận từng lần chi trả, tài khoản nhận đã chụp và chứng từ. |
| UC49 | Xử lý kết quả cổng | Xác minh thông báo, kiểm tra số tiền/mã giao dịch, xử lý lặp và tiền đến muộn. |
| UC50 | Thực hiện/theo dõi hoàn tiền | Ghi nhận nghĩa vụ hoàn, gửi yêu cầu, theo dõi kết quả và đối soát trước khi thử lại. |

**Phần dùng chung Lâm phụ trách:** cấu hình bảo mật, lấy tài khoản đang đăng nhập, vai trò/quyền, quản lý phiên, OTP, email và cơ chế khóa tài khoản. Cung cấp chức năng ghi audit dùng chung để các phần quản trị gọi trong cùng transaction nghiệp vụ khi cần.

**Ranh giới thanh toán:** kế hoạch demo ưu tiên cổng VNPay sandbox; khả năng sử dụng từng API cần kiểm tra theo tài khoản tích hợp. Thu tiền và hoàn tiền qua cổng là các luồng riêng với chi trả NCC. Theo phương án hiện tại, admin duyệt và chuyển khoản ngân hàng cho NCC rồi ghi nhận kết quả; chưa mặc định có API tự động chi hộ. Giao dịch mô phỏng khi demo phải được nhận diện rõ.

### 2.2. Thuỷ — Lịch, đặt lịch, chat và hỗ trợ

| Use case | Chức năng | Phần backend phải bàn giao |
| --- | --- | --- |
| UC08 | Đặt lịch | Kiểm tra điều kiện, chống tạo trùng khi gửi lại request và chụp dữ liệu dịch vụ/giá/địa chỉ/chính sách. |
| UC11 | Khách hủy đơn | Kiểm tra quyền/thời điểm, chốt nguyên nhân và tỷ lệ hoàn, phối hợp ghi nghĩa vụ hoàn. |
| UC20 | Quản lý lịch rảnh | Quản lý khoảng AVAILABLE/BLOCKED; bảo đảm không chồng lịch hoặc mất chỗ của đơn đang giữ/xác nhận/thực hiện. |
| UC21 | Chấp nhận/từ chối đơn | Kiểm tra hạn, khóa và kiểm tra lại lịch; nhận đơn/giữ chỗ hoặc từ chối có lý do. |
| UC22 | Bắt đầu/hoàn thành | Chuyển trạng thái hợp lệ, lưu thời điểm và mở nghĩa vụ trả phần còn lại. |
| UC31 | Admin vận hành đơn | API theo dõi và các hành động can thiệp hợp lệ, có lý do và lịch sử. |
| UC38 | Xem lịch rảnh và giá | Tính khoảng phù hợp thời lượng dịch vụ sau khi xét các đơn đang chiếm lịch; đọc giá hiện tại từ catalog. |
| UC41 | NCC hủy đơn đã nhận | Kiểm tra quyền, phân biệt trước/trong khi làm và phối hợp chính sách hoàn cọc. |
| UC51 | Hết hạn yêu cầu/giữ lịch | Tác vụ hết hạn, giải phóng lịch và kiểm tra deadline tại endpoint kể cả khi tác vụ chưa chạy. |
| UC13 | Khách chat với NCC | Hội thoại khách–NCC, lịch sử tin, gửi/đọc tin và kiểm tra người tham gia. |
| UC24 | NCC chat với khách | Dùng chung backend chat; bảo đảm quyền truy cập phía NCC. |
| UC33 | Admin xử lý khiếu nại | Tiếp nhận/phân công/xử lý, chat hỗ trợ và ghi audit; phối hợp điều kiện giữ chi trả. |
| UC39 | Khách gửi/theo dõi hỗ trợ | Tạo yêu cầu chung hoặc gắn đúng đơn của khách, theo dõi trạng thái và trao đổi. |

**Thuỷ sở hữu nghiệp vụ thay đổi trạng thái đơn.** Cung cấp phương thức nghiệp vụ để phần thanh toán của Lâm xác nhận cọc hợp lệ; thống nhất cách khóa và thứ tự cập nhật dữ liệu trước khi tích hợp. API admin thao tác qua các hành động nghiệp vụ cụ thể thay vì cho sửa trạng thái tùy ý.

Chat khách–NCC và chat hỗ trợ dùng chung conversations/messages theo thiết kế database. Chat hỗ trợ kiểm tra admin được phân công hoặc có quyền tiếp nhận; lịch sử tin lưu PostgreSQL, truyền tin mới theo phương án WebSocket trong thiết kế.

### 2.3. Cường — Quản lý dữ liệu, tra cứu, đánh giá và báo cáo

| Use case | Chức năng | Phần backend phải bàn giao |
| --- | --- | --- |
| UC05 | Tìm kiếm/lọc dịch vụ | Bộ lọc, phân trang/sắp xếp; chỉ trả dịch vụ và NCC hợp lệ cho khách đã đăng nhập. |
| UC06 | Chi tiết dịch vụ | Thông tin gói, giá, thời lượng, ảnh, NCC và đánh giá được hiển thị. |
| UC07 | Hồ sơ công khai NCC | DTO công khai và danh sách dịch vụ hợp lệ, không lộ dữ liệu ngân hàng hoặc hồ sơ xét duyệt. |
| UC10 | Khách xem đơn | Danh sách/chi tiết/lịch sử đơn đúng chủ; lấy thông tin tiền từ nguồn đã thống nhất với Lâm. |
| UC18 | Quản lý hồ sơ NCC | Sửa trường thông tin công khai được phép của chính NCC; không tự sửa trạng thái duyệt/ngân hàng. |
| UC19 | Quản lý dịch vụ | Tạo/sửa/đăng công khai/lưu trữ, ảnh và thứ tự ảnh; kiểm tra quyền sở hữu, giá và thời lượng. |
| UC30 | Quản lý danh mục | Cây danh mục, thêm/sửa/bật/tắt, kiểm tra slug và vòng cha–con. |
| UC37 | Quản lý địa chỉ | Thêm/sửa/lưu trữ/đặt mặc định, đúng chủ sở hữu và chỉ một mặc định còn hiệu lực. |
| UC40 | NCC xem đơn được giao | Danh sách/chi tiết đơn của đúng NCC với thông tin cần cho công việc. |
| UC14 | Quản lý hồ sơ khách | Cập nhật tên/điện thoại và các trường được phép; giữ giới hạn không đổi email/loại tài khoản. |
| UC29 | Admin quản lý người dùng | Xem/khóa/mở khóa theo cơ chế bảo mật Lâm cung cấp và ghi audit. |
| UC23 | NCC xem thu nhập | API dự kiến/phải trả/đang chuyển/đã nhận theo nguồn và định nghĩa Lâm chốt. |
| UC32 | Dashboard admin | Chỉ số đơn, thu, hoàn, hoa hồng, nghĩa vụ NCC và thực chi theo định nghĩa đã thống nhất. |
| UC34 | Xem/xuất báo cáo | Lọc kỳ/trạng thái và xuất số liệu thống nhất với dashboard, giao dịch nguồn. |
| UC12 | Khách đánh giá | Một đánh giá cho mỗi đơn hoàn thành của đúng khách; kiểm tra số sao và nội dung. |
| UC25 | NCC xem đánh giá | Truy vấn đánh giá thuộc dịch vụ/đơn của NCC, phân trang và thống kê theo quyền hiển thị. |
| UC52 | Admin kiểm duyệt đánh giá | Ẩn/hiện có lý do và audit, giữ nguyên nội dung khách đã viết. |

**Thứ tự thực hiện:** danh mục/hồ sơ/địa chỉ → dịch vụ và tìm kiếm → tra cứu đơn → đánh giá → thu nhập/dashboard/báo cáo.

Cường chủ động triển khai controller, DTO, validation, service, repository và tài liệu API cho phần được giao. UC10/UC40 chờ cấu trúc đơn của Thuỷ. UC23/UC32/UC34 triển khai theo định nghĩa tài chính Lâm duyệt; không suy thu nhập đã nhận từ số yêu cầu chi đang chờ hoặc thất bại.

## 3. Phân công frontend

| Khu vực/chức năng | TLam | Minh |
| --- | --- | --- |
| Trang giới thiệu | Trang chủ, header/footer và responsive. | — |
| Xác thực dùng chung | Đăng nhập theo vai trò, đăng ký khách, OTP, khôi phục mật khẩu, đổi mật khẩu lần đầu và bảo vệ route. | Tích hợp trạng thái/quyền vào khu vực NCC/admin. |
| Đăng ký NCC | Nộp hồ sơ, xác thực email và kết quả nộp. | — |
| Khách tìm dịch vụ | Danh sách, bộ lọc, chi tiết, hồ sơ NCC và xem lịch rảnh. | — |
| Khách đặt/quản lý đơn | Chọn lịch/địa chỉ, tạo đơn, theo dõi và hủy đơn. | — |
| Thanh toán của khách | Trả cọc/phần còn lại, trạng thái giao dịch và lịch sử thu/hoàn. | — |
| Tài khoản khách | Hồ sơ, địa chỉ, đánh giá, gửi/theo dõi hỗ trợ. | — |
| Khu vực NCC | — | Hồ sơ, dịch vụ/ảnh và lịch rảnh. |
| Đơn của NCC | — | Danh sách/chi tiết, nhận/từ chối/hủy, bắt đầu/hoàn thành. |
| Tài chính NCC | — | Thu nhập, ngân hàng và lịch sử chi trả. |
| Admin cơ bản | Người dùng, duyệt NCC và danh mục. | — |
| Admin vận hành | — | Đơn, giao dịch, hoàn tiền, đối soát/chi trả, khiếu nại, kiểm duyệt đánh giá, dashboard/báo cáo. |
| Chat | Component và logic dùng chung, tích hợp phía khách. | Tích hợp vào khu vực NCC/admin bằng phần dùng chung. |

### 3.1. Chủ sở hữu phần FE dùng chung

| Thành phần | Người phụ trách chính |
| --- | --- |
| Router tổng, auth store, bảo vệ route theo vai trò | TLam |
| API client, xử lý hết phiên | TLam |
| Component và logic chat dùng chung | TLam |
| Dashboard layout, sidebar theo vai trò | Minh |
| Bảng dữ liệu, phân trang, badge trạng thái dùng chung | Minh |
| Quy ước màu sắc, typography, spacing và component | Cả hai thống nhất theo guideline FE |

Mỗi người bàn giao đủ giao diện, validation, gọi API, trạng thái tải/lỗi/rỗng, xử lý quyền và responsive cho phần được giao. BE chưa có API thì dùng dữ liệu mẫu theo hợp đồng request/response đã thống nhất.

## 4. Ranh giới phối hợp backend

| Điểm giao nhau | Chủ trì | Cách phối hợp |
| --- | --- | --- |
| Account và phiên | Lâm | Cường dùng nghiệp vụ cập nhật hồ sơ/khóa/mở khóa đã thống nhất. Cơ chế phiên bảo đảm tài khoản bị khóa không tiếp tục thao tác trái quyền. |
| Hồ sơ NCC | Lâm/Cường | Lâm tạo profile khi duyệt và quản lý trường ngân hàng; Cường quản lý trường công khai. Thống nhất entity/migration và cập nhật đúng nhóm trường để tránh ghi đè. |
| Dịch vụ → đơn | Cường/Thuỷ | Catalog cung cấp thông tin và điều kiện được đặt. Thuỷ kiểm tra lại tại thời điểm tạo/nhận đơn và lưu snapshot; sửa dịch vụ không đổi đơn cũ. |
| Địa chỉ → đơn | Cường/Thuỷ | Xác minh địa chỉ thuộc khách, chụp dữ liệu vào đơn; sửa/lưu trữ địa chỉ không sửa lịch sử đơn. |
| Lịch rảnh ↔ nhận đơn | Thuỷ | Dùng chung quy tắc khoảng thời gian, khóa NCC và kiểm tra xung đột trong transaction. |
| Đơn ↔ thu/hoàn tiền | Thuỷ/Lâm | Thuỷ sở hữu trạng thái dịch vụ; Lâm sở hữu chứng từ tiền. Thống nhất hợp đồng, khóa, transaction và nghĩa vụ hoàn khi hủy/callback đến muộn. |
| Đơn → API tra cứu | Thuỷ/Cường | Thuỷ sở hữu entity và nghiệp vụ ghi; Cường làm query/DTO đọc, không cập nhật trạng thái qua API tra cứu. |
| Khiếu nại ↔ chi trả | Thuỷ/Lâm | Thuỷ quản lý khiếu nại; Lâm kiểm tra khiếu nại chưa xử lý trước khi chốt/lập/gửi khoản chi. Đóng khiếu nại không tự tạo hoàn tiền. |
| Báo cáo tài chính | Lâm/Cường | Lâm chốt nguồn, công thức và thời điểm ghi nhận; Cường triển khai query/xuất báo cáo, Lâm review kết quả. |
| Audit | Lâm cung cấp, các BE tích hợp | Ghi hành động quản trị trong transaction liên quan; chỉ ghi thêm, loại dữ liệu bí mật. |

Người phụ trách backend của từng nhóm bảng chịu trách nhiệm migration tương ứng. Với bảng có nhiều phần cùng sử dụng như accounts, provider_profiles và bookings, thống nhất một người sửa entity/migration cho từng thay đổi; các bên review trước khi tích hợp. Lâm chủ trì accounts/provider_profiles; Thuỷ chủ trì bookings.

Các quy tắc nhận đơn, hủy, thu tiền, hoàn tiền và chi trả được kiểm tra tại backend. Frontend lấy trạng thái do backend xác minh để hiển thị; kết quả chuyển hướng từ trang thanh toán không tự xác nhận đã thu tiền.

## 5. Đầu mối kết nối FE–BE

| Chức năng | Backend | Frontend |
| --- | --- | --- |
| Xác thực, OTP, nộp/duyệt NCC | Lâm | TLam |
| Dịch vụ, danh mục, hồ sơ, địa chỉ | Cường | TLam phía khách/admin cơ bản; Minh phía NCC |
| Lịch và thao tác đơn | Thuỷ | TLam phía khách; Minh phía NCC/admin |
| Tra cứu đơn | Cường | TLam phía khách; Minh phía NCC |
| Thu tiền/hoàn tiền/chi trả | Lâm | TLam phía khách; Minh phía NCC/admin |
| Đánh giá | Cường | TLam phía khách; Minh phía NCC/admin |
| Chat/hỗ trợ | Thuỷ | TLam phần dùng chung/khách; Minh phía NCC/admin |
| Thu nhập/dashboard/báo cáo | Cường; Lâm review chỉ số tiền | Minh |

Trước khi code mỗi luồng, người BE và FE liên quan chốt endpoint, request/response, enum, phân trang, định dạng thời gian/tiền và lỗi validation. Mỗi file dùng chung có người phụ trách chính; các bên trao đổi trước khi sửa.

## 6. Các mốc triển khai

Chưa gán ngày hoàn thành vì nhóm chưa chốt thời hạn và thời gian làm việc. Các mốc dưới đây thể hiện thứ tự phụ thuộc và kết quả có thể demo.

| Mốc | Công việc chính | Điều kiện nghiệm thu |
| --- | --- | --- |
| 1. Nền tảng và tài khoản | Lâm làm bảo mật/OTP/đăng ký/duyệt; Thuỷ dựng mô hình đơn và quy tắc lịch; Cường làm danh mục/hồ sơ/địa chỉ; TLam làm router/xác thực; Minh làm dashboard layout. | Khách đăng ký/xác thực/đăng nhập được; NCC nộp hồ sơ, admin duyệt, NCC đổi mật khẩu lần đầu. |
| 2. Có dịch vụ để đặt | Cường làm dịch vụ/tìm kiếm; Thuỷ làm lịch rảnh; TLam làm tra cứu; Minh làm quản lý dịch vụ/lịch NCC. | NCC đăng được dịch vụ/lịch; khách tìm và xem được dịch vụ, địa chỉ và khoảng phù hợp. |
| 3. Hoàn thành một đơn | Thuỷ làm vòng đời đơn; Lâm làm thu cọc/phần còn lại; Cường làm API xem đơn; hai FE nối đầy đủ luồng. | Khách đặt → NCC nhận → trả cọc → bắt đầu → hoàn thành → trả phần còn lại, trạng thái thống nhất ở mọi vai trò. |
| 4. Ngoại lệ và chi trả | Thuỷ làm hủy/hết hạn; Lâm làm hoàn/đối soát/chi trả; hai FE xử lý kết quả và trạng thái chưa rõ. | Hủy/hoàn đúng chính sách; chống tác động tiền lặp; ghi nhận nghĩa vụ và chi trả đúng trạng thái. |
| 5. Giao tiếp và hoàn thiện | Thuỷ làm chat/hỗ trợ; Cường làm đánh giá/báo cáo; hai FE tích hợp và kiểm tra chéo. | Chat/hỗ trợ đúng quyền; khiếu nại chặn khoản chưa chi theo chính sách; đánh giá và báo cáo đúng dữ liệu nguồn. |

Các phần độc lập có thể làm song song. Hoàn thành mốc được xác định bằng kết quả tích hợp trên cùng bộ dữ liệu khách/NCC/admin.

## 7. Điều kiện bàn giao và review

### Backend

- Có API, DTO/validation, kiểm tra vai trò và chủ sở hữu, xử lý lỗi, tài liệu request/response và migration cần thiết.
- Có hướng dẫn kiểm tra cùng dữ liệu mẫu; kiểm tra tự động phù hợp cho các quy tắc nghiệp vụ có rủi ro.
- Lâm kiểm tra đăng ký/duyệt lặp, OTP, thu hồi phiên, callback lặp/muộn, sai số tiền, giao dịch UNKNOWN, tính hoàn/chia tiền và chứng từ chi trả.
- Thuỷ kiểm tra nhận đơn đồng thời, sửa lịch khi có đơn, khoảng [bắt đầu, kết thúc), mốc hủy 30 phút, deadline khi job chưa chạy và quyền chat/hỗ trợ.
- Cường kiểm tra truy cập dữ liệu khác chủ, ẩn/lưu trữ dữ liệu, địa chỉ mặc định, đánh giá trùng và đối chiếu số liệu báo cáo.

### Frontend

- Gọi được API thật cho phần đã tích hợp, có trạng thái tải/lỗi/rỗng và thông báo kết quả rõ ràng.
- Kiểm tra route/quyền, hết phiên, responsive và giữ dữ liệu nhất quán sau thao tác.
- Dùng enum và quy tắc hiển thị đã thống nhất với BE; phân biệt đang xử lý, thành công, thất bại và chưa rõ kết quả.

### Review

| Người thực hiện | Người review chính |
| --- | --- |
| Lâm | Thuỷ; ưu tiên bảo mật, transaction và giao tiếp giữa đơn với tiền. |
| Thuỷ | Lâm; ưu tiên lịch/trạng thái, đồng thời và nghĩa vụ hoàn/giữ chi. |
| Cường | Thuỷ cho nghiệp vụ chung; Lâm cho khóa tài khoản và chỉ số tài chính. |
| TLam | Minh review FE; BE phụ trách kiểm tra tích hợp API. |
| Minh | TLam review FE; BE phụ trách kiểm tra tích hợp API. |

## 8. Phạm vi đang hoãn và thay đổi phân công

- UC15 và UC26: thông báo trong ứng dụng, chưa triển khai ở đợt này.
- Giữ phạm vi bản đầu theo tài liệu nghiệp vụ/database: không tự bổ sung giỏ hàng, nhân viên nhiều lịch song song, đổi lịch/giá đơn, ví nội bộ hoặc hoàn tùy ý sau khi đã chi trả.
- Khi đổi người phụ trách, cập nhật bảng use case và đầu mối FE–BE trong tài liệu này. Không để một use case có hai chủ sở hữu backend hoặc không có người chịu trách nhiệm.

**Kiểm soát phạm vi:** Lâm 20 + Thuỷ 13 + Cường 17 = 50 use case triển khai; 2 use case đang hoãn; tổng cộng 52 mã UC trong đặc tả.
