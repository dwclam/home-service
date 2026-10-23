# Rà soát thiết kế database — Nestify

**Ngày rà soát:** 13/10/2026.  
**Đối tượng:** [database-design.md](database-design-v1.md). Đây là nhận xét về bản thiết kế, chưa phải kết quả kiểm thử một database đã triển khai.

**Đánh giá:** Thiết kế hiện tại phù hợp làm nền cho dự án đặt dịch vụ tại nhà. Các nhóm tài khoản, xét duyệt NCC, dịch vụ, lịch, đơn hàng, cọc, hoàn tiền và đánh giá đã có. Có thể giữ cấu trúc chính; cần bổ sung một số ràng buộc và chốt vài quy tắc trước khi coi đây là bản thiết kế hoàn chỉnh. Số lượng 22 bảng không phải vấn đề chính — phần cần làm rõ nhất là quan hệ giữa lịch hẹn, thanh toán và hủy đơn.

Nguồn đối chiếu: [README](../README.md), [usecase.md](usecase.md), [usecase_v2.md](usecase_v2.md), [quy định FE](FE-guideline-lite%20(1).md) và [README frontend](../frontend/README.md). `usecase_v2.md` là nguồn chính cho nghiệp vụ; tài liệu FE giúp đối chiếu tên trạng thái, các README xác nhận phạm vi và công nghệ.

## 1. Những phần đã phù hợp và nên giữ

| Phần thiết kế | Nhận xét |
| --- | --- |
| Tách `provider_applications` khỏi `accounts` | Đúng yêu cầu: nộp hồ sơ NCC chưa tạo tài khoản đăng nhập; tài khoản chỉ được cấp khi admin duyệt. |
| `email_identities` dùng chung | Có lý do tồn tại: giữ email xuyên suốt đăng ký khách và hồ sơ NCC, kể cả khi NCC chưa có account. Chỉ đặt UNIQUE trên `accounts.email` sẽ chưa thể bao phủ hồ sơ đang chờ. |
| Một `accounts` có `account_type` | Phù hợp quy tắc mỗi email chỉ thuộc một loại tài khoản. Chưa cần hệ thống nhiều vai trò cho một account. |
| `bookings` lưu giá và địa chỉ tại lúc đặt | Đúng: sửa giá dịch vụ hoặc địa chỉ đã lưu không được làm thay đổi lịch sử đơn. |
| Tách đơn, lịch sử trạng thái, giao dịch thanh toán và hoàn tiền | Phù hợp vì một đơn có thể có nhiều lần thử thanh toán, còn trạng thái đơn khác trạng thái thanh toán. |
| Cọc 30%; hoàn 50%/0%/100% cọc tùy trường hợp | Khớp các quy tắc đã thống nhất trong mục 3.2 của `usecase_v2.md`, kể cả mốc còn đúng 30 phút. |
| `reviews` gắn với đơn | Có cơ sở xác định khách, NCC và dịch vụ được đánh giá; không cần lưu lặp cả ba khóa nếu đã suy ra được từ đơn. Điều kiện chỉ đánh giá đơn hoàn tất là đề xuất hợp lý, cần được chốt. |
| Tiền bằng số nguyên VND; thời điểm có múi giờ | Phù hợp các phép tính cọc và so sánh thời điểm hủy với giờ hẹn. |

## 2. Các điểm nên bổ sung trước khi chốt

### 2.1. Ưu tiên cao: làm rõ tính duy nhất của yêu cầu hoàn tiền

**Vị trí:** `database-design-v1.md`, dòng 46, 88 và 96.

ERD mô tả một lần kết thúc đơn có tối đa một yêu cầu hoàn tiền. Tuy nhiên, bảng `refunds` mới ghi khóa chính `id`; chưa ghi UNIQUE tương ứng trên `booking_id`. Đồng thời, mỗi bản ghi hoàn lại phải bằng toàn bộ `refund_due_vnd`. Nếu hai lần xử lý cùng tạo bản ghi, mô tả hiện tại chưa loại trừ việc yêu cầu hoàn hai lần toàn bộ số tiền.

**Sửa nhỏ nhất cho mô hình hiện tại:**

