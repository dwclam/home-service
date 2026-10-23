# Nestify — Kế hoạch triển khai 5 tuần

**Ngày cập nhật:** 22/10/2026.  
**Nhóm:** Lâm, Thuỷ, Cường, TLam, Minh.  
**Quỹ thời gian Lâm xác nhận:** 8–12 giờ/người/tuần.  
**Tài liệu đối chiếu:** [Phân công nhóm](phan-cong-nhom.md), [Use case](usecase-final.md), [Database final](database-design-final.md).

## 1. Quỹ thời gian và mục tiêu

| Nội dung | Ước tính theo quỹ thời gian đã cung cấp |
| --- | --- |
| Mỗi người trong 5 tuần | 40–60 giờ |
| Cả nhóm trong 5 tuần | 200–300 giờ |
| Tuần 1–4, cả nhóm | 160–240 giờ, gồm phát triển, review, tích hợp và ghi tài liệu |
| Tuần 1–4, riêng 3 BE | 96–144 giờ cho toàn bộ backend |
| Tuần 5, cả nhóm | 40–60 giờ cho kiểm tra, sửa lỗi, đóng gói và demo |

Với nền mã hiện tại và mức kinh nghiệm của nhóm, không nên cam kết hoàn thiện toàn bộ 50 UC trong quỹ thời gian này. Kế hoạch đề xuất một phạm vi cốt lõi có thể demo đầy đủ, rồi mở rộng theo thời gian còn lại.

- **P0 — mục tiêu cốt lõi:** 27 UC phục vụ tài khoản, duyệt NCC, dịch vụ, lịch, đặt đơn, thu tiền và tra cứu đơn.
- **P1 — mở rộng tiếp:** 13 UC về khôi phục/quản lý tài khoản, hủy/hoàn, hỗ trợ, đối soát/chi trả và admin vận hành.
- **P2 — mở rộng sau:** 10 UC về đánh giá, chat khách–NCC, hồ sơ khách/sổ địa chỉ, thu nhập và báo cáo.
- **Đã hoãn theo đặc tả:** UC15/UC26 về thông báo trong ứng dụng.

P0/P1/P2 là **đề xuất ưu tiên**, chưa phải quyết định bỏ hoặc hoãn thêm use case. Giữ nguyên người phụ trách 50 UC trong bản phân công; nhóm cần đối chiếu phạm vi đề xuất với yêu cầu môn học. Nếu bắt buộc đủ 50 UC, cần tăng thời gian làm hoặc thống nhất lại yêu cầu trước khi chốt kế hoạch.

Tuần 1 tính từ ngày bắt đầu chính thức, chưa gán ngày lịch. Mục tiêu cuối tuần 3 là chạy được luồng chính; tuần 4 hoàn thiện P0 và chỉ mở rộng khi còn khả năng; tuần 5 kiểm tra/sửa lỗi/demo.

## 2. Phạm vi ưu tiên

### 2.1. P0 — 27 use case cốt lõi

| Người | Use case | Kết quả |
| --- | --- | --- |
| Lâm | UC01, UC02, UC03, UC16, UC17, UC27, UC28, UC35, UC36, UC42 | Đăng ký/xác thực/đăng nhập/đăng xuất, nộp và duyệt NCC, đổi mật khẩu lần đầu. Dùng chung cơ chế xác thực cho các vai trò. |
| Lâm | UC09, UC43, UC49 | Cọc, trả phần còn lại, xác minh thông báo cổng, xử lý lặp/muộn và ghi nhận tiền thực. |
| Thuỷ | UC08, UC20, UC21, UC22, UC38, UC51 | Lịch rảnh, tạo/nhận/từ chối đơn, bắt đầu/hoàn thành và hết hạn; chống xung đột lịch. |
| Cường | UC05, UC06, UC07, UC10, UC18, UC19, UC30, UC40 | Dịch vụ, danh mục, hồ sơ NCC và tra cứu đơn khách/NCC. |

**Luồng demo P0:** khách đăng ký/OTP → nộp và duyệt NCC → NCC đổi mật khẩu → đăng dịch vụ/mở lịch → khách tìm/chọn lịch/nhập địa chỉ → tạo đơn → NCC nhận → cọc → bắt đầu/hoàn thành → trả phần còn lại.

