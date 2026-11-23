import { http } from '../../lib/http'
import { BOOKING_STATUS } from '../../constants/status'
import {
  INITIAL_MOCK_CUSTOMER_BOOKINGS,
  MOCK_CUSTOMER_ADDRESSES,
} from '../../mocks/bookings'
import { MOCK_PROVIDER_SERVICES } from '../../mocks/services'
import { catalogServices } from '../../data/home'

let sharedBookingsStore = [...INITIAL_MOCK_CUSTOMER_BOOKINGS]

const BOOKABLE_SERVICES_CATALOG = [
  ...catalogServices.map((s) => ({
    id: s.id,
    providerId: s.providerId || 2,
    providerName: s.provider,
    categoryName: s.category,
    title: s.title,
    description: s.description,
    basePriceVnd: s.basePriceVnd,
    durationMinutes: s.durationMinutes,
    image: s.image,
    initials: s.initials,
    rating: s.rating,
    reviews: s.reviews,
  })),
  ...MOCK_PROVIDER_SERVICES.filter(
    (s) =>
      s.status === 'PUBLISHED' &&
      !catalogServices.some((cs) => Number(cs.id) === Number(s.id))
  ).map((s) => ({
    id: s.id,
    providerId: s.providerId || 2001,
    providerName: 'Điện Lạnh Bách Khoa 247',
    categoryName: s.categoryName,
    title: s.title,
    description: s.description,
    basePriceVnd: s.basePriceVnd,
    durationMinutes: s.durationMinutes,
    image: s.images?.[0]?.imageUrl,
    initials: 'BK',
    rating: '4.9',
    reviews: 120,
  })),
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
  return (
    !error?.response ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 405 ||
    status === 502
  )
}

