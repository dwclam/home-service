import {
  AVAILABILITY_STATE,
  BANK_VERIFICATION_STATUS,
} from '../constants/status'

export const MOCK_PROVIDER_PROFILE = {
  accountId: 2001,
  applicationId: 101,
  email: 'provider.seed@nestify.vn',
  phone: '0909123456',
  businessName: 'Điện Lạnh & Gia Dụng Bách Khoa 247',
  bio: 'Đơn vị chuyên bảo dưỡng, vệ sinh và sửa chữa điều hòa, máy giặt, tủ lạnh tại nhà với đội ngũ kỹ thuật viên trên 5 năm kinh nghiệm, cam kết đúng giờ và minh bạch chi phí.',
  city: 'Hà Nội',
  address: 'Số 18 Đại Cồ Việt, Phường Lê Đại Hành, Quận Hai Bà Trưng, Hà Nội',
  logoUrl:
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=300&q=80',
  isVisible: true,
  bankCode: 'VCB - Vietcombank',
  bankAccountNumberMasked: '**** **** 8829',
  bankAccountHolderName: 'NGUYEN VAN MINH',
  bankVerificationStatus: BANK_VERIFICATION_STATUS.VERIFIED,
  bankVerifiedAt: '2026-10-20T08:30:00Z',
  createdAt: '2026-10-15T03:00:00Z',
  updatedAt: '2026-10-24T09:15:00Z',
}

export const MOCK_PROVIDER_AVAILABILITY = [
  {
    id: 501,
    providerId: 2001,
    startsAt: '2026-11-02T01:00:00Z', // 08:00 ICT
    endsAt: '2026-11-02T05:00:00Z', // 12:00 ICT
    state: AVAILABILITY_STATE.AVAILABLE,
    createdAt: '2026-10-25T02:00:00Z',
    updatedAt: '2026-10-25T02:00:00Z',
  },
  {
    id: 502,
    providerId: 2001,
    startsAt: '2026-11-02T06:30:00Z', // 13:30 ICT
    endsAt: '2026-11-02T10:30:00Z', // 17:30 ICT
    state: AVAILABILITY_STATE.AVAILABLE,
    createdAt: '2026-10-25T02:05:00Z',
    updatedAt: '2026-10-25T02:05:00Z',
  },
  {
    id: 503,
    providerId: 2001,
    startsAt: '2026-11-03T01:00:00Z', // 08:00 ICT
    endsAt: '2026-11-03T04:00:00Z', // 11:00 ICT
    state: AVAILABILITY_STATE.BLOCKED,
    createdAt: '2026-10-26T04:10:00Z',
    updatedAt: '2026-10-26T04:10:00Z',
  },
  {
    id: 504,
    providerId: 2001,
    startsAt: '2026-11-04T01:00:00Z', // 08:00 ICT
    endsAt: '2026-11-04T10:00:00Z', // 17:00 ICT
    state: AVAILABILITY_STATE.AVAILABLE,
    createdAt: '2026-10-27T01:00:00Z',
    updatedAt: '2026-10-27T01:00:00Z',
  },
]
