import { http } from '../../lib/http'
import { BOOKING_STATUS } from '../../constants/status'

const unwrapResponse = (responseData) => {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData &&
    'success' in responseData
  ) {
    return responseData.data
  }
  return responseData
}

export const generateClientRequestKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Đánh giá điều kiện hủy đơn và tỷ lệ hoàn cọc phía khách hàng (UC11).
 */
export const evaluateCancellationPolicy = (booking, nowDate = new Date()) => {
  if (!booking) {
    return {
      canCancel: false,
      reasonBlocked: 'Không tìm thấy thông tin đơn đặt lịch.',
    }
  }

  const status = booking.status
  const startsAtMs = new Date(booking.startsAt).getTime()
  const nowMs = nowDate.getTime()
  const cutoffMinutes = booking.cancelCutoffMinutes ?? 30
  const cutoffMs = startsAtMs - cutoffMinutes * 60 * 1000
  const depositAmount = Number(booking.depositAmountVnd || 0)

  if (
    status === BOOKING_STATUS.PENDING_PROVIDER ||
    status === BOOKING_STATUS.PENDING_DEPOSIT
  ) {
    return {
      canCancel: true,
      tier: 'FREE_BEFORE_DEPOSIT',
      refundPercent: 0,
      estimatedRefundAmountVnd: 0,
      headline: 'Hủy miễn phí — Chưa phát sinh thanh toán cọc',
      description:
        'Đơn chưa thu tiền cọc nên có thể hủy trực tiếp và giải phóng khung giờ ngay lập tức.',
    }
  }

  if (status === BOOKING_STATUS.CONFIRMED) {
    if (nowMs <= cutoffMs) {
      const earlyPercent = booking.earlyRefundPercent ?? 50
      const refundAmount = Math.round((depositAmount * earlyPercent) / 100)
      return {
        canCancel: true,
        tier: 'EARLY_CANCEL',
        refundPercent: earlyPercent,
        estimatedRefundAmountVnd: refundAmount,
        headline: `Hủy sớm — Hoàn ${earlyPercent}% tiền cọc`,
        description: `Bạn đang hủy trước giờ hẹn từ ${cutoffMinutes} phút trở lên. Khoản hoàn dự kiến là ${refundAmount.toLocaleString('vi-VN')} đ.`,
      }
    }

    const latePercent = booking.lateRefundPercent ?? 0
    const refundAmount = Math.round((depositAmount * latePercent) / 100)
    return {
      canCancel: true,
      tier: 'LATE_CANCEL',
      refundPercent: latePercent,
      estimatedRefundAmountVnd: refundAmount,
      headline: `Hủy sát giờ — Hoàn ${latePercent}% tiền cọc`,
      description: `Còn dưới ${cutoffMinutes} phút trước giờ hẹn. Theo chính sách, hủy sát giờ sẽ không được hoàn lại tiền cọc đã thanh toán.`,
    }
  }

  if (status === BOOKING_STATUS.IN_PROGRESS) {
    return {
      canCancel: false,
      reasonBlocked:
        'Dịch vụ đang được thực hiện nên không thể tự hủy. Vui lòng gửi yêu cầu hỗ trợ nếu gặp sự cố.',
    }
  }

  return {
    canCancel: false,
    reasonBlocked: 'Đơn đặt lịch đã ở trạng thái kết thúc, không thể hủy.',
  }
}

/* ============================================================================
 * KHÁCH HÀNG: ĐẶT LỊCH, XEM DANH SÁCH / CHI TIẾT & HỦY ĐƠN (UC08, UC10, UC11, UC38)
 * ========================================================================== */

export const createBooking = async (payload) => {
  const response = await http.post('/v1/customer/bookings', payload)
  return unwrapResponse(response.data)
}

/**
 * Lấy danh sách đơn đặt lịch của khách hàng (UC10).
 * Endpoint: GET /api/v1/customer/bookings?status=...&page=0&size=10
 */
