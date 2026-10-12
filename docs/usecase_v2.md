# Use case v2 - Nền tảng đặt dịch vụ tại nhà

**Mục đích:** Rà soát actor, chức năng và các quy tắc đã thống nhất. Chưa phải đặc tả API hoặc cơ sở dữ liệu.

Mã UC01-UC34 giữ từ `usecase.md` để dễ đối chiếu. Mã UC35 trở đi là chức năng bổ sung. Mục ghi **Đề xuất** chưa được chốt.

## 1. Actor

| Actor | Mô tả | Quyền chính |
|---|---|---|
| **Khách truy cập** | Người chưa đăng nhập | Đăng ký khách hàng, nộp hồ sơ NCC, đăng nhập, quên mật khẩu. **Không được xem dịch vụ.** |
| **Khách hàng** | Người có tài khoản khách hàng đã xác thực email | Xem dịch vụ, đặt lịch, thanh toán cọc, theo dõi/hủy đơn, đánh giá và trao đổi với NCC. |
| **Người đăng ký làm NCC** | Người đã nộp hồ sơ nhưng chưa được admin duyệt | Xác thực email và nhận kết quả xét duyệt; chưa có quyền NCC. |
| **Nhà cung cấp (NCC)** | Người có tài khoản được tạo sau khi admin duyệt hồ sơ | Quản lý hồ sơ, dịch vụ, lịch rảnh và đơn hàng; trao đổi với khách hàng. |
| **Quản trị viên (Admin)** | Người vận hành nền tảng, có tài khoản do hệ thống cấp | Duyệt hồ sơ NCC, quản lý người dùng, danh mục, đơn hàng và khiếu nại. |
| **Cổng thanh toán** | Hệ thống ngoài | Xử lý thanh toán cọc và hoàn tiền. |
| **Dịch vụ email** | Hệ thống ngoài | Gửi OTP, kết quả duyệt, thông tin tài khoản NCC và email đặt lại mật khẩu. |

**Quy tắc tài khoản:** Một email chỉ được dùng cho **một loại tài khoản**, khách hàng hoặc NCC. Khi tiếp nhận đăng ký phải kiểm tra tài khoản đã có và hồ sơ NCC đang chờ duyệt. Hồ sơ chờ duyệt chưa phải tài khoản NCC đã kích hoạt.

## 2. Danh sách use case

### 2.1. Khách truy cập và người đăng ký làm NCC

| Mã | Use case | Actor | Ghi chú |
|---|---|---|---|
| UC01 | Đăng ký tài khoản khách hàng | Khách truy cập | Tài khoản chỉ sử dụng được sau khi xác thực email. |
| UC02 | Đăng nhập | Khách truy cập | Dùng cho khách hàng hoặc NCC đã có tài khoản. |
| UC04 | Quên/đặt lại mật khẩu | Khách truy cập | Xác minh quyền sở hữu email trước khi đặt lại. |
| UC16 | Gửi hồ sơ đăng ký làm NCC | Khách truy cập | Hồ sơ có email; chưa tạo tài khoản NCC ở bước này. |
| UC35 | Xác thực email đăng ký khách hàng bằng OTP | Khách truy cập | OTP gửi tới email vừa đăng ký. |
| UC36 | Xác thực email nộp hồ sơ NCC bằng OTP | Người đăng ký làm NCC | Hoàn tất trước khi hồ sơ vào hàng chờ duyệt. |

### 2.2. Khách hàng

| Mã | Use case | Ghi chú |
|---|---|---|
| UC03 | Đăng xuất | Kết thúc phiên đăng nhập. |
| UC05 | Tìm kiếm/lọc dịch vụ | Yêu cầu đã đăng nhập. |
| UC06 | Xem chi tiết dịch vụ | Yêu cầu đã đăng nhập. |
| UC07 | Xem hồ sơ NCC | Yêu cầu đã đăng nhập. |
| UC08 | Đặt lịch dịch vụ | Chọn dịch vụ, thời gian và địa chỉ; mọi đơn đều cần đặt cọc. |
| UC09 | Thanh toán tiền cọc | Tiền cọc bằng 30% giá trị đơn hàng. |
| UC10 | Xem danh sách/chi tiết đơn hàng | Theo dõi trạng thái và lịch hẹn. |
| UC11 | Hủy đơn hàng | Tiền hoàn phụ thuộc thời điểm hủy so với giờ hẹn. |
| UC12 | Đánh giá dịch vụ | Điều kiện đánh giá cần quy định khi đặc tả chi tiết. |
| UC13 | Chat với NCC | Trao đổi về dịch vụ/đơn hàng. |
| UC14 | Quản lý hồ sơ cá nhân | Cập nhật thông tin được phép sửa. |
| UC15 | Xem thông báo | Bao gồm thay đổi trạng thái đơn và kết quả thanh toán. |
| UC37 | **Đề xuất:** Quản lý địa chỉ sử dụng dịch vụ | Thêm, sửa, xóa và chọn địa chỉ khi đặt lịch. |
| UC38 | **Đề xuất:** Xem lịch rảnh và giá dịch vụ | Xem trước khi xác nhận đặt lịch. |
| UC39 | **Đề xuất:** Gửi khiếu nại/yêu cầu hỗ trợ | Tạo yêu cầu để admin xử lý; v1 chỉ có phía admin. |

### 2.3. Nhà cung cấp