const upsertBookingInSharedStore = (booking) => {
  if (!booking || !booking.id) return
  const exists = sharedBookingsStore.some(
    (b) => Number(b.id) === Number(booking.id)
  )
  if (exists) {
    sharedBookingsStore = sharedBookingsStore.map((b) =>
      Number(b.id) === Number(booking.id) ? { ...b, ...booking } : b
    )
  } else {
    sharedBookingsStore = [booking, ...sharedBookingsStore]
  }
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
      summaryTitle: 'Hủy đơn miễn phí',
      summaryDetail:
        status === BOOKING_STATUS.PENDING_DEPOSIT
          ? 'Đơn chưa thu tiền cọc. Khi hủy, hệ thống sẽ chuyển trạng thái sang Đã hủy và mở lại khung lịch của Nhà cung cấp.'
          : 'Đơn đang chờ Nhà cung cấp phản hồi và chưa thu tiền cọc. Bạn có thể hủy miễn phí.',
    }
  }

  if (status === BOOKING_STATUS.CONFIRMED) {
    if (nowMs >= startsAtMs) {
      return {
        canCancel: false,
        policyType: 'PAST_START_TIME',
        reasonBlocked:
          'Đã đến hoặc quá giờ hẹn. Bạn không thể tự hủy đơn; vui lòng liên hệ bộ phận Hỗ trợ khách hàng.',
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
        summaryTitle: `Hoàn ${earlyPercent}% tiền cọc`,
        summaryDetail: `Nếu hủy ngay bây giờ, bạn được hoàn ${new Intl.NumberFormat('vi-VN').format(estimatedRefund)} đ trên tổng tiền cọc ${new Intl.NumberFormat('vi-VN').format(depositAmount)} đ.`,
      }
    }

    const latePercent = booking.lateRefundPercent ?? 0
    const estimatedRefund = Math.round((depositAmount * latePercent) / 100)
    return {
      canCancel: true,
      policyType: 'LATE_CANCEL',
      refundPercent: latePercent,
      estimatedRefundAmountVnd: estimatedRefund,
      summaryTitle: `Không hoàn tiền cọc`,
      summaryDetail: `Bạn đang hủy sát giờ hẹn nên tiền cọc không được hoàn lại.`,
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

/**
 * Lấy danh sách dịch vụ có thể đặt lịch (nối UC05 GET /api/customer/services của Cường).
 */
export const getBookableServices = async () => {
  try {
    const response = await http.get('/customer/services', {
      params: { page: 0, size: 20 },
      _skipRefresh: true,
    })
    const unwrapped = unwrapResponse(response.data)
    const items = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped?.items || unwrapped?.content || []

    if (items.length > 0) {
      return items.map((srv) => ({
        id: srv.id,
        providerId: srv.providerId,
        providerName: srv.providerBusinessName || srv.providerName || 'Đối tác Nestify',
        categoryName: srv.categoryName || 'Dịch vụ tại nhà',
        title: srv.title,
        description: srv.description || 'Gói dịch vụ tiêu chuẩn theo niêm yết.',
        basePriceVnd: srv.basePriceVnd,
        durationMinutes: srv.durationMinutes,
      }))
    }
    return BOOKABLE_SERVICES_CATALOG
  } catch {
    return BOOKABLE_SERVICES_CATALOG
  }
}

/**
 * Tra cứu lịch rảnh và giá của một dịch vụ cụ thể (UC38 - Thuỷ phụ trách BE).
 * Endpoint Backend: GET /api/v1/customer/services/{serviceId}/available-slots
 */
export const getServiceAvailableSlots = async (serviceId, { from, to } = {}) => {
  try {
    const params = {}
    if (from) params.from = from
    if (to) params.to = to

    const response = await http.get(
      `/v1/customer/services/${serviceId}/available-slots`,
      {
        params,
        _skipRefresh: true,
      }
    )
    const data = unwrapResponse(response.data)
    return {
      data,
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const selected =
        BOOKABLE_SERVICES_CATALOG.find((s) => Number(s.id) === Number(serviceId)) ||
        BOOKABLE_SERVICES_CATALOG[0]

      const simulatedSlots = [1, 2, 3].flatMap((dayOffset) => {
        const base = new Date(Date.now() + dayOffset * 24 * 3600 * 1000)
        const s1 = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          8,
          0,
          0
        )
        const e1 = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          12,
          0,
          0
        )
        const s2 = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          13,
          30,
          0
        )
        const e2 = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          17,
          30,
          0
        )
        return [
          { startsAt: s1.toISOString(), endsAt: e1.toISOString() },
          { startsAt: s2.toISOString(), endsAt: e2.toISOString() },
        ]
      })

      return {
        data: {
          serviceId: selected.id,
          serviceTitle: selected.title,
          durationMinutes: selected.durationMinutes,
          basePriceVnd: selected.basePriceVnd,
          provider: {
            providerId: selected.providerId,
            businessName: selected.providerName,
            city: 'Hà Nội',
          },
          availableSlots: simulatedSlots,
        },
        isMock: true,
      }
    }
    throw error
  }
}

export const getCustomerSavedAddresses = async () => {
  return MOCK_CUSTOMER_ADDRESSES
}

/**
 * Lấy danh sách đơn đặt lịch của khách hàng (UC10).
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
    items.forEach(upsertBookingInSharedStore)
    return {
      items,
      isMock: false,
    }
  } catch {
    const sorted = [...sharedBookingsStore].sort(
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
    upsertBookingInSharedStore(createdBooking)
    return {
      data: createdBooking,
      message: response.data?.message || 'Đặt lịch thành công',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const existing = sharedBookingsStore.find(
        (b) => b.clientRequestKey === requestBody.clientRequestKey
      )
      if (existing) {
        return {
          data: existing,
          message: 'Đặt lịch thành công (Idempotent)',
          isMock: true,
        }
      }

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

      upsertBookingInSharedStore(simulatedBooking)
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
    upsertBookingInSharedStore(updatedBooking)
    return {
      data: updatedBooking,
      message: response.data?.message || 'Hủy đơn đặt lịch thành công',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const target = sharedBookingsStore.find(
        (b) => Number(b.id) === Number(bookingId)
      )
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

      upsertBookingInSharedStore(cancelledBooking)

      return {
        data: cancelledBooking,
        message: 'Hủy đơn đặt lịch thành công',
        isMock: true,
      }
    }
    throw error
  }
}

/* ==========================================================================
   KHU VỰC ĐƠN ĐẶT DỊCH VỤ CỦA NHÀ CUNG CẤP (UC21, UC22, UC40, UC51 — MINH FE2)
   ========================================================================== */