Địa chỉ được nhập trực tiếp và chụp vào đơn; sổ địa chỉ UC37 thuộc P2, phù hợp việc address_id có thể NULL trong thiết kế. P0 không bao gồm đánh giá, chat, dashboard tài chính, tự hủy sau khi có tiền hoặc quy trình chi trả NCC hoàn chỉnh. Các phần chưa có phải được mô tả đúng trong báo cáo/demo.

Thu tiền sai/đến muộn vẫn phải được lưu và nhận diện khoản cần hoàn. Nếu UC50 chưa triển khai, không hiển thị đã hoàn hoặc đã trả tiền khi chưa có kết quả xác minh. Phần cổng thanh toán dùng sandbox; giao dịch mô phỏng phải có nhãn rõ.

### 2.2. P1 — 13 use case mở rộng tiếp

| Nhóm | Use case | Phụ trách và điều kiện |
| --- | --- | --- |
| Khôi phục/quản lý tài khoản | UC04, UC29 | Lâm/Cường. Cường dùng cơ chế khóa và phiên của Lâm. |
| Hủy và hoàn tiền | UC11, UC41, UC45, UC46, UC50 | Thuỷ/Lâm. Làm trọn điều kiện hủy, nghĩa vụ hoàn, chứng từ, kết quả và màn hình liên quan. |
| Hỗ trợ/khiếu nại | UC33, UC39 | Thuỷ; TLam/Minh làm FE. Phải có kiểm tra quyền và thông tin cần để giữ chi trả. |
| Ngân hàng, đối soát và chi trả | UC44, UC47, UC48 | Lâm; Minh làm FE. Phụ thuộc nghĩa vụ hoàn và điều kiện khiếu nại đã được xử lý đầy đủ. |
| Admin vận hành đơn | UC31 | Thuỷ; Minh làm FE. Thao tác theo hành động hợp lệ, có lý do và lịch sử. |

Chọn nhóm P1 dựa trên giá trị nghiệm thu và thời gian còn lại; không lập lịch chắc chắn hoàn thành cả 13 UC trong tuần 4. Phần có tiền phải được bàn giao theo luồng hoàn chỉnh trước khi đưa vào demo.

### 2.3. P2 — 10 use case mở rộng sau

| Nhóm | Use case | Backend |
| --- | --- | --- |
| Đánh giá/kiểm duyệt | UC12, UC25, UC52 | Cường |
| Chat khách–NCC | UC13, UC24 | Thuỷ |
| Hồ sơ khách và sổ địa chỉ | UC14, UC37 | Cường |
| Thu nhập/dashboard/báo cáo | UC23, UC32, UC34 | Cường; Lâm review định nghĩa tiền |

Nếu môn học ưu tiên một mục P1/P2, nhóm có thể đổi thứ tự triển khai sau khi rà các phụ thuộc. Báo cáo phải phân biệt hoàn thành, một phần và chưa triển khai theo từng UC.

## 3. Hai ngày đầu tuần 1

Các việc dưới đây nằm trong quỹ 8–12 giờ của tuần 1; chỉ dành khoảng 1–2 giờ mỗi người để thống nhất và khởi tạo, sau đó chuyển sang API/màn hình đầu tiên.

| Việc | Chủ trì | Đầu ra |
| --- | --- | --- |
| Chốt phạm vi theo yêu cầu môn học | Lâm cùng cả nhóm | Xác nhận P0/P1/P2, mốc bắt đầu, mặc định nghiệp vụ và yêu cầu demo. |
| Bảo mật và hợp đồng API | Lâm với Thuỷ, TLam, Minh | Tài khoản đang đăng nhập, lỗi, phân trang, enum, thời gian/tiền, dữ liệu mẫu cho luồng chính. |
| Database và migration | Từng BE phụ trách bảng của mình | Khởi tạo được database, có tài khoản phát triển khách/NCC/admin và dữ liệu có thể tạo lại. |
| Lịch và đơn | Thuỷ với Lâm/Cường | Mô hình trạng thái, cấu trúc đơn, snapshot và hợp đồng xác nhận cọc. |
| Khung FE | TLam/Minh | Router, API client, layout, form/bảng/badge dùng chung. |
| Email và sandbox thanh toán | Lâm | Kiểm tra thông tin kết nối, cách nhận thông báo và giới hạn API; thử kết nối ngay tuần 1. |

