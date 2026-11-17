import { http } from '../../lib/http'

const BOOKINGS_STORAGE_KEY = 'nestify_recent_bookings'

// Helper đọc danh sách booking đã lưu trong sessionStorage
const getStoredBookings = () => {
  try {
    const raw = sessionStorage.getItem(BOOKINGS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.warn('Lỗi đọc recent bookings từ sessionStorage:', err)
    return []
  }
}

// Helper lưu booking vào sessionStorage
const saveStoredBooking = (booking) => {
  try {
    const list = getStoredBookings()
    const index = list.findIndex((b) => String(b.id) === String(booking.id))
    let updatedList
    if (index >= 0) {
      updatedList = [...list]
      updatedList[index] = booking
    } else {
      updatedList = [booking, ...list]
    }
    sessionStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updatedList))
  } catch (err) {
    console.warn('Lỗi lưu booking vào sessionStorage:', err)
  }
}

/**
 * Tạo yêu cầu đặt lịch dịch vụ mới qua API thật của backend (UC08).
 * Endpoint: POST /api/v1/customer/bookings
 * Response: StandardResponse<BookingDetailResponse>
 */
export const createBooking = async (payload) => {
  const response = await http.post('/v1/customer/bookings', payload)
  // Backend bọc trong StandardResponse { success, message, data, timestamp }
  const bookingData = response.data?.data || response.data
  saveStoredBooking(bookingData)
  return bookingData
}

/**
 * Tạo đơn đặt lịch mô phỏng (Chế độ Demo Fallback)
 * Dùng khi database local chưa có lịch thợ / bản ghi dịch vụ để TLam thuyết trình luồng đầy đủ.
 */
export const createMockBooking = (formValues, service) => {
  const now = new Date()
  const appointmentStart = new Date(`${formValues.bookingDate}T${formValues.bookingTime}:00`)
  const duration = service.durationMinutes || 90
  const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60 * 1000)

  // Hết hạn phản hồi sau 30 phút tính từ thời điểm đặt
  const requestExpiresAt = new Date(now.getTime() + 30 * 60 * 1000)

  const totalAmount = service.basePriceVnd || 350000
  const depositPercent = 30
  const depositAmount = Math.round((totalAmount * depositPercent) / 100)
  const balanceAmount = totalAmount - depositAmount

  const mockId = Date.now()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  const bookingCode = `BK-${dateStr}-${randomSuffix}`

  const mockBooking = {
    id: mockId,
    version: 0,
    bookingCode,
    customerId: 1,
    providerId: service.providerId || 2,
    providerName: service.providerName || 'Điện Lạnh Bách Khoa',
    serviceId: service.serviceId || 1,
    serviceTitle: service.title || 'Dịch vụ tại nhà',
    durationMinutes: duration,
    startsAt: appointmentStart.toISOString(),
    endsAt: appointmentEnd.toISOString(),
    status: 'PENDING_PROVIDER',
    requestExpiresAt: requestExpiresAt.toISOString(),
    totalAmountVnd: totalAmount,
    depositPercent,
    depositAmountVnd: depositAmount,
    balanceAmountVnd: balanceAmount,
    recipientName: formValues.recipientName,
    recipientPhone: formValues.recipientPhone,
    addressLine: formValues.addressLine,
    ward: formValues.ward || '',
    city: formValues.city,
    addressInstructions: formValues.addressInstructions || '',
    customerNote: formValues.customerNote || '',
    createdAt: now.toISOString(),
  }

  saveStoredBooking(mockBooking)
  return mockBooking
}

/**
 * Lấy chi tiết đơn đặt lịch theo bookingId.
 * Endpoint: GET /api/v1/customer/bookings/{bookingId}
 * Fallback: Đọc từ sessionStorage nếu server trả về 404 hoặc mạng lỗi.
 */
export const getBookingDetail = async (bookingId) => {
  try {
    const response = await http.get(`/v1/customer/bookings/${bookingId}`)
    const booking = response.data?.data || response.data
    saveStoredBooking(booking)
    return booking
  } catch (error) {
    console.info('Không tìm thấy trên server, tìm trong sessionStorage fallback:', error.message)
    const list = getStoredBookings()
    const found = list.find((b) => String(b.id) === String(bookingId))
    if (found) return found
    throw error
  }
}

/**
 * Khách hàng hủy đơn đặt lịch (UC11).
 * Endpoint: POST /api/v1/customer/bookings/{bookingId}/cancel
 * Body: { version: number, reason?: string }
 */
export const cancelBooking = async (bookingId, { version, reason }) => {
  try {
    const response = await http.post(`/v1/customer/bookings/${bookingId}/cancel`, {
      version,
      reason: reason?.trim() || undefined,
    })
    const updated = response.data?.data || response.data
    saveStoredBooking(updated)
    return updated
  } catch (error) {
    console.info('Lỗi hủy đơn qua API thật, cập nhật trạng thái fallback:', error.message)
    const list = getStoredBookings()
    const found = list.find((b) => String(b.id) === String(bookingId))
    if (found) {
      const cancelledBooking = {
        ...found,
        status: 'CANCELLED',
        version: (found.version ?? 0) + 1,
        cancelReason: reason || 'Khách hàng hủy đơn',
      }
      saveStoredBooking(cancelledBooking)
      return cancelledBooking
    }
    throw error
  }
}