- Ghi rõ `refunds.booking_id` là UNIQUE nếu mỗi đơn chỉ có một yêu cầu hoàn cọc theo chính sách hủy/từ chối.
- Bổ sung mã tham chiếu yêu cầu hoàn do hệ thống tạo, ví dụ `merchant_refund_reference`, có UNIQUE. Khi thử lại cùng yêu cầu, dùng lại mã này; `gateway_refund_id` là mã cổng trả về nên không thay thế được mã yêu cầu ban đầu.
- Một lần gửi lại không được mặc nhiên tạo một khoản hoàn mới. Khi chưa biết cổng đã hoàn hay chưa, giữ trạng thái chờ xác minh thay vì kết luận ngay là thất bại.

Đây là bổ sung ràng buộc và vài thuộc tính, chưa cần thêm bảng. Quy tắc “một đơn một refund” chỉ phù hợp phạm vi hoàn một lần đang mô tả; nếu sau này có hoàn từng phần hoặc hoàn khoản thu trùng thì phải điều chỉnh quan hệ cho những trường hợp đó.

### 2.2. Ưu tiên cao: bổ sung trường hợp tiền về sau khi đơn đã hủy/từ chối

**Vị trí:** `database-design-v1.md`, dòng 44–48 và 96; đối chiếu UC21, UC41 trong `usecase_v2.md`.

Ví dụ: khách đang thanh toán cọc → NCC từ chối đơn → hệ thống chưa nhận kết quả thu tiền nên lưu `paid_deposit_vnd=0`, `refund_due_vnd=0` → sau đó cổng báo thanh toán thành công. Theo quy tắc đã chốt, khách vẫn phải được hoàn 100% cọc khi NCC từ chối.

Thiết kế cần phân biệt **chưa nhận được kết quả thanh toán** với **chắc chắn chưa thu tiền**. Snapshot chính sách hủy là cần thiết, nhưng không nên khóa số tiền hoàn ở 0 khi vẫn còn một giao dịch chưa rõ kết quả.

**Đề xuất ghi thêm vào tài liệu:**

- Giữ nguyên thời điểm và tỷ lệ hoàn của quyết định hủy; đối chiếu lại số tiền thực thu khi kết quả thanh toán đến muộn.
- Đơn đã `CANCELLED`/`REJECTED` không tự trở lại `CONFIRMED` vì vừa nhận được cọc. Khoản đã thu vẫn phải được ghi nhận và xử lý hoàn theo quy tắc tương ứng.
- Thay đổi trạng thái đơn, ghi lịch sử và xác định nghĩa vụ hoàn cần được xử lý nhất quán trên cùng đơn khi có các sự kiện đồng thời.
- Với trường hợp hủy do khách, cần chốt riêng cách xử lý tiền thu sau quyết định hủy; không tự suy ra chính sách này từ quy tắc hủy trước giờ hẹn.

Một tình huống liên quan là **hai lần thử thanh toán khác nhau cùng thực sự thu được tiền**. Quy tắc “một cọc thành công cho một đơn” nên hiểu là một khoản cọc được dùng để xác nhận đơn. Nếu kết nối cổng thanh toán thật, cần ghi nhận được cả khoản thu ngoài dự kiến để đối soát và hoàn lại; chỉ từ chối lưu giao dịch thành công thứ hai sẽ không làm khoản tiền đó biến mất. Cách biểu diễn khoản thu trùng và khoản hoàn tương ứng cần được bổ sung nếu phạm vi tích hợp có tình huống này; không cần tự xây thêm hệ thống ví.

### 2.3. Ưu tiên cao: ghi rõ ràng buộc vai trò và chủ sở hữu

**Vị trí:** `database-design-v1.md`, dòng 21–24, 36, 42, 65–70 và mục 3.

Khóa ngoại đến `accounts` chỉ thể hiện tài khoản tồn tại. Tài liệu cần ghi thêm account thuộc vai trò nào và các khóa ngoại trong cùng bản ghi có thuộc về cùng một giao dịch nghiệp vụ hay không.