export const getMyCustomerBookings = async ({
  status = 'ALL',
  page = 0,
  size = 10,
} = {}) => {
  const params = { page, size }
  if (status && status !== 'ALL') {
    params.status = status
  }

  const response = await http.get('/v1/customer/bookings', { params })
  const unwrapped = unwrapResponse(response.data)
  const items = Array.isArray(unwrapped)
    ? unwrapped
    : unwrapped?.items || unwrapped?.content || []

  return {
    items,
    pageData: {
      items,
      page: unwrapped?.page ?? unwrapped?.number ?? page,
      size: unwrapped?.size ?? size,
      totalElements: unwrapped?.totalElements ?? items.length,
      totalPages: Math.max(1, unwrapped?.totalPages ?? 1),
    },
  }
}

/**
 * Lấy chi tiết đơn đặt lịch của khách hàng (UC10).
 * Endpoint: GET /api/v1/customer/bookings/{bookingId}
 */
export const getBookingDetail = async (bookingId) => {
  const response = await http.get(`/v1/customer/bookings/${bookingId}`)
  return unwrapResponse(response.data)
}

/**
 * Khách hàng hủy đơn đặt lịch (UC11).
 * Endpoint: POST /api/v1/customer/bookings/{bookingId}/cancel
 */
export const cancelBooking = async (bookingId, { version, reason }) => {
  const response = await http.post(`/v1/customer/bookings/${bookingId}/cancel`, {
    version,
    reason: reason?.trim() || undefined,
  })
  return unwrapResponse(response.data)
}

export const cancelCustomerBooking = async (bookingId, { version, reason }) => {
  const response = await http.post(`/v1/customer/bookings/${bookingId}/cancel`, {
    version,
    reason: reason?.trim() || undefined,
  })
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã hủy đơn đặt lịch.',
  }
}

/**
 * Xem lịch rảnh và giá của một gói dịch vụ (UC38).
 * Endpoint: GET /api/v1/customer/services/{serviceId}/available-slots
 */
export const getServiceAvailableSlots = async (serviceId, { from, to } = {}) => {
  const params = {}
  if (from) params.from = from
  if (to) params.to = to

  const response = await http.get(
    `/v1/customer/services/${serviceId}/available-slots`,
    { params }
  )
  return {
    data: unwrapResponse(response.data),
  }
}

/* ============================================================================
 * NHÀ CUNG CẤP: DANH SÁCH, CHI TIẾT & THAO TÁC ĐƠN (UC40, UC21, UC22, UC41)
 * ========================================================================== */

export const getMyProviderBookings = async ({
  status = 'ALL',
  keyword = '',
  page = 0,
  size = 10,
} = {}) => {
  const params = { page, size }
  if (status && status !== 'ALL') {
    params.status = status
  }

  const response = await http.get('/v1/provider/bookings', { params })
  const unwrapped = unwrapResponse(response.data)
  let items = Array.isArray(unwrapped)
    ? unwrapped
    : unwrapped?.items || unwrapped?.content || []

  if (keyword?.trim()) {
    const kw = keyword.trim().toLowerCase()
    items = items.filter(
      (item) =>
        item.bookingCode?.toLowerCase().includes(kw) ||
        item.serviceTitle?.toLowerCase().includes(kw) ||
        item.recipientName?.toLowerCase().includes(kw) ||
        item.city?.toLowerCase().includes(kw)
    )
  }

  return {
    items,
    pageData: {
      items,
      page: unwrapped?.page ?? unwrapped?.number ?? page,
      size: unwrapped?.size ?? size,
      totalElements: unwrapped?.totalElements ?? items.length,
      totalPages: Math.max(1, unwrapped?.totalPages ?? 1),
    },
  }
}

export const getProviderBookingDetail = async (bookingId) => {
  const response = await http.get(`/v1/provider/bookings/${bookingId}`)
  return {
    data: unwrapResponse(response.data),
  }
}

export const acceptProviderBooking = async (bookingId, { version } = {}) => {
  const body = version !== undefined && version !== null ? { version } : {}
  const response = await http.post(`/v1/provider/bookings/${bookingId}/accept`, body)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã chấp nhận đơn đặt lịch.',
  }
}

export const rejectProviderBooking = async (bookingId, { reason, version }) => {
  const body = {
    reason: reason.trim(),
    ...(version !== undefined && version !== null ? { version } : {}),
  }
  const response = await http.post(`/v1/provider/bookings/${bookingId}/reject`, body)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã từ chối đơn đặt lịch.',
  }
}