Dữ liệu seed NCC/admin chỉ phục vụ phát triển; vẫn nghiệm thu luồng nộp/duyệt NCC ở tuần 2. Phụ thuộc bên ngoài được ghi lại sớm, không đợi tuần tích hợp mới thử lần đầu.

## 4. Công việc từng tuần

### Tuần 1 — Nền tảng và tài khoản

| Thành viên | Bàn giao |
| --- | --- |
| Lâm | Cơ chế phiên/vai trò, email/OTP; đăng ký/xác thực/đăng nhập/đăng xuất. Các vai trò dùng chung cơ chế xác thực. Kiểm tra kết nối sandbox sớm. |
| Thuỷ | Entity/trạng thái/lịch sử đơn, hợp đồng payment; quản lý lịch và tính khoảng phù hợp trên dữ liệu mẫu. Review API đầu của Cường. |
| Cường | Danh mục và cập nhật hồ sơ NCC trên dữ liệu seed. Chốt mẫu controller/service/repository/DTO/validation để tái sử dụng. |
| TLam | Router/auth store/API client; nối đăng ký, OTP, đăng nhập, đăng xuất. Dựng các form tài khoản/NCC tiếp theo từ component chung. |
| Minh | Dashboard layout/sidebar/bảng/badge; form hồ sơ/dịch vụ/lịch theo hợp đồng, nối API đã sẵn sàng. |

**Mốc demo:** khách đăng ký → xác thực → đăng nhập → đăng xuất qua FE–BE; có tài khoản phát triển NCC/admin. Khung dữ liệu đơn và hợp đồng API đã được chia sẻ.

### Tuần 2 — Dịch vụ và đơn chờ cọc

| Thành viên | Bàn giao |
| --- | --- |
| Lâm | Nộp/xác thực/duyệt NCC, cấp tài khoản, đổi mật khẩu lần đầu. Bắt đầu tạo giao dịch cọc và xử lý kết quả sandbox. |
| Thuỷ | Tạo đơn/snapshot, nhận/từ chối, khóa lịch và kiểm tra hai yêu cầu tranh chỗ. |
| Cường | Dịch vụ/ảnh, bộ lọc theo đặc tả, chi tiết dịch vụ và hồ sơ NCC công khai. |
| TLam | Nộp/duyệt NCC; tìm và xem dịch vụ, chọn lịch, nhập địa chỉ trực tiếp và tạo đơn. Hoàn thiện trang danh mục admin tối thiểu. |
| Minh | Nối hồ sơ/dịch vụ/lịch NCC, danh sách và nhận/từ chối đơn. |

**Mốc demo:** nộp/duyệt NCC → đăng dịch vụ/mở lịch → khách đặt → NCC nhận → chờ cọc. Hai đơn trùng khung chỉ một đơn giữ được chỗ.

### Tuần 3 — Thu tiền và hoàn thành một đơn

| Thành viên | Bàn giao |
| --- | --- |
| Lâm | Cọc, callback xác thực, thu phần còn lại; kiểm tra callback lặp/sai tiền/muộn và lưu khoản cần hoàn khi có. |
| Thuỷ | Bắt đầu/hoàn thành, hạn trả phần còn lại, hết hạn/nhả lịch và kiểm tra deadline ngay tại endpoint. |
| Cường | Danh sách/chi tiết đơn của khách và NCC; đúng quyền sở hữu và dữ liệu tiền do Lâm cung cấp. |
| TLam | Tra cứu đơn, trả cọc/phần còn lại, kết quả thanh toán và các trạng thái tải/lỗi/chờ xác minh. |
| Minh | Tra cứu và thao tác đơn NCC; hiển thị nhất quán trạng thái và thời điểm thực hiện. |

**Mốc demo:** đặt → nhận → cọc → bắt đầu → hoàn thành → trả phần còn lại. Mọi vai trò nhìn cùng trạng thái; callback lặp không cộng tiền hai lần; redirect trình duyệt không tự xác nhận thanh toán.

### Tuần 4 — Hoàn thiện P0 và mở rộng có điều kiện