| Quan hệ | Điều kiện cần bổ sung |
| --- | --- |
| `provider_profiles` → account và application | Account có loại `PROVIDER`; application là `APPROVED`; email trên account trùng email của application. |
| `provider_applications` → `email_identities` | Email thuộc loại `PROVIDER`; không chỉ kiểm tra email tồn tại. |
| Các cột `customer_id` | Phải là account loại `CUSTOMER`. |
| `decided_by_admin_id`, `assigned_admin_id`, `admin_id` | Phải là account loại `ADMIN`; người được giao xử lý có thể để rỗng trước khi phân công. |
| `conversations.booking_id` nếu có | Khách và NCC của cuộc chat phải trùng khách và NCC trên đơn đó. |
| `complaints.booking_id` nếu có | Đơn phải thuộc khách được ghi trong khiếu nại. |
| `booking_terminations.deposit_payment_id` | Giao dịch thuộc đúng đơn, là cọc đã thành công; số tiền thực thu phải khớp nguồn thanh toán. |
| `refunds` → payment và termination | Cùng đơn, cùng khoản cọc cần hoàn; không chỉ bảo đảm ba bản ghi đều tồn tại. |

Các quan hệ dịch vụ–NCC, địa chỉ–khách và người gửi–cuộc chat đã được đề cập; nên giữ và mở rộng danh sách đó bằng các điều kiện trên. Khi duyệt NCC, trạng thái hồ sơ và việc tạo account/profile cũng cần nhất quán.

### 2.4. Cần chốt nghiệp vụ: thời điểm giữ chỗ cho đơn đang chờ

**Vị trí:** `database-design-v1.md`, dòng 35, 48, 95 và 104. Thứ tự trả cọc/chấp nhận vẫn đang để mở tại mục 4 của `usecase_v2.md`.

Hiện tài liệu chỉ cấm chồng lịch cho đơn đã xác nhận/đang làm. Như vậy, hai khách có thể cùng tạo đơn `PENDING` cho một NCC và một giờ, rồi cùng trả cọc trước khi một trong hai đơn được xác nhận. Chặn lịch khi xác nhận sẽ bảo vệ lịch làm việc, nhưng vẫn cần xử lý khoản cọc của đơn còn lại.

Đây là **quyết định nghiệp vụ còn mở**, không phải mặc định thiếu một bảng:

- Xác định bước nào bắt đầu giữ chỗ: khi tạo đơn, khi NCC chấp nhận hay khi khách bắt đầu thanh toán.
- Xác định thời hạn giữ và trường hợp được giải phóng lịch. Nếu chọn giữ chỗ tạm, có thể bổ sung `hold_expires_at` trên `bookings`.
- Nếu có tự hết hạn, cần biểu diễn được lý do kết thúc do hết hạn. Không gán hết hạn thành “khách hủy” vì có thể dẫn đến áp sai chính sách hoàn cọc.
- Chốt việc NCC sửa lịch rảnh không làm mất hiệu lực của một đơn đã xác nhận.

Giữ `PENDING` làm trạng thái tổng quát vẫn được nếu `accepted_at` và kết quả thanh toán đủ để biết đơn đang chờ bên nào. Chưa cần thêm hàng loạt trạng thái khi thứ tự xử lý chưa được chốt.

### 2.5. Cần xác nhận giả định về một NCC và một đơn dịch vụ

**Vị trí:** `database-design-v1.md`, dòng 33, 35, 42 và 95; `usecase.md`, mục Actor, cho phép NCC là cá nhân hoặc công ty.

Thiết kế hiện tại phù hợp nhất với phạm vi: **một đơn đặt một dịch vụ của một NCC; mỗi NCC thực hiện tối đa một đơn tại một thời điểm; dịch vụ có giá và thời lượng xác định**.

Đây là phạm vi hợp lý cho bản đầu của đồ án, nhưng cần ghi thành giả định rõ ràng. Nếu NCC là công ty nhiều nhân viên có thể làm việc đồng thời thì khóa toàn bộ lịch theo `provider_id` sẽ hạn chế hơn năng lực thực tế. Chỉ khi dự án yêu cầu phân công nhân viên mới cần thêm dữ liệu nhân viên/nhóm thực hiện và lịch theo người hoặc nhóm.