export const cancelProviderBooking = async (bookingId, { reason, version }) => {
  const body = {
    reason: reason.trim(),
    ...(version !== undefined && version !== null ? { version } : {}),
  }
  const response = await http.post(`/v1/provider/bookings/${bookingId}/cancel`, body)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã hủy đơn đặt lịch.',
  }
}

export const startProviderService = async (bookingId, { note, version } = {}) => {
  const body = {
    ...(note?.trim() ? { note: note.trim() } : {}),
    ...(version !== undefined && version !== null ? { version } : {}),
  }
  const response = await http.post(`/v1/provider/bookings/${bookingId}/start`, body)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã bắt đầu thực hiện dịch vụ.',
  }
}

export const completeProviderService = async (bookingId, { note, version } = {}) => {
  const body = {
    ...(note?.trim() ? { note: note.trim() } : {}),
    ...(version !== undefined && version !== null ? { version } : {}),
  }
  const response = await http.post(`/v1/provider/bookings/${bookingId}/complete`, body)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã hoàn thành dịch vụ.',
  }
}

/* ============================================================================
 * QUẢN TRỊ VIÊN: THEO DÕI, CAN THIỆP ĐƠN & QUÉT HẾT HẠN (UC31 & UC51)
 * ========================================================================== */

export const getAdminBookings = async (filter = {}) => {
  const params = {}
  if (filter.status && filter.status !== 'ALL') params.status = filter.status
  if (filter.settlementStatus && filter.settlementStatus !== 'ALL') {
    params.settlementStatus = filter.settlementStatus
  }
  if (filter.bookingCode?.trim()) params.bookingCode = filter.bookingCode.trim()
  if (filter.customerId) params.customerId = filter.customerId
  if (filter.providerId) params.providerId = filter.providerId
  if (filter.serviceId) params.serviceId = filter.serviceId
  if (filter.dateFilterType) params.dateFilterType = filter.dateFilterType
  if (filter.from) params.from = filter.from
  if (filter.to) params.to = filter.to
  params.page = filter.page ?? 0
  params.size = filter.size ?? 10
  if (filter.sortBy) params.sortBy = filter.sortBy
  if (filter.sortDir) params.sortDir = filter.sortDir

  const response = await http.get('/v1/admin/bookings', { params })
  const unwrapped = unwrapResponse(response.data)
  const items = Array.isArray(unwrapped)
    ? unwrapped
    : unwrapped?.items || unwrapped?.content || []

  return {
    pageData: {
      items,
      page: unwrapped?.page ?? unwrapped?.number ?? params.page,
      size: unwrapped?.size ?? params.size,
      totalElements: unwrapped?.totalElements ?? items.length,
      totalPages: Math.max(1, unwrapped?.totalPages ?? 1),
    },
  }
}

export const getAdminBookingDetail = async (bookingId) => {
  const response = await http.get(`/v1/admin/bookings/${bookingId}`)
  return unwrapResponse(response.data)
}

export const adminCancelBooking = async (bookingId, { reasonCode, reason, version }) => {
  const body = {
    reasonCode,
    reason: reason.trim(),
    ...(version !== undefined && version !== null ? { version } : {}),
  }
  const response = await http.post(`/v1/admin/bookings/${bookingId}/cancel`, body)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Can thiệp hủy đơn thành công.',
  }
}

export const adminHoldSettlement = async (bookingId, { reason, version }) => {
  const body = {
    reason: reason.trim(),
    ...(version !== undefined && version !== null ? { version } : {}),
  }
  const response = await http.post(`/v1/admin/bookings/${bookingId}/hold-settlement`, body)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã tạm giữ đối soát đơn đặt lịch.',
  }
}

export const adminReleaseSettlement = async (bookingId, { reason, version }) => {
  const body = {
    reason: reason.trim(),
    ...(version !== undefined && version !== null ? { version } : {}),
  }
  const response = await http.post(`/v1/admin/bookings/${bookingId}/release-settlement`, body)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã mở lại đối soát đơn đặt lịch.',
  }
}

export const triggerAdminExpireOverdueBookings = async () => {
  const response = await http.post('/v1/admin/bookings/expire-overdue')
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã hoàn tất quét đơn quá hạn.',
  }
}
