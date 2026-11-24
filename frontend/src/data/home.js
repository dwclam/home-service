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

export const steps = [
  { icon: 'Search', title: 'Tìm dịch vụ', description: 'Tìm kiếm và lọc nhà cung cấp theo danh mục, khu vực và mức giá phù hợp.' },
  { icon: 'CalendarCheck', title: 'Đặt lịch', description: 'Chọn khung giờ rảnh thực tế của nhà cung cấp, xác nhận địa chỉ và gửi yêu cầu.' },
  { icon: 'CircleCheck', title: 'Hoàn thành dịch vụ', description: 'Nhà cung cấp đến đúng hẹn, thực hiện công việc và hoàn tất thanh toán minh bạch.' },
]