Tương tự, nếu dịch vụ được tính theo số giờ hoặc số lượng, cần thêm đơn vị tính, số lượng và đơn giá tại thời điểm đặt để giải thích được `total_amount_vnd`. Nếu chỉ bán gói cố định, bảng hiện có đủ cho cách tính giá đó. Chưa có yêu cầu giỏ hàng nhiều dịch vụ trong một đơn nên chưa cần `booking_items`.

### 2.6. Cần chốt ý nghĩa “thu nhập” để đáp ứng UC23

**Vị trí:** `database-design-v1.md`, dòng 42, 44 và 105; `usecase_v2.md`, UC23 và mục 4.2.

| Chỉ số | Dữ liệu hiện tại đáp ứng đến đâu? |
| --- | --- |
| Số đơn hoàn thành, giá trị các đơn hoàn thành | Có thể tổng hợp từ `bookings.status`, `completed_at`, `total_amount_vnd`. |
| Số tiền đã thu qua các giao dịch được ghi nhận, số đã hoàn | Có thể tổng hợp từ giao dịch thanh toán/hoàn tiền thành công; cần xử lý đúng các kết quả đến muộn. |
| Tiền NCC thực nhận | Chưa thể kết luận từ tiền cọc, vì cách thu 70% còn lại và việc chuyển tiền cho NCC chưa được chốt. |

Đề xuất cho đồ án: nếu UC23 chỉ hiển thị giá trị các đơn đã hoàn thành, đặt tên chỉ số đúng như vậy. Nếu cần hiển thị tiền thực nhận, phải chốt cách ghi nhận khoản còn lại và người nhận tiền trước. Chưa có căn cứ để bắt buộc thêm bảng `earnings`, `wallets` hoặc bảng chi trả chỉ để làm dashboard.

## 3. Các chi tiết nên hoàn thiện trong bản thiết kế tiếp theo

Đây là bước làm rõ tài liệu, không phải yêu cầu bổ sung tất cả các bảng mới.

| Nội dung | Nhận xét và hướng bổ sung |
| --- | --- |
| Trạng thái | Liệt kê đầy đủ giá trị của `accounts.status`, `provider_applications.status`, `payment_transactions.status`, `refunds.status`, `complaints.status` và ý nghĩa thời điểm tương ứng. Nhiều bảng hiện chỉ có tên cột `status`. |
| Giá trị rỗng và duy nhất | Ghi rõ trường nào bắt buộc; `rejection_reason` bắt buộc khi hồ sơ bị từ chối; mỗi khách tối đa một địa chỉ mặc định; giao dịch cổng duy nhất theo cặp `(gateway, gateway_transaction_id)` nếu mã chỉ có ý nghĩa trong từng cổng. |
| Liên kết OTP | Nêu rõ một mã xác thực thuộc mục đích và lần đăng ký nào. Khi cho phép nộp lại hồ sơ NCC, có thể gắn mã với `provider_application_id` để mã của hồ sơ cũ không xác thực nhầm hồ sơ mới. |
| Vòng đời giữ email | Đã ghi vấn đề hồ sơ bị từ chối. Nên bổ sung trường hợp đăng ký bỏ dở/chưa xác thực: giữ email bao lâu, có cho tiếp tục đăng ký hay giải phóng sau hết hạn. Các thời hạn cụ thể vẫn cần chốt. |
| Sửa email | Nếu bản đầu không hỗ trợ đổi email thì ghi rõ phạm vi này. Nếu có, cần thiết kế xác thực email mới và giữ lịch sử hồ sơ cũ, vì hiện email đang là khóa được nhiều bảng tham chiếu. |
| Thay đổi đơn đã có thanh toán | Nêu khi nào được sửa giá, giờ hẹn, khách, NCC hoặc dịch vụ. Sửa tùy ý các trường này có thể làm lệch tiền cọc, chính sách hủy và lịch sử. Chưa có UC đổi lịch nên có thể giới hạn bản đầu. |
| Chat | Chọn một cuộc chat cho mỗi cặp khách–NCC hay mỗi đơn một cuộc chat, rồi ghi UNIQUE tương ứng. `booking_id` có thể rỗng là hợp lý cho chat trước khi đặt. |
| Lịch sử khiếu nại | `complaint_updates.body` đủ cho trao đổi bằng chữ. Nếu muốn biết chính xác ai chuyển trạng thái khiếu nại và lúc nào, bổ sung `from_status`, `to_status` hoặc dùng nhật ký admin cho việc này. |
| Các đề xuất chưa thống nhất | Điều kiện review chỉ sau `COMPLETED`, giới hạn một NCC/một việc, cách làm tròn VND và giữ email sau từ chối cần ghi là lựa chọn thiết kế được đề xuất. Mục 4 hiện viết mọi điểm đều do v2 để mở, trong khi một số là câu hỏi bổ sung từ bản thiết kế. |

