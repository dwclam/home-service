import { SERVICE_STATUS } from '../constants/status'

export const MOCK_CATEGORIES = [
  {
    id: 1,
    name: 'Điện lạnh & Điều hòa',
    slug: 'dien-lanh-dieu-hoa',
    description: 'Bảo dưỡng, vệ sinh, bơm gas và sửa chữa điều hòa, tủ lạnh',
    iconName: 'Snowflake',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    name: 'Vệ sinh nhà cửa',
    slug: 've-sinh-nha-cua',
    description: 'Dọn dẹp theo giờ, tổng vệ sinh căn hộ và giặt sofa, rèm cửa',
    iconName: 'Sparkles',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    name: 'Điện nước gia dụng',
    slug: 'dien-nuoc-gia-dung',
    description: 'Khắc phục sự cố rò rỉ nước, chập điện, lắp đặt thiết bị vệ sinh',
    iconName: 'Wrench',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 4,
    name: 'Sửa chữa máy giặt & Thiết bị bếp',
    slug: 'sua-chua-may-giat-thiet-bi-bep',
    description: 'Vệ sinh lồng giặt, sửa bếp từ, lò vi sóng và máy hút mùi',
    iconName: 'Settings',
    sortOrder: 4,
    isActive: true,
  },
]

export const MOCK_PROVIDER_SERVICES = [
  {
    id: 301,
    providerId: 2001,
    categoryId: 1,
    categoryName: 'Điện lạnh & Điều hòa',
    title: 'Vệ sinh & Bảo dưỡng điều hòa treo tường trọn gói (1HP - 2HP)',
    description:
      'Xịt rửa dàn nóng, dàn lạnh bằng máy bơm áp lực chuyên dụng, thông tắc đường ống thoát nước, kiểm tra dòng điện và áp suất gas tiêu chuẩn.',
    basePriceVnd: 250000,
    durationMinutes: 60,
    status: SERVICE_STATUS.PUBLISHED,
    images: [
      {
        id: 1001,
        imageUrl:
          'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        altText: 'Kỹ thuật viên vệ sinh điều hòa treo tường',
        sortOrder: 0,
      },
      {
        id: 1002,
        imageUrl:
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        altText: 'Kiểm tra áp suất gas máy lạnh',
        sortOrder: 1,
      },
    ],
    createdAt: '2026-10-18T03:00:00Z',
    updatedAt: '2026-10-24T04:30:00Z',
  },
  {
    id: 302,
    providerId: 2001,
    categoryId: 4,
    categoryName: 'Sửa chữa máy giặt & Thiết bị bếp',
    title: 'Tháo lồng vệ sinh chuyên sâu máy giặt cửa ngang Inverter',
    description:
      'Tháo rời lồng giặt inox, tẩy sạch cặn bẩn lâu ngày, tra mỡ trục bi, kiểm tra dây curoa và bảng mạch điều khiển.',
    basePriceVnd: 450000,
    durationMinutes: 120,
    status: SERVICE_STATUS.PUBLISHED,
    images: [
      {
        id: 1003,
        imageUrl:
          'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80',
        altText: 'Vệ sinh lồng máy giặt cửa ngang',
        sortOrder: 0,
      },
    ],
    createdAt: '2026-10-19T07:15:00Z',
    updatedAt: '2026-10-23T09:00:00Z',
  },
  {
    id: 303,
    providerId: 2001,
    categoryId: 1,
    categoryName: 'Điện lạnh & Điều hòa',
    title: 'Kiểm tra & Nạp bổ sung gas R32/R410A cho điều hòa Inverter',
    description:
      'Đo kiểm tra độ lạnh sâu, xử lý rò rỉ đầu tán ống đồng và nạp bổ sung gas chính hãng đúng định mức nhà sản xuất.',
    basePriceVnd: 350000,
    durationMinutes: 90,
    status: SERVICE_STATUS.DRAFT,
    images: [],
    createdAt: '2026-10-22T10:00:00Z',
    updatedAt: '2026-10-22T10:00:00Z',
  },
  {
    id: 304,
    providerId: 2001,
    categoryId: 3,
    categoryName: 'Điện nước gia dụng',
    title: 'Bảo trì bình nóng lạnh & Súc xả cặn canxi thanh magie',
    description:
      'Tháo vệ sinh ruột bình, kiểm tra rơ-le chống giật ELCB và súc xả cặn bẩn giúp nước nóng nhanh, tiết kiệm điện.',
    basePriceVnd: 200000,
    durationMinutes: 60,
    status: SERVICE_STATUS.ARCHIVED,
    images: [],
    createdAt: '2026-10-16T05:00:00Z',
    updatedAt: '2026-10-21T11:20:00Z',
  },
]
