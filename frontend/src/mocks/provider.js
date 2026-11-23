import {
  AVAILABILITY_STATE,
  BANK_VERIFICATION_STATUS,
} from '../constants/status'

const buildFutureUtcSlot = (daysAhead, startHourLocal, endHourLocal) => {
  const base = new Date(Date.now() + daysAhead * 24 * 3600 * 1000)
  const start = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    startHourLocal,
    0,
    0,
    0
  )
  const end = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    endHourLocal,
    0,
    0,
    0
  )
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  }
}

export const MOCK_PROVIDER_PROFILE = {
  accountId: 2001,
  businessName: 'Điện Lạnh & Gia Dụng Bách Khoa 247',
  bio: 'Đơn vị chuyên bảo dưỡng, vệ sinh và sửa chữa điều hòa, máy giặt, tủ lạnh tại nhà với đội ngũ kỹ thuật viên trên 5 năm kinh nghiệm, cam kết đúng giờ và minh bạch chi phí.',
  city: 'Hà Nội',
  address: 'Số 18 Đại Cồ Việt, Phường Lê Đại Hành, Quận Hai Bà Trưng, Hà Nội',
  logoUrl:
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=300&q=80',
  visible: true,
  isVisible: true,
  bankVerificationStatus: BANK_VERIFICATION_STATUS.VERIFIED,
  updatedAt: new Date().toISOString(),
}

const slot1 = buildFutureUtcSlot(1, 8, 12)
const slot2 = buildFutureUtcSlot(1, 13, 17)
const slot3 = buildFutureUtcSlot(2, 9, 11)
const slot4 = buildFutureUtcSlot(3, 8, 17)

export const MOCK_PROVIDER_AVAILABILITY = [
  {
    id: 501,
    providerId: 2001,
    startsAt: slot1.startsAt,
    endsAt: slot1.endsAt,
    state: AVAILABILITY_STATE.AVAILABLE,
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: 502,
    providerId: 2001,
    startsAt: slot2.startsAt,
    endsAt: slot2.endsAt,
    state: AVAILABILITY_STATE.AVAILABLE,
    createdAt: new Date(Date.now() - 3500 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3500 * 1000).toISOString(),
  },
  {
    id: 503,
    providerId: 2001,
    startsAt: slot3.startsAt,
    endsAt: slot3.endsAt,
    state: AVAILABILITY_STATE.BLOCKED,
    createdAt: new Date(Date.now() - 3000 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3000 * 1000).toISOString(),
  },
  {
    id: 504,
    providerId: 2001,
    startsAt: slot4.startsAt,
    endsAt: slot4.endsAt,
    state: AVAILABILITY_STATE.AVAILABLE,
    createdAt: new Date(Date.now() - 2500 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2500 * 1000).toISOString(),
  },
]
