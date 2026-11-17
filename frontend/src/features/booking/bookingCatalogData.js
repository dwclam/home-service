/**
 * Danh sách 6 gói dịch vụ mẫu tiêu chuẩn phục vụ Catalog, Chi tiết dịch vụ và Đặt lịch trực tiếp.
 * Ánh xạ từ các dịch vụ nổi bật và nhà cung cấp trên hệ thống Nestify.
 */
export const standardBookingServices = [
  {
    id: 1,
    serviceId: 1,
    providerId: 2,
    providerName: 'Điện Lạnh Bách Khoa',
    providerCity: 'Hà Nội',
    providerBio: 'Hơn 10 năm kinh nghiệm sửa chữa, bảo dưỡng điện lạnh gia dụng. Đội ngũ kỹ thuật viên Bách Khoa tay nghề cao, phục vụ nhanh chóng và cam kết linh kiện chính hãng.',
    providerAddress: 'Số 15 Tạ Quang Bửu, Hai Bà Trưng, Hà Nội',
    providerLogoUrl: null,
    categoryId: 1,
    categoryName: 'Điện lạnh',
    title: 'Bảo dưỡng & Nạp gas điều hòa gia đình',
    description: 'Quy trình kiểm tra toàn diện, vệ sinh lưới lọc và xịt rửa dàn nóng/dàn lạnh bằng máy áp lực chuyên dụng. Đo đạc áp suất gas chuẩn kỹ thuật, bổ sung gas R32/R410A chính hãng giúp máy chạy êm, tiết kiệm điện năng và làm lạnh sâu.',
    basePriceVnd: 350000,
    durationMinutes: 90,
    rating: '4.9',
    reviews: 324,
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80',
    images: [
      { id: 101, imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1000&q=80', cover: true, sortOrder: 0 },
      { id: 102, imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&q=80', cover: false, sortOrder: 1 },
      { id: 103, imageUrl: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1000&q=80', cover: false, sortOrder: 2 },
    ],
    createdAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 2,
    serviceId: 2,
    providerId: 3,
    providerName: 'Thợ Sửa Nước 24/7',
    providerCity: 'TP. Hồ Chí Minh',
    providerBio: 'Chuyên khắc phục sự cố rò rỉ nước, thông tắc cống nghẹt, lắp đặt thiết bị vệ sinh cao cấp với cam kết bảo hành lâu dài, có mặt sau 30 phút.',
    providerAddress: '120 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh',
    providerLogoUrl: null,
    categoryId: 2,
    categoryName: 'Điện nước',
    title: 'Thông tắc & Xử lý rò rỉ đường ống nước',
    description: 'Dò tìm vị trí rò rỉ ngầm bằng thiết bị hiện đại không đục phá tường, thay thế van nước, vòi sen, xi-phông bồn rửa bát và hàn nối đường ống PPR/PVC chịu áp lực cao.',
    basePriceVnd: 250000,
    durationMinutes: 60,
    rating: '4.9',
    reviews: 289,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    images: [
      { id: 201, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1000&q=80', cover: true, sortOrder: 0 },
      { id: 202, imageUrl: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=1000&q=80', cover: false, sortOrder: 1 },
    ],
    createdAt: '2026-11-02T09:30:00Z',
  },
  {
    id: 3,
    serviceId: 3,
    providerId: 4,
    providerName: 'Vệ Sinh Nhà Sạch Hà Nội',
    providerCity: 'Hà Nội',
    providerBio: 'Dịch vụ vệ sinh công nghiệp và dọn nhà chuyên sâu uy tín hàng đầu Hà Nội. Đội ngũ nhân viên được đào tạo bài bản, sử dụng hóa chất an toàn đạt chuẩn sinh học Châu Âu.',
    providerAddress: 'Tầng 3, Tòa CT2 KĐT Mỹ Đình, Nam Từ Liêm, Hà Nội',
    providerLogoUrl: null,
    categoryId: 3,
    categoryName: 'Vệ sinh nhà cửa',
    title: 'Tổng vệ sinh chuyên sâu căn hộ chung cư',
    description: 'Gói dịch vụ dọn dẹp toàn diện: Hút bụi sàn nhà, lau kính 2 mặt, chà rửa khử khuẩn nhà tắm và toilet, làm sạch dầu mỡ khu vực bếp và lau dọn ban công thoáng mát.',
    basePriceVnd: 450000,
    durationMinutes: 120,
    rating: '4.8',
    reviews: 210,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80',
    images: [
      { id: 301, imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1000&q=80', cover: true, sortOrder: 0 },
      { id: 302, imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1000&q=80', cover: false, sortOrder: 1 },
    ],
    createdAt: '2026-11-03T10:15:00Z',
  },
  {
    id: 4,
    serviceId: 4,
    providerId: 5,
    providerName: 'Mộc Gia Dụng Việt',
    providerCity: 'Đà Nẵng',
    providerBio: 'Thợ mộc lành nghề chuyên đóng mới, sửa chữa cửa gỗ, khóa thông minh, tủ bếp và sàn gỗ gia đình. Cẩn thận, tỉ mỉ trong từng đường bào mũi khoan.',
    providerAddress: '45 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
    providerLogoUrl: null,
    categoryId: 4,
    categoryName: 'Sửa chữa nhà',
    title: 'Sửa chữa bản lề, khóa cửa & đồ gỗ tại nhà',
    description: 'Khắc phục hiện tượng cửa gỗ bị xệ, kẹt cánh do thời tiết, thay thế ổ khóa gạt hoặc tay nắm tròn mới, gia cố ray trượt ngăn kéo tủ và bắt vít các điểm lỏng lẻo đồ nội thất.',
    basePriceVnd: 300000,
    durationMinutes: 60,
    rating: '4.9',
    reviews: 145,
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
    images: [
      { id: 401, imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1000&q=80', cover: true, sortOrder: 0 },
      { id: 402, imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1000&q=80', cover: false, sortOrder: 1 },
    ],
    createdAt: '2026-11-04T11:00:00Z',
  },
  {
    id: 5,
    serviceId: 5,
    providerId: 6,
    providerName: 'Pet Spa Tại Gia',
    providerCity: 'TP. Hồ Chí Minh',
    providerBio: 'Dịch vụ spa thú cưng tận nhà chuyên nghiệp. Yêu thương và chăm sóc chó mèo như người thân với dụng cụ vô trùng và dầu tắm organic nhập khẩu.',
    providerAddress: '88 Thảo Điền, Quận 2, TP. Hồ Chí Minh',
    providerLogoUrl: null,
    categoryId: 5,
    categoryName: 'Chăm sóc thú cưng',
    title: 'Tắm vệ sinh & Cắt tỉa lông chó mèo tận nhà',
    description: 'Vệ sinh tai, cắt mài móng, vắt tuyến hôi, chải lông rụng, tắm nước ấm massage bằng dầu tắm cao cấp, sấy phồng và cắt tỉa tạo kiểu theo phong cách đáng yêu.',
    basePriceVnd: 280000,
    durationMinutes: 60,
    rating: '5.0',
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&q=80',
    images: [
      { id: 501, imageUrl: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1000&q=80', cover: true, sortOrder: 0 },
      { id: 502, imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1000&q=80', cover: false, sortOrder: 1 },
    ],
    createdAt: '2026-11-05T14:20:00Z',
  },
  {
    id: 6,
    serviceId: 6,
    providerId: 7,
    providerName: 'Gia Dụng An Tâm',
    providerCity: 'Hà Nội',
    providerBio: 'Trung tâm sửa chữa đồ gia dụng điện tử - điện lạnh uy tín. Kiểm tra miễn phí, báo giá minh bạch trước khi sửa và bảo hành linh kiện lên đến 12 tháng.',
    providerAddress: '68 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội',
    providerLogoUrl: null,
    categoryId: 1,
    categoryName: 'Điện lạnh',
    title: 'Sửa chữa máy giặt rung lắc, không vắt nước',
    description: 'Kiểm tra thụt giảm xóc, lò xo cân bằng lồng giặt, thay thế bơm van xả nước, dây curoa hoặc xử lý lỗi cảm biến bo mạch điều khiển cho máy giặt cửa ngang và cửa trên.',
    basePriceVnd: 320000,
    durationMinutes: 90,
    rating: '4.9',
    reviews: 198,
    image: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=600&q=80',
    images: [
      { id: 601, imageUrl: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1000&q=80', cover: true, sortOrder: 0 },
      { id: 602, imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1000&q=80', cover: false, sortOrder: 1 },
    ],
    createdAt: '2026-11-06T16:45:00Z',
  },
]

export const findServiceById = (id) => {
  const numId = Number(id)
  return (
    standardBookingServices.find(
      (s) => s.serviceId === numId || s.id === numId
    ) || standardBookingServices[0]
  )
}

export const findProviderById = (id) => {
  const numId = Number(id)
  const matchedService = standardBookingServices.find(
    (s) => s.providerId === numId
  )
  if (matchedService) {
    return {
      providerId: matchedService.providerId,
      businessName: matchedService.providerName,
      city: matchedService.providerCity,
      address: matchedService.providerAddress,
      bio: matchedService.providerBio,
      logoUrl: matchedService.providerLogoUrl,
    }
  }

  return {
    providerId: numId || 2,
    businessName: 'Trung Tâm Điện Lạnh Bách Khoa',
    city: 'Hà Nội',
    address: 'Số 15 Tạ Quang Bửu, Hai Bà Trưng, Hà Nội',
    bio: 'Hơn 10 năm kinh nghiệm sửa chữa điện lạnh dân dụng uy tín và chuyên nghiệp.',
    logoUrl: null,
  }
}

/**
 * Sinh danh sách khoảng lịch rảnh khả dụng mẫu trong 7 ngày tới (UC38 Fallback).
 * Tuân thủ quy ước nửa mở [startsAt, endsAt) và ràng buộc lead-time >= 60 phút.
 */
export const generateFallbackAvailableSlots = (serviceId) => {
  const service = findServiceById(serviceId)
  const now = new Date()
  const slots = []

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() + i)

    const y = targetDate.getFullYear()
    const m = String(targetDate.getMonth() + 1).padStart(2, '0')
    const d = String(targetDate.getDate()).padStart(2, '0')
    const datePrefix = `${y}-${m}-${d}`

    // Slot 1: Sáng 08:00 - 12:00
    const morningStart = new Date(`${datePrefix}T08:00:00`)
    const morningEnd = new Date(`${datePrefix}T12:00:00`)
    if (morningEnd.getTime() > now.getTime() + 60 * 60 * 1000) {
      slots.push({
        startsAt: morningStart.toISOString(),
        endsAt: morningEnd.toISOString(),
      })
    }

    // Slot 2: Chiều 13:30 - 17:30
    const afternoonStart = new Date(`${datePrefix}T13:30:00`)
    const afternoonEnd = new Date(`${datePrefix}T17:30:00`)
    if (afternoonEnd.getTime() > now.getTime() + 60 * 60 * 1000) {
      slots.push({
        startsAt: afternoonStart.toISOString(),
        endsAt: afternoonEnd.toISOString(),
      })
    }
  }

  return {
    serviceId: service.serviceId,
    serviceTitle: service.title,
    durationMinutes: service.durationMinutes,
    basePriceVnd: service.basePriceVnd,
    provider: {
      providerId: service.providerId,
      businessName: service.providerName,
      city: service.providerCity,
      logoUrl: service.providerLogoUrl,
    },
    availableSlots: slots,
  }
}
