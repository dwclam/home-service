import { http } from '../../lib/http'
import { BOOKING_STATUS } from '../../constants/status'
import {
  INITIAL_MOCK_CUSTOMER_BOOKINGS,
  MOCK_CUSTOMER_ADDRESSES,
} from '../../mocks/bookings'
import { MOCK_PROVIDER_SERVICES } from '../../mocks/services'

let customerBookingsStore = [...INITIAL_MOCK_CUSTOMER_BOOKINGS]

const BOOKABLE_SERVICES_CATALOG = [
  {
    id: 1,
    providerId: 2,
    providerName: 'Trung Tâm Điện Lạnh Bách Khoa',
    categoryName: 'Điện lạnh & Điều hòa',
    title: 'Bảo dưỡng và vệ sinh điều hòa treo tường',
    description:
      'Xịt rửa dàn nóng/lạnh, thông tắc ống thoát nước, kiểm tra dòng điện và áp suất gas tiêu chuẩn.',
    basePriceVnd: 350000,
    durationMinutes: 60,
  },
  ...MOCK_PROVIDER_SERVICES.filter((s) => s.status === 'PUBLISHED').map(
    (s) => ({
      id: s.id,
      providerId: s.providerId || 2001,
      providerName: 'Điện Lạnh & Gia Dụng Bách Khoa 247',
      categoryName: s.categoryName,
      title: s.title,
      description: s.description,
      basePriceVnd: s.basePriceVnd,
      durationMinutes: s.durationMinutes,
    })
  ),
]

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

const isDevFallbackNeeded = (error) => {
  const status = error?.response?.status
  // Khi chạy FE độc lập hoặc dùng dev-seed token (401) hoặc chưa seed bảng services/addresses trong DB (404)
  return !error?.response || status === 401 || status === 404 || status === 502
}

/**
 * Sinh UUID v4 dùng làm clientRequestKey (Idempotency Key cho UC08).
 */
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
 * Đánh giá điều kiện hủy đơn và tính toán tỷ lệ hoàn cọc theo đúng Ma trận nghiệp vụ UC11.
 * Đối chiếu: BookingService.cancelBookingByCustomer & UC11_KHACH_HUY_DON.md mục 5.
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
      policyType: 'NO_DEPOSIT_YET',
      refundPercent: booking.providerRefundPercent ?? 100,
      estimatedRefundAmountVnd: 0,
      summaryTitle: 'Hủy trước khi thanh toán cọc (Miễn phí)',
      summaryDetail:
        status === BOOKING_STATUS.PENDING_DEPOSIT
          ? 'Đơn chưa thu tiền cọc. Khi hủy, hệ thống sẽ chuyển trạng thái sang Đã hủy và giải phóng khung lịch đã giữ của Nhà cung cấp.'
          : 'Đơn đang chờ Nhà cung cấp phản hồi và chưa thu tiền cọc. Bạn có thể hủy miễn phí.',
    }
  }

  if (status === BOOKING_STATUS.CONFIRMED) {
    if (nowMs >= startsAtMs) {
      return {
        canCancel: false,
        policyType: 'PAST_START_TIME',
        reasonBlocked:
          'Đã đến hoặc quá giờ hẹn. Theo quy tắc MD05, bạn không thể tự hủy đơn; vui lòng liên hệ bộ phận Hỗ trợ khách hàng.',
      }
    }

    if (nowMs <= cutoffMs) {
      const earlyPercent = booking.earlyRefundPercent ?? 50
      const estimatedRefund = Math.round((depositAmount * earlyPercent) / 100)
      return {
        canCancel: true,
        policyType: 'EARLY_CANCEL',
        refundPercent: earlyPercent,
        estimatedRefundAmountVnd: estimatedRefund,
        summaryTitle: `Hủy sớm (trước giờ hẹn ≥ ${cutoffMinutes} phút) — Hoàn ${earlyPercent}% tiền cọc`,
        summaryDetail: `Nếu hủy ngay bây giờ, bạn được hoàn ${earlyPercent}% tiền cọc (tương đương ${new Intl.NumberFormat('vi-VN').format(estimatedRefund)} đ trên tổng cọc ${new Intl.NumberFormat('vi-VN').format(depositAmount)} đ).`,
      }
    }

    const latePercent = booking.lateRefundPercent ?? 0
    const estimatedRefund = Math.round((depositAmount * latePercent) / 100)
    return {
      canCancel: true,
      policyType: 'LATE_CANCEL',
      refundPercent: latePercent,
      estimatedRefundAmountVnd: estimatedRefund,
      summaryTitle: `Hủy sát giờ hẹn (dưới ${cutoffMinutes} phút) — Hoàn ${latePercent}% tiền cọc`,
      summaryDetail: `Bạn đang hủy sát giờ hẹn (dưới ${cutoffMinutes} phút trước giờ bắt đầu). Theo chính sách đã chụp trên đơn, bạn không được hoàn tiền cọc (${latePercent}%).`,
    }
  }

  if (status === BOOKING_STATUS.IN_PROGRESS) {
    return {
      canCancel: false,
      policyType: 'IN_PROGRESS',
      reasonBlocked: 'Không thể tự hủy khi dịch vụ đang được thực hiện.',
    }
  }

  if (status === BOOKING_STATUS.COMPLETED) {
    return {
      canCancel: false,
      policyType: 'COMPLETED',
      reasonBlocked: 'Đơn dịch vụ đã hoàn thành, không thể hủy.',
    }
  }

  return {
    canCancel: false,
    policyType: 'TERMINATED',
    reasonBlocked: 'Đơn đặt lịch đã kết thúc trước đó.',
  }
}