| Thành viên | Ưu tiên |
| --- | --- |
| Lâm | Sửa lỗi xác thực/tiền và hỗ trợ kiểm tra P0. Nếu đạt mốc sớm, phối hợp nhóm chọn phần P1 đủ thời gian làm trọn luồng. |
| Thuỷ | Kiểm tra lịch/đồng thời/hết hạn, sửa lỗi P0; hỗ trợ Cường và ghép nghiệp vụ P1 nếu được chọn. |
| Cường | Kiểm tra dữ liệu khác chủ, phân trang, lưu trữ dịch vụ và tính đúng snapshot đơn; hỗ trợ dữ liệu demo/P1. |
| TLam | Hoàn thiện giao diện khách/admin cơ bản, lỗi/validation/responsive, tích hợp P1 được nhóm chọn. |
| Minh | Hoàn thiện giao diện NCC, lỗi/validation/responsive; làm màn P1 tương ứng nếu backend có kế hoạch bàn giao. |

**Điều kiện nhận thêm việc:** P0 chạy được liên tục trên dữ liệu chung, không còn lỗi chặn luồng chính hoặc lỗi quyền/tiền; có ước lượng và người BE/FE cho cả luồng P1. Cuối tuần chốt chức năng, ghi rõ UC hoàn thành/một phần/chưa có.

### Tuần 5 — Kiểm tra, sửa lỗi và bảo vệ

| Thành viên | Bàn giao |
| --- | --- |
| Lâm | Kiểm tra bảo mật/tiền; cấu hình môi trường/email/sandbox; phần báo cáo về xác thực và dòng tiền. |
| Thuỷ | Kiểm tra đồng thời/deadline/trạng thái; sửa lỗi, sơ đồ trạng thái và kịch bản ngoại lệ. |
| Cường | Tạo lại dữ liệu demo; kiểm tra CRUD/quyền/query; tổng hợp ca kiểm thử và đối chiếu kết quả. |
| TLam | Kiểm tra luồng khách/admin cơ bản; sửa FE, hướng dẫn thao tác và phần trình bày luồng khách. |
| Minh | Kiểm tra NCC và các màn admin đã làm; sửa FE, đóng gói frontend và phần trình bày NCC/admin. |

Mỗi người dự kiến chia 8–12 giờ tuần cuối: 2–3 giờ kiểm tra chéo, 3–5 giờ sửa lỗi/kiểm tra lại, 2–3 giờ tài liệu/diễn tập, phần còn lại dự phòng. Chạy lại từ database mới và diễn tập ít nhất hai lượt trên cùng môi trường sẽ dùng để demo. Báo cáo và ghi quyết định được cập nhật từ các tuần trước, không dồn toàn bộ vào tuần này.

## 5. Hạn hoàn thành mục tiêu của P0

Mỗi UC xuất hiện một lần trong bảng; công việc có thể bắt đầu sớm hơn tuần ghi dưới đây. Tuần 4 ổn định P0, tuần 5 nghiệm thu lại.

| Tuần | Lâm | Thuỷ | Cường |
| --- | --- | --- | --- |
| 1 | UC01, UC02, UC03, UC17, UC27, UC35 | UC20, UC38 | UC18, UC30 |
| 2 | UC16, UC28, UC36, UC42 | UC08, UC21 | UC05, UC06, UC07, UC19 |
| 3 | UC09, UC43, UC49 | UC22, UC51 | UC10, UC40 |

P0 có Lâm 13 UC, Thuỷ 6 UC, Cường 8 UC. Lâm vẫn là người dễ bị dồn việc nhất; Thuỷ hỗ trợ review/tích hợp và Cường cung cấp dữ liệu/query kịp thời. Nếu xác thực hoặc thanh toán chậm, ưu tiên hỗ trợ hai phần này trước khi mở P1/P2.

## 6. Nhịp làm việc