/**
 * Lấy danh sách đơn được giao cho Nhà cung cấp (UC40).
 * Endpoint: GET /api/v1/provider/bookings
 */
export const getMyProviderBookings = async ({
  status = 'ALL',
  keyword = '',
} = {}) => {
  try {
    const queryParams = {
      ...(status && status !== 'ALL' ? { status } : {}),
    }
    const response = await http.get('/v1/provider/bookings', {
      params: queryParams,
      _skipRefresh: true,
    })
    const unwrapped = unwrapResponse(response.data)
    let items = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped?.items || unwrapped?.content || []

    items.forEach(upsertBookingInSharedStore)

    if (keyword?.trim()) {
      const kw = keyword.trim().toLowerCase()
      items = items.filter(
        (b) =>
          b.bookingCode?.toLowerCase().includes(kw) ||
          b.serviceTitle?.toLowerCase().includes(kw) ||
          b.recipientName?.toLowerCase().includes(kw) ||
          b.recipientPhone?.toLowerCase().includes(kw) ||
          String(b.id).includes(kw)
      )
    }

    return {
      items,
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      let filtered = [...sharedBookingsStore].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      if (status && status !== 'ALL') {
        if (status === 'TERMINATED_GROUP') {
          filtered = filtered.filter((b) =>
            [
              BOOKING_STATUS.CANCELLED,
              BOOKING_STATUS.REJECTED,
              BOOKING_STATUS.EXPIRED,
            ].includes(b.status)
          )
        } else {
          filtered = filtered.filter((b) => b.status === status)
        }
      }

      if (keyword?.trim()) {
        const kw = keyword.trim().toLowerCase()
        filtered = filtered.filter(
          (b) =>
            b.bookingCode?.toLowerCase().includes(kw) ||
            b.serviceTitle?.toLowerCase().includes(kw) ||
            b.recipientName?.toLowerCase().includes(kw) ||
            b.recipientPhone?.toLowerCase().includes(kw) ||
            String(b.id).includes(kw)
        )
      }

      return {
        items: filtered,
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Nhà cung cấp chấp nhận đơn đặt lịch (UC21).
 * Endpoint Backend: POST /api/v1/provider/bookings/{bookingId}/accept
 * Nguồn BE: ProviderBookingController.acceptBooking -> BookingService.acceptBookingByProvider
 */
export const acceptProviderBooking = async (bookingId, { version } = {}) => {
  const payload =
    version !== undefined && version !== null ? { version: Number(version) } : {}

  try {
    const response = await http.post(
      `/v1/provider/bookings/${bookingId}/accept`,
      payload
    )
    const updatedBooking = unwrapResponse(response.data)
    upsertBookingInSharedStore(updatedBooking)
    return {
      data: updatedBooking,
      message:
        response.data?.message ||
        'Nhà cung cấp đã chấp nhận đơn đặt lịch thành công',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const target = sharedBookingsStore.find(
        (b) => Number(b.id) === Number(bookingId)
      )
      if (!target) {
        const err = new Error(`Không tìm thấy đơn đặt lịch: ${bookingId}`)
        err.code = 'NOT_FOUND'
        throw err
      }

      if (
        payload.version !== undefined &&
        Number(payload.version) !== Number(target.version)
      ) {
        const conflictErr = new Error(
          'Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.'
        )
        conflictErr.code = 'DATA_CONFLICT'
        throw conflictErr
      }

      if (target.status !== BOOKING_STATUS.PENDING_PROVIDER) {
        const statusErr = new Error(
          `Đơn đặt lịch không ở trạng thái chờ phản hồi: ${target.status}`
        )
        statusErr.code = 'BUSINESS_ERROR'
        throw statusErr
      }

      const nowMs = Date.now()
      const nowIso = new Date(nowMs).toISOString()

      // Kiểm tra hạn phản hồi (MD01 / UC51 Lazy Check)
      if (
        target.requestExpiresAt &&
        nowMs > new Date(target.requestExpiresAt).getTime()
      ) {
        const expiredBooking = {
          ...target,
          version: Number(target.version || 0) + 1,
          status: BOOKING_STATUS.EXPIRED,
          terminationKind: 'EXPIRE',
          terminationActorType: 'SYSTEM',
          terminationReasonCode: 'PROVIDER_RESPONSE_TIMEOUT',
          terminationReason:
            'Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)',
          terminatedAt: nowIso,
          refundPercent: 100,
        }
        upsertBookingInSharedStore(expiredBooking)
        const expErr = new Error(
          'Yêu cầu đặt lịch đã quá hạn phản hồi của Nhà cung cấp.'
        )
        expErr.code = 'BUSINESS_ERROR'
        throw expErr
      }

      // Kiểm tra xung đột lịch giữ chỗ độc quyền (PENDING_DEPOSIT còn hạn, CONFIRMED, IN_PROGRESS)
      const targetStart = new Date(target.startsAt).getTime()
      const targetEnd = new Date(target.endsAt).getTime()

      const competing = sharedBookingsStore.find((other) => {
        if (Number(other.id) === Number(target.id)) return false
        if (Number(other.providerId) !== Number(target.providerId)) return false

        const isHolding =
          other.status === BOOKING_STATUS.CONFIRMED ||
          other.status === BOOKING_STATUS.IN_PROGRESS ||
          (other.status === BOOKING_STATUS.PENDING_DEPOSIT &&
            (!other.depositDueAt ||
              new Date(other.depositDueAt).getTime() > nowMs))

        if (!isHolding) return false
        const otherStart = new Date(other.startsAt).getTime()
        const otherEnd = new Date(other.endsAt).getTime()
        return targetStart < otherEnd && otherStart < targetEnd
      })

      if (competing) {
        const overlapErr = new Error(
          `Không thể chấp nhận đơn vì khung giờ này đã có đơn đặt lịch ${competing.bookingCode} đang giữ chỗ hoặc đã xác nhận.`
        )
        overlapErr.code = 'DATA_CONFLICT'
        throw overlapErr
      }

      // deposit_due_at = min(now + 15m, starts_at - 15m)
      const depositDueCandidateA = nowMs + 15 * 60 * 1000
      const depositDueCandidateB = targetStart - 15 * 60 * 1000
      const depositDueAtIso = new Date(
        Math.min(depositDueCandidateA, depositDueCandidateB)
      ).toISOString()

      const acceptedBooking = {
        ...target,
        version: Number(target.version || 0) + 1,
        status: BOOKING_STATUS.PENDING_DEPOSIT,
        acceptedAt: nowIso,
        depositDueAt: depositDueAtIso,
        updatedAt: nowIso,
      }

      upsertBookingInSharedStore(acceptedBooking)
      return {
        data: acceptedBooking,
        message: 'Nhà cung cấp đã chấp nhận đơn đặt lịch thành công',
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Nhà cung cấp từ chối đơn đặt lịch (UC21).
 * Endpoint Backend: POST /api/v1/provider/bookings/{bookingId}/reject
 * Nguồn BE: ProviderBookingController.rejectBooking -> BookingService.rejectBookingByProvider
 */
export const rejectProviderBooking = async (
  bookingId,
  { reason, version }
) => {
  const payload = {
    reason: reason?.trim() || '',
    ...(version !== undefined && version !== null
      ? { version: Number(version) }
      : {}),
  }

  try {
    const response = await http.post(
      `/v1/provider/bookings/${bookingId}/reject`,
      payload
    )
    const updatedBooking = unwrapResponse(response.data)
    upsertBookingInSharedStore(updatedBooking)
    return {
      data: updatedBooking,
      message:
        response.data?.message ||
        'Nhà cung cấp đã từ chối đơn đặt lịch thành công',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const target = sharedBookingsStore.find(
        (b) => Number(b.id) === Number(bookingId)
      )
      if (!target) {
        const err = new Error(`Không tìm thấy đơn đặt lịch: ${bookingId}`)
        err.code = 'NOT_FOUND'
        throw err
      }

      if (!payload.reason) {
        const valErr = new Error('Lý do từ chối không được để trống.')
        valErr.code = 'BUSINESS_ERROR'
        throw valErr
      }

      if (
        payload.version !== undefined &&
        Number(payload.version) !== Number(target.version)
      ) {
        const conflictErr = new Error(
          'Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.'
        )
        conflictErr.code = 'DATA_CONFLICT'
        throw conflictErr
      }

      if (target.status !== BOOKING_STATUS.PENDING_PROVIDER) {
        const statusErr = new Error(
          `Đơn đặt lịch không ở trạng thái chờ phản hồi: ${target.status}`
        )
        statusErr.code = 'BUSINESS_ERROR'
        throw statusErr
      }

      const nowIso = new Date().toISOString()
      const rejectedBooking = {
        ...target,
        version: Number(target.version || 0) + 1,
        status: BOOKING_STATUS.REJECTED,
        terminationKind: 'REJECT',
        terminationActorType: 'PROVIDER',
        terminatedByAccountId: target.providerId,
        terminationReasonCode: 'PROVIDER_REJECT',
        terminationReason: payload.reason,
        terminatedAt: nowIso,
        refundPercent: 100,
        updatedAt: nowIso,
      }

      upsertBookingInSharedStore(rejectedBooking)
      return {
        data: rejectedBooking,
        message: 'Nhà cung cấp đã từ chối đơn đặt lịch thành công',
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Nhà cung cấp bắt đầu thực hiện dịch vụ (UC22).
 * Endpoint Backend: POST /api/v1/provider/bookings/{bookingId}/start
 * Nguồn BE: ProviderBookingController.startService -> BookingService.startServiceByProvider
 */
export const startProviderService = async (
  bookingId,
  { version, note } = {}
) => {
  const payload = {
    ...(version !== undefined && version !== null
      ? { version: Number(version) }
      : {}),
    ...(note?.trim() ? { note: note.trim() } : {}),
  }

  try {
    const response = await http.post(
      `/v1/provider/bookings/${bookingId}/start`,
      payload
    )
    const updatedBooking = unwrapResponse(response.data)
    upsertBookingInSharedStore(updatedBooking)
    return {
      data: updatedBooking,
      message:
        response.data?.message || 'Bắt đầu thực hiện dịch vụ thành công',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const target = sharedBookingsStore.find(
        (b) => Number(b.id) === Number(bookingId)
      )
      if (!target) {
        const err = new Error(`Không tìm thấy đơn đặt lịch: ${bookingId}`)
        err.code = 'NOT_FOUND'
        throw err
      }

      if (
        payload.version !== undefined &&
        Number(payload.version) !== Number(target.version)
      ) {
        const conflictErr = new Error(
          'Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.'
        )
        conflictErr.code = 'DATA_CONFLICT'
        throw conflictErr
      }

      if (target.status !== BOOKING_STATUS.CONFIRMED) {
        const statusErr = new Error(
          `Đơn đặt lịch không ở trạng thái đã xác nhận (CONFIRMED): ${target.status}`
        )
        statusErr.code = 'BUSINESS_ERROR'
        throw statusErr
      }

      const nowMs = Date.now()
      const startsAtMs = new Date(target.startsAt).getTime()

      // BR-UC22-03: now >= startsAt
      if (nowMs < startsAtMs) {
        const timeErr = new Error(
          `Chưa đến giờ hẹn thực hiện dịch vụ. Đơn đặt lịch chỉ có thể bắt đầu từ: ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(target.startsAt))}`
        )
        timeErr.code = 'BUSINESS_ERROR'
        throw timeErr
      }

      // BR-UC22-04: Không có đơn khác đang IN_PROGRESS của cùng NCC
      const concurrentInProgress = sharedBookingsStore.find(
        (other) =>
          Number(other.id) !== Number(target.id) &&
          Number(other.providerId) === Number(target.providerId) &&
          other.status === BOOKING_STATUS.IN_PROGRESS
      )
      if (concurrentInProgress) {
        const concErr = new Error(
          `Nhà cung cấp đang có đơn đặt lịch ${concurrentInProgress.bookingCode} đang được thực hiện. Vui lòng hoàn thành đơn hiện tại trước khi bắt đầu đơn mới.`
        )
        concErr.code = 'DATA_CONFLICT'
        throw concErr
      }

      const nowIso = new Date(nowMs).toISOString()
      const startedBooking = {
        ...target,
        version: Number(target.version || 0) + 1,
        status: BOOKING_STATUS.IN_PROGRESS,
        startedAt: nowIso,
        providerStartNote: payload.note || null,
        updatedAt: nowIso,
      }

      upsertBookingInSharedStore(startedBooking)
      return {
        data: startedBooking,
        message: 'Bắt đầu thực hiện dịch vụ thành công',
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Nhà cung cấp hoàn thành dịch vụ (UC22).
 * Endpoint Backend: POST /api/v1/provider/bookings/{bookingId}/complete
 * Nguồn BE: ProviderBookingController.completeService -> BookingService.completeServiceByProvider
 */
export const completeProviderService = async (
  bookingId,
  { version, note } = {}
) => {
  const payload = {
    ...(version !== undefined && version !== null
      ? { version: Number(version) }
      : {}),
    ...(note?.trim() ? { note: note.trim() } : {}),
  }

  try {
    const response = await http.post(
      `/v1/provider/bookings/${bookingId}/complete`,
      payload
    )
    const updatedBooking = unwrapResponse(response.data)
    upsertBookingInSharedStore(updatedBooking)
    return {
      data: updatedBooking,
      message:
        response.data?.message || 'Hoàn thành thực hiện dịch vụ thành công',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const target = sharedBookingsStore.find(
        (b) => Number(b.id) === Number(bookingId)
      )
      if (!target) {
        const err = new Error(`Không tìm thấy đơn đặt lịch: ${bookingId}`)
        err.code = 'NOT_FOUND'
        throw err
      }

      if (
        payload.version !== undefined &&
        Number(payload.version) !== Number(target.version)
      ) {
        const conflictErr = new Error(
          'Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.'
        )
        conflictErr.code = 'DATA_CONFLICT'
        throw conflictErr
      }

      if (target.status !== BOOKING_STATUS.IN_PROGRESS) {
        const statusErr = new Error(
          `Đơn đặt lịch không ở trạng thái đang thực hiện (IN_PROGRESS): ${target.status}`
        )
        statusErr.code = 'BUSINESS_ERROR'
        throw statusErr
      }

      const nowMs = Date.now()
      const nowIso = new Date(nowMs).toISOString()
      const balanceDueAtIso = new Date(
        nowMs + 24 * 3600 * 1000
      ).toISOString()

      const completedBooking = {
        ...target,
        version: Number(target.version || 0) + 1,
        status: BOOKING_STATUS.COMPLETED,
        completedAt: nowIso,
        balanceDueAt: balanceDueAtIso,
        settlementStatus: 'DRAFT',
        providerCompleteNote: payload.note || null,
        updatedAt: nowIso,
      }

      upsertBookingInSharedStore(completedBooking)
      return {
        data: completedBooking,
        message: 'Hoàn thành thực hiện dịch vụ thành công',
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Hỗ trợ mô phỏng Khách hàng đã thanh toán cọc 30% (Dev Seed — phục vụ diễn tập liên hoàn
 * PENDING_PROVIDER -> PENDING_DEPOSIT -> CONFIRMED -> IN_PROGRESS -> COMPLETED khi chưa bật cổng VNPay).
 */
export const simulateDepositPaidForDev = (bookingId) => {
  const target = sharedBookingsStore.find(
    (b) => Number(b.id) === Number(bookingId)
  )
  if (!target || target.status !== BOOKING_STATUS.PENDING_DEPOSIT) {
    return null
  }
  const nowMs = Date.now()
  // Điều chỉnh startsAt về hiện tại nếu đang ở xa tương lai để có thể diễn tập bấm "Bắt đầu dịch vụ" ngay
  const currentStartMs = new Date(target.startsAt).getTime()
  const adjustedStartIso =
    currentStartMs > nowMs
      ? new Date(nowMs - 60 * 1000).toISOString()
      : target.startsAt
  const durationMinutes = Number(target.durationMinutes || 60)
  const adjustedEndIso = new Date(
    new Date(adjustedStartIso).getTime() + durationMinutes * 60 * 1000
  ).toISOString()

  const updated = {
    ...target,
    version: Number(target.version || 0) + 1,
    status: BOOKING_STATUS.CONFIRMED,
    startsAt: adjustedStartIso,
    endsAt: adjustedEndIso,
    updatedAt: new Date(nowMs).toISOString(),
  }
  upsertBookingInSharedStore(updated)
  return updated
}

/* ==========================================================================
   KHU VỰC ADMIN VẬN HÀNH ĐƠN (UC51 — QUÉT & HẾT HẠN ĐƠN QUÁ HẠN)
   ========================================================================== */

/**
 * Kích hoạt thủ công tác vụ quét và hết hạn các đơn đặt lịch quá hạn (UC51).
 * Endpoint Backend: POST /api/v1/admin/bookings/expire-overdue
 * Nguồn BE: AdminBookingController.triggerOverdueExpiration
 */
export const triggerAdminExpireOverdueBookings = async () => {
  try {
    const response = await http.post('/v1/admin/bookings/expire-overdue', {})
    const resultData = unwrapResponse(response.data)
    return {
      data: resultData,
      message:
        response.data?.message ||
        'Đã hoàn tất quét và xử lý hết hạn các đơn đặt lịch quá hạn',
      isMock: false,
    }
  } catch (error) {
    if (isDevFallbackNeeded(error)) {
      const nowMs = Date.now()
      const nowIso = new Date(nowMs).toISOString()
      let providerExpiredCount = 0
      let depositExpiredCount = 0

      sharedBookingsStore = sharedBookingsStore.map((booking) => {
        if (
          booking.status === BOOKING_STATUS.PENDING_PROVIDER &&
          booking.requestExpiresAt &&
          new Date(booking.requestExpiresAt).getTime() <= nowMs
        ) {
          providerExpiredCount += 1
          return {
            ...booking,
            version: Number(booking.version || 0) + 1,
            status: BOOKING_STATUS.EXPIRED,
            terminationKind: 'EXPIRE',
            terminationActorType: 'SYSTEM',
            terminationReasonCode: 'PROVIDER_RESPONSE_TIMEOUT',
            terminationReason:
              'Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)',
            terminatedAt: nowIso,
            refundPercent: 100,
          }
        }
        if (
          booking.status === BOOKING_STATUS.PENDING_DEPOSIT &&
          booking.depositDueAt &&
          new Date(booking.depositDueAt).getTime() <= nowMs
        ) {
          depositExpiredCount += 1
          return {
            ...booking,
            version: Number(booking.version || 0) + 1,
            status: BOOKING_STATUS.EXPIRED,
            terminationKind: 'EXPIRE',
            terminationActorType: 'SYSTEM',
            terminationReasonCode: 'DEPOSIT_TIMEOUT',
            terminationReason:
              'Quá thời hạn giữ chỗ chờ thanh toán cọc (15 phút hoặc sát giờ hẹn)',
            terminatedAt: nowIso,
            refundPercent: 100,
          }
        }
        return booking
      })

      return {
        data: {
          providerExpiredCount,
          depositExpiredCount,
          totalExpiredCount: providerExpiredCount + depositExpiredCount,
          totalErrors: 0,
        },
        message:
          'Đã hoàn tất quét và xử lý hết hạn các đơn đặt lịch quá hạn (Mô phỏng Dev Seed)',
        isMock: true,
      }
    }
    throw error
  }
}