export const getBookableServices = async () => {
  return BOOKABLE_SERVICES_CATALOG
}

export const getCustomerSavedAddresses = async () => {
  return MOCK_CUSTOMER_ADDRESSES
}

/**
 * Lấy danh sách đơn đặt lịch của khách hàng (kết hợp dữ liệu đã tạo trong phiên & mẫu kiểm thử).
 */
export const getMyCustomerBookings = async () => {
  try {
    const response = await http.get('/v1/customer/bookings', {
      _skipRefresh: true,
    })
    const unwrapped = unwrapResponse(response.data)
    const items = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped?.items || unwrapped?.content || []
    return {
      items,
      isMock: false,
    }
  } catch {
    const sorted = [...customerBookingsStore].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return {
      items: sorted,
      isMock: true,
    }
  }
}

/**
 * Gửi yêu cầu đặt lịch dịch vụ mới (UC08).
 * Endpoint: POST /api/v1/customer/bookings
 * Nguồn BE: CustomerBookingController.createBooking -> BookingService.createBooking
 */
export const createCustomerBooking = async (payload) => {
  const requestBody = {
    clientRequestKey: payload.clientRequestKey,
    providerId: Number(payload.providerId),
    serviceId: Number(payload.serviceId),
    startsAt: payload.startsAt,
    ...(payload.addressId ? { addressId: Number(payload.addressId) } : {}),
    ...(payload.recipientName?.trim()
      ? { recipientName: payload.recipientName.trim() }
      : {}),
    ...(payload.recipientPhone?.trim()
      ? { recipientPhone: payload.recipientPhone.trim() }
      : {}),
    ...(payload.addressLine?.trim()
      ? { addressLine: payload.addressLine.trim() }
      : {}),
    ...(payload.ward?.trim() ? { ward: payload.ward.trim() } : {}),
    ...(payload.city?.trim() ? { city: payload.city.trim() } : {}),
    ...(payload.addressInstructions?.trim()
      ? { addressInstructions: payload.addressInstructions.trim() }
      : {}),
    ...(payload.customerNote?.trim()
      ? { customerNote: payload.customerNote.trim() }
      : {}),
  }

  try {
    const response = await http.post('/v1/customer/bookings', requestBody)
    const createdBooking = unwrapResponse(response.data)
    // Đồng bộ vào store trên FE để trang danh sách hiển thị ngay
    customerBookingsStore = [
      createdBooking,
      ...customerBookingsStore.filter((b) => b.id !== createdBooking.id),
    ]
    return {
      data: createdBooking,
      message: response.data?.message || 'Đặt lịch thành công',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      // Kiểm tra Idempotency theo đúng logic BookingService.createBooking bước 1
      const existing = customerBookingsStore.find(
        (b) => b.clientRequestKey === requestBody.clientRequestKey
      )
      if (existing) {
        return {
          data: existing,
          message: 'Đặt lịch thành công (Idempotent)',
          isMock: true,
        }
      }

      // Kiểm tra quy tắc Lead-time 60 phút (MD01)
      const nowMs = Date.now()
      const startsAtMs = new Date(requestBody.startsAt).getTime()
      if (startsAtMs < nowMs + 60 * 60 * 1000) {
        const leadErr = new Error(
          'Thời gian đặt lịch phải cách thời điểm hiện tại ít nhất 60 phút'
        )
        leadErr.code = 'BUSINESS_ERROR'
        throw leadErr
      }

      const selectedService =
        BOOKABLE_SERVICES_CATALOG.find(
          (s) => s.id === requestBody.serviceId
        ) || BOOKABLE_SERVICES_CATALOG[0]

      const savedAddr = requestBody.addressId
        ? MOCK_CUSTOMER_ADDRESSES.find((a) => a.id === requestBody.addressId)
        : null

      const durationMinutes = selectedService.durationMinutes || 60
      const endsAtIso = new Date(
        startsAtMs + durationMinutes * 60 * 1000
      ).toISOString()

      // request_expires_at = min(now + 30m, starts_at - 30m) theo MD01
      const expireCandidateA = nowMs + 30 * 60 * 1000
      const expireCandidateB = startsAtMs - 30 * 60 * 1000
      const requestExpiresAtIso = new Date(
        Math.min(expireCandidateA, expireCandidateB)
      ).toISOString()

      const totalAmountVnd = selectedService.basePriceVnd
      const depositPercent = 30
      const depositAmountVnd = Math.round(
        (totalAmountVnd * depositPercent) / 100
      )
      const balanceAmountVnd = totalAmountVnd - depositAmountVnd

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const simulatedBooking = {
        id: Date.now(),
        version: 0,
        bookingCode: `BK-${dateStr}-${randCode}`,
        clientRequestKey: requestBody.clientRequestKey,
        customerId: 1001,
        customerName: 'Nguyễn Văn Khách',
        providerId: selectedService.providerId,
        providerName: selectedService.providerName,
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        durationMinutes,
        startsAt: requestBody.startsAt,
        endsAt: endsAtIso,
        status: BOOKING_STATUS.PENDING_PROVIDER,
        requestExpiresAt: requestExpiresAtIso,
        acceptedAt: null,
        depositDueAt: null,
        startedAt: null,
        completedAt: null,
        balanceDueAt: null,
        totalAmountVnd,
        depositPercent,
        depositAmountVnd,
        balanceAmountVnd,
        platformFeePercent: 20,
        cancelCutoffMinutes: 30,
        earlyRefundPercent: 50,
        lateRefundPercent: 0,
        providerRefundPercent: 100,
        systemRefundPercent: 100,
        settlementStatus: 'DRAFT',
        addressId: requestBody.addressId || null,
        recipientName:
          requestBody.recipientName ||
          savedAddr?.recipientName ||
          'Nguyễn Văn Khách',
        recipientPhone:
          requestBody.recipientPhone || savedAddr?.recipientPhone || '0901234567',
        addressLine:
          requestBody.addressLine || savedAddr?.addressLine || 'Số 123 Phố Huế',
        ward: requestBody.ward || savedAddr?.ward || '',
        city: requestBody.city || savedAddr?.city || 'Hà Nội',
        addressInstructions:
          requestBody.addressInstructions || savedAddr?.instructions || '',
        customerNote: requestBody.customerNote || '',
        createdAt: new Date().toISOString(),
      }

      customerBookingsStore = [simulatedBooking, ...customerBookingsStore]
      return {
        data: simulatedBooking,
        message: 'Đặt lịch thành công',
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Khách hàng hủy đơn đặt lịch (UC11).
 * Endpoint: POST /api/v1/customer/bookings/{bookingId}/cancel
 * Nguồn BE: CustomerBookingController.cancelBooking -> BookingService.cancelBookingByCustomer
 */
export const cancelCustomerBooking = async (bookingId, { version, reason }) => {
  const requestBody = {
    version: Number(version ?? 0),
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  }

  try {
    const response = await http.post(
      `/v1/customer/bookings/${bookingId}/cancel`,
      requestBody
    )
    const updatedBooking = unwrapResponse(response.data)
    customerBookingsStore = customerBookingsStore.map((b) =>
      b.id === bookingId ? updatedBooking : b
    )
    return {
      data: updatedBooking,
      message: response.data?.message || 'Hủy đơn đặt lịch thành công',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const target = customerBookingsStore.find((b) => b.id === bookingId)
      if (!target) {
        const notFoundErr = new Error(
          `Không tìm thấy đơn đặt lịch: ${bookingId}`
        )
        notFoundErr.code = 'NOT_FOUND'
        throw notFoundErr
      }

      if (
        requestBody.version !== undefined &&
        Number(requestBody.version) !== Number(target.version)
      ) {
        const conflictErr = new Error(
          'Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.'
        )
        conflictErr.code = 'DATA_CONFLICT'
        throw conflictErr
      }

      const evaluation = evaluateCancellationPolicy(target, new Date())
      if (!evaluation.canCancel) {
        const bizErr = new Error(evaluation.reasonBlocked)
        bizErr.code = 'BUSINESS_ERROR'
        throw bizErr
      }

      const cancelledBooking = {
        ...target,
        version: Number(target.version || 0) + 1,
        status: BOOKING_STATUS.CANCELLED,
        terminationKind: 'CANCEL',
        terminationActorType: 'CUSTOMER',
        terminatedByAccountId: target.customerId,
        terminationReasonCode: 'CUSTOMER_CANCEL',
        terminationReason: requestBody.reason || null,
        terminatedAt: new Date().toISOString(),
        refundPercent: evaluation.refundPercent,
        estimatedRefundAmountVnd: evaluation.estimatedRefundAmountVnd,
      }

      customerBookingsStore = customerBookingsStore.map((b) =>
        b.id === bookingId ? cancelledBooking : b
      )

      return {
        data: cancelledBooking,
        message: 'Hủy đơn đặt lịch thành công',
        isMock: true,
      }
    }
    throw error
  }
}