- Đầu tuần họp 15–20 phút chốt đầu ra và phần đang bị chặn; cuối tuần demo 20–30 phút bằng dữ liệu chung. Giới hạn thời gian họp để giữ quỹ lập trình.
- Chia việc thành phần làm được trong một buổi 2–3 giờ; gửi PR nhỏ sớm. Cường nhận review ngay API đầu tiên để tránh lặp cách làm sai.
- Tích hợp ít nhất hai lần/tuần; FE nối API thật từng phần từ tuần 1. Dữ liệu mẫu theo hợp đồng giúp tiếp tục làm phần chưa có API.
- Bị chặn qua một buổi làm thì báo lỗi/phụ thuộc và đầu ra cần hỗ trợ. Lâm/Thuỷ hỗ trợ phần khó; người được giao tiếp tục hoàn thiện phần bàn giao.
- Theo dõi: Chưa làm → Đang làm → Chờ review → Chờ tích hợp → Đã nghiệm thu. Dùng dữ liệu mẫu không đồng nghĩa đã nghiệm thu luồng tích hợp.
- Mỗi người ghi request/response, cách kiểm tra và giới hạn của phần mình ngay khi bàn giao; dùng các ghi chú này để tổng hợp báo cáo.

## 7. Kiểm tra bắt buộc với phạm vi đã triển khai

| Nhóm | Kết quả cần kiểm chứng | Chủ trì |
| --- | --- | --- |
| Tài khoản | OTP sai/hết hạn bị từ chối, duyệt NCC lặp không tạo trùng, đăng xuất thu hồi phiên, NCC chưa đổi mật khẩu bị giới hạn. | Lâm |
| Quyền dữ liệu | Khách/NCC không đọc/sửa đơn hoặc hồ sơ khác chủ; API hồ sơ công khai không lộ ngân hàng/hồ sơ xét duyệt. | Cường và BE sở hữu chức năng |
| Lịch | Nhận hai đơn cùng khung chỉ một đơn giữ chỗ; khoảng kết thúc 10:00 không chặn khoảng bắt đầu 10:00; không sửa lịch làm mất chỗ. | Thuỷ |
| Deadline | Endpoint kiểm tra hạn dù job chưa chạy; tiền muộn không hồi sinh đơn và được ghi nhận để xử lý tiếp. | Thuỷ/Lâm |
| Tiền | Callback lặp không cộng tiền hai lần; xác minh chữ ký/số tiền/tham chiếu; không xác nhận thu tiền từ redirect; trạng thái chưa rõ không bị coi là thất bại để thu lại ngay. | Lâm |
| Snapshot | Sửa dịch vụ không đổi giá/thời lượng/địa chỉ đã chụp trên đơn cũ. | Thuỷ/Cường |
| P1 nếu có | Hủy/hoàn đúng tỷ lệ và chứng từ; chi trả kiểm tra khiếu nại/ngân hàng và kết quả thực tế; API khóa tài khoản có hiệu lực với phiên. | Lâm/Thuỷ/Cường theo phần đã làm |
| Demo | Khởi tạo database mới, chạy theo README, dùng các vai trò trên cùng dữ liệu và diễn tập cả luồng bình thường lẫn lỗi. | Cả nhóm |

## 8. Khi tiến độ lệch kế hoạch

1. Cuối tuần 1 đánh giá lại bằng API đã ghép được và số giờ thực tế; ghi phụ thuộc email/sandbox ngay khi phát hiện. Nếu thấp hơn 8–12 giờ, giảm phạm vi đề xuất sớm.
2. Cuối tuần 2 chưa tạo/nhận được đơn thì tuần 3 tập trung phục hồi luồng này; không mở thêm P1/P2.
3. Nếu P0 chưa ổn cuối tuần 3, tuần 4 dành toàn bộ để hoàn thiện và kiểm tra; ghi rõ các mục mở rộng chưa triển khai.
4. Ưu tiên component/form/bảng sẵn có, responsive đủ dùng và số liệu đúng. Báo cáo mở rộng có thể xuất CSV cơ bản; tránh thêm biểu đồ/bộ lọc ngoài yêu cầu.
5. Giao dịch mô phỏng phải có nhãn và được phân biệt với kết quả sandbox/tiền thật. Khả năng API ngoài chưa được cấp không được ghi thành tích hợp thành công.
6. Nếu cần điều chỉnh phạm vi chính thức, nhóm đối chiếu yêu cầu môn học rồi cập nhật tài liệu. P1/P2 hiện vẫn là công việc đã phân công trong backlog, chưa tự động trở thành các UC được phép bỏ.

**Kiểm soát phạm vi:** P0 27 + P1 13 + P2 10 = 50 UC đã phân công; UC15/UC26 là 2 UC đã hoãn theo đặc tả.