| Mã | Use case | Ghi chú |
|---|---|---|
| UC17 | Đăng nhập NCC | Tài khoản chỉ có sau khi hồ sơ được duyệt. |
| UC18 | Quản lý hồ sơ NCC | Cập nhật thông tin NCC. |
| UC19 | Quản lý dịch vụ | Tạo, sửa và quản lý dịch vụ cung cấp. |
| UC20 | Quản lý lịch rảnh | Quản lý khung giờ có thể nhận lịch. |
| UC21 | Chấp nhận/từ chối đơn | Nếu từ chối đơn đã thu cọc, khách được hoàn 100% tiền cọc. |
| UC22 | Cập nhật trạng thái đơn | Theo dõi quá trình thực hiện dịch vụ. |
| UC23 | Xem thu nhập | Xem số liệu liên quan đến các đơn. |
| UC24 | Chat với khách hàng | Trao đổi về dịch vụ/đơn hàng. |
| UC25 | Xem đánh giá | Xem đánh giá từ khách hàng. |
| UC26 | Xem thông báo | Bao gồm đơn mới và thay đổi trạng thái đơn. |
| UC40 | Xem danh sách/chi tiết đơn được giao | Xem thông tin trước khi chấp nhận hoặc từ chối. |
| UC41 | Hủy đơn đã chấp nhận | Khách được hoàn 100% tiền cọc. |
| UC42 | Đổi mật khẩu ở lần đăng nhập đầu | Bắt buộc trước khi dùng các chức năng NCC khác. |

NCC cũng dùng UC03 để đăng xuất và UC04 để đặt lại mật khẩu. UC02 và UC17 có thể dùng chung một luồng đăng nhập khi triển khai; giữ hai mã để đối chiếu v1.

### 2.4. Quản trị viên

| Mã | Use case | Ghi chú |
|---|---|---|
| UC27 | Đăng nhập admin | Tài khoản do hệ thống cấp. |
| UC28 | Duyệt/từ chối hồ sơ NCC | Admin quyết định thủ công; từ chối cần có lý do. |
| UC29 | Quản lý người dùng | Xem và xử lý tài khoản theo quyền admin. |
| UC30 | Quản lý danh mục dịch vụ | Quản lý danh mục hiển thị trong hệ thống. |
| UC31 | Quản lý đơn hàng | Theo dõi và can thiệp theo quyền admin. |
| UC32 | Xem dashboard thống kê | Xem các chỉ số vận hành. |
| UC33 | Xử lý khiếu nại | Tiếp nhận và giải quyết yêu cầu. |
| UC34 | Xem báo cáo | Xem báo cáo vận hành. |

### 2.5. Tương tác với hệ thống ngoài

Đây là các bước tự động trong những use case trên, không phải thao tác thủ công của khách hàng hoặc NCC.

| Bước | Hệ thống ngoài | Use case liên quan |
|---|---|---|
| Gửi OTP xác thực email | Dịch vụ email | UC01, UC16, UC35, UC36 |
| Gửi kết quả duyệt/từ chối hồ sơ | Dịch vụ email | UC28 |
| Khi duyệt: tạo tài khoản NCC, username là email, mật khẩu ngẫu nhiên và gửi thông tin đăng nhập | Dịch vụ email | UC28, UC42 |
| Thu tiền cọc và nhận kết quả giao dịch | Cổng thanh toán | UC08, UC09 |
| Hoàn tiền cọc theo quy tắc hủy/từ chối | Cổng thanh toán | UC11, UC21, UC41 |

## 3. Quy tắc nghiệp vụ đã thống nhất

### 3.1. Đăng ký và phân quyền

1. Người chưa đăng nhập không được xem, tìm kiếm hay xem chi tiết dịch vụ.
2. Khách hàng phải nhập đúng OTP gửi qua email trước khi tài khoản được kích hoạt.
3. Người nộp hồ sơ NCC phải xác thực email bằng OTP. Hồ sơ có trạng thái **chờ duyệt**, **đã duyệt** hoặc **bị từ chối**. Nếu bị từ chối, thông báo cần nêu lý do.
4. Admin duyệt hồ sơ NCC thủ công. Khi duyệt, hệ thống tạo tài khoản NCC với username là email và mật khẩu ngẫu nhiên, rồi gửi thông tin đăng nhập qua email.
5. NCC bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.
6. Một email không được đồng thời là tài khoản khách hàng và tài khoản NCC.

### 3.2. Đặt cọc, hủy đơn và hoàn cọc

- Mọi dịch vụ đều yêu cầu đặt cọc **30% giá trị đơn hàng**.
- **Khách hàng** hủy khi còn **từ 30 phút trở lên** trước giờ hẹn: hoàn **50% tiền cọc đã thanh toán**.
- **Khách hàng** hủy **trước giờ hẹn dưới 30 phút**: **không hoàn cọc**.
- **NCC từ chối đơn** hoặc **NCC hủy đơn**: hoàn **100% tiền cọc đã thanh toán** cho khách hàng.
- Ví dụ: đơn 1.000.000 VND có tiền cọc 300.000 VND. Khách hủy đủ điều kiện được hoàn 150.000 VND; NCC từ chối/hủy thì khách được hoàn 300.000 VND.

## 4. Điểm cần chốt trước khi đặc tả chi tiết

Các điểm sau chưa được thống nhất, không nên ngầm xem là quy tắc đã chốt:

1. Thứ tự **NCC chấp nhận đơn** và **khách thanh toán cọc**; thời hạn thanh toán/chấp nhận.
2. Cách thanh toán **70% còn lại** sau khi hoàn thành dịch vụ.
3. Xử lý việc hủy **đúng giờ hẹn, sau giờ hẹn**, hoặc NCC hủy khi dịch vụ đã bắt đầu.
4. Thời hạn hiệu lực, số lần nhập sai và quy tắc gửi lại OTP.
5. Cách xử lý khi giao dịch hoàn tiền thất bại.
