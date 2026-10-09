const photo = (id, width = 600) => `https://images.unsplash.com/${id}?w=${width}&q=80`

export const heroServices = [
  { title: 'Sửa điện', detail: 'Chập, thay aptomat', image: photo('photo-1621905251189-08b45d6a269e', 200) },
  { title: 'Vệ sinh nhà', detail: 'Theo giờ, theo gói', image: photo('photo-1581578731548-c64695cc6952', 200) },
  { title: 'Sửa nước', detail: 'Rò rỉ, thay ống', image: photo('photo-1558618666-fcd25c85cd64', 200) },
  { title: 'Thú cưng', detail: 'Tắm, chăm sóc', image: photo('photo-1450778869180-41d0601e046e', 200) },
  { title: 'Điều hòa', detail: 'Vệ sinh, nạp gas', image: photo('photo-1581092918056-0c4c3acd3789', 200) },
  { title: 'Gia sư', detail: 'Toán, Lý, Anh', image: photo('photo-1585421514738-01798e348b17', 200) },
  { title: 'Sơn nhà', detail: 'Nội, ngoại thất', image: photo('photo-1503387762-592deb58ef4e', 200) },
  { title: 'Nội thất', detail: 'Lắp ráp, sửa chữa', image: photo('photo-1600585154340-be6161a56a0c', 200) },
  { title: 'Chuyển nhà', detail: 'Đóng gói, vận chuyển', image: photo('photo-1600518464441-9154a4dea21b', 200) },
  { title: 'Máy giặt', detail: 'Sửa, vệ sinh', image: photo('photo-1556909212-d5b604d0c90d', 200) },
  { title: 'Nấu ăn', detail: 'Theo yêu cầu', image: photo('photo-1556909114-f6e7ad7d3136', 200) },
  { title: 'Cây cảnh', detail: 'Chăm sóc, cắt tỉa', image: photo('photo-1584622650111-993a426fbf0a', 200) },
]

export const categories = [
  { title: 'Sửa điện', count: 320, icon: 'Zap' },
  { title: 'Sửa nước', count: 245, icon: 'Droplets' },
  { title: 'Vệ sinh', count: 410, icon: 'Sparkles' },
  { title: 'Thú cưng', count: 180, icon: 'PawPrint' },
  { title: 'Gia sư', count: 520, icon: 'GraduationCap' },
  { title: 'Sửa chữa', count: 375, icon: 'Hammer' },
]

export const completedTasks = [
  { category: 'Vệ sinh', title: 'Dọn dẹp căn hộ 2 phòng ngủ sau khi chuyển đi', image: photo('photo-1494790108377-be9c29b29330', 100), rating: '5.0', price: '450.000đ' },
  { category: 'Sửa điện', title: 'Thay ổ cắm và kiểm tra hệ thống điện toàn nhà', image: photo('photo-1507003211169-0a1dd7228f2d', 100), rating: '5.0', price: '280.000đ' },
  { category: 'Thú cưng', title: 'Tắm và cắt tỉa lông cho chó Poodle 5kg', image: photo('photo-1438761681033-6461ffad8d80', 100), rating: '5.0', price: '200.000đ' },
  { category: 'Sửa nước', title: 'Xử lý rò rỉ đường ống dưới bồn rửa bát', image: photo('photo-1500648767791-00dcc994a43e', 100), rating: '5.0', price: '180.000đ' },
  { category: 'Gia sư', title: 'Dạy Toán lớp 9 ôn thi vào 10 — 2 buổi/tuần', image: photo('photo-1544005313-94ddf0286df2', 100), rating: '5.0', price: '600.000đ' },
  { category: 'Nội thất', title: 'Lắp ráp tủ quần áo IKEA 3 cánh', image: photo('photo-1506794778202-cad84cf45f1d', 100), rating: '4.9', price: '350.000đ' },
]

export const featuredServices = [
  { category: 'Sửa điện', title: 'Sửa chập điện, thay aptomat tận nhà', image: photo('photo-1621905251189-08b45d6a269e'), initials: 'TH', provider: 'Trần Hùng', rating: '4.9', reviews: 324, price: '150.000đ' },
  { category: 'Vệ sinh', title: 'Dọn dẹp nhà cửa theo giờ, theo gói', image: photo('photo-1581578731548-c64695cc6952'), initials: 'LM', provider: 'Lê Mai', rating: '4.8', reviews: 210, price: '120.000đ' },
  { category: 'Thú cưng', title: 'Tắm và chăm sóc thú cưng tại nhà', image: photo('photo-1450778869180-41d0601e046e'), initials: 'PA', provider: 'Phạm An', rating: '5.0', reviews: 156, price: '200.000đ' },
]

export const steps = [
  { icon: 'Search', title: 'Tìm dịch vụ', description: 'Tìm kiếm và lọc nhà cung cấp theo danh mục, khu vực, giá cả và đánh giá.' },
  { icon: 'CalendarCheck', title: 'Đặt lịch', description: 'Chọn khung giờ phù hợp, xác nhận địa chỉ và đặt cọc chỉ với vài cú click.' },
  { icon: 'CircleCheck', title: 'Hoàn thành & đánh giá', description: 'Nhà cung cấp đến tận nơi, hoàn thành công việc. Bạn thanh toán và đánh giá.' },
]

export const providers = [
  { initials: 'TH', name: 'Trần Hùng', specialty: 'Thợ điện • Quận 1', rating: '4.9', reviews: 324, orders: '1.248 đơn', experience: '3 năm KN' },
  { initials: 'LM', name: 'Lê Mai', specialty: 'Vệ sinh • Quận 3', rating: '4.8', reviews: 210, orders: '856 đơn', experience: '5 năm KN' },
  { initials: 'PA', name: 'Phạm An', specialty: 'Thú cưng • Quận 7', rating: '5.0', reviews: 156, orders: '420 đơn', experience: '2 năm KN' },
  { initials: 'NV', name: 'Nguyễn Vinh', specialty: 'Sửa nước • Bình Thạnh', rating: '4.9', reviews: 289, orders: '1.020 đơn', experience: '4 năm KN' },
]