## 4. Phần nào có thể đơn giản hóa cho đồ án?

- Giữ `accounts` với `account_type`; chưa cần thêm `roles`, `permissions` hay `customer_profiles` nếu chưa có thuộc tính/quyền riêng cần lưu.
- UC03 yêu cầu kết thúc phiên đăng nhập, nhưng chưa quy định nơi lưu phiên. Bảng session/refresh token chỉ cần bổ sung nếu lựa chọn lưu dữ liệu phiên trong PostgreSQL; không thể kết luận thiếu bảng này chỉ từ danh sách use case.
- Giữ `email_identities` nếu muốn một nơi quản lý email xuyên suốt hai luồng đăng ký. Bỏ bảng này vẫn có thể thiết kế được, nhưng phải có phương án khác bảo đảm không đăng ký trùng đồng thời; kiểm tra ở hai bảng một cách rời rạc chưa đủ.
- `customer_addresses` là UC37 đề xuất. Nếu chưa làm sổ địa chỉ, khách nhập địa chỉ trực tiếp khi đặt và đơn vẫn lưu snapshot; có thể hoãn bảng này.
- `service_images` có thể hoãn nếu bản đầu chỉ có một ảnh trên dịch vụ; lúc đó dùng một trường ảnh trong `services` là đủ.
- Có thể hoãn `complaint_updates` nếu giai đoạn đầu chỉ tiếp nhận nội dung và ghi kết quả xử lý trong `complaints`. **UC33 xử lý khiếu nại đã có trong phạm vi**, nên không bỏ luôn chức năng này chỉ vì UC39 phía khách còn là đề xuất.
- Chat và thông báo đã nằm trong use case, không phải bảng thừa. Có thể triển khai sau phần đặt lịch, cọc và hoàn tiền nếu cần chia giai đoạn.
- `admin_audit_logs` là khuyến nghị kỹ thuật hữu ích cho các hành động duyệt hồ sơ, khóa tài khoản và can thiệp đơn. Có thể giữ mô hình đơn giản như hiện tại.
- Chưa cần bảng riêng chỉ để lưu dashboard, tổng số đánh giá, điểm trung bình hay tổng giá trị đơn. Có thể tính từ dữ liệu gốc trước, bổ sung dữ liệu tổng hợp khi có nhu cầu thực tế.

## 5. Những quyết định nên ưu tiên tiếp theo

1. Một NCC có được nhận nhiều đơn cùng giờ không? Mỗi dịch vụ là gói cố định hay tính theo giờ/số lượng?
2. NCC nhận đơn trước hay khách cọc trước? Giữ chỗ từ bước nào và hết hạn ra sao?
3. Khi cọc được báo thành công sau khi đơn đã kết thúc, dữ liệu và nghĩa vụ hoàn được cập nhật thế nào?
4. Hoàn tiền là một lần cho toàn bộ khoản được hoàn hay có thể chia nhiều lần? Thử lại cùng một yêu cầu được nhận diện bằng mã nào?
5. UC23 hiển thị giá trị đơn hoàn thành hay tiền thực nhận NCC? Khoản 70% còn lại được ghi nhận ở đâu?

Các nhận xét trên đề xuất chỉnh tài liệu hiện có. Chưa có lý do phải thiết kế lại toàn bộ database; phần lớn công việc còn lại là ghi đủ ràng buộc, làm rõ giả định và thống nhất các tình huống chuyển trạng thái.
