import { http } from '../../lib/http'
import {
  MOCK_PROVIDER_PROFILE,
  MOCK_PROVIDER_AVAILABILITY,
} from '../../mocks/provider'

// Bộ nhớ tạm phía client khi API của Cường (UC18) và Thuỷ (UC20) chưa sẵn sàng trên môi trường dev
let mockProfileStore = { ...MOCK_PROVIDER_PROFILE }
let mockAvailabilityStore = [...MOCK_PROVIDER_AVAILABILITY]

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

const isEndpointUnavailable = (error) => {
  const status = error?.response?.status
  return (
    !error?.response || status === 404 || status === 401 || status === 403 || status === 502
  )
}

/**
 * Lấy hồ sơ của Nhà cung cấp đang đăng nhập (UC18 - Cường phụ trách BE).
 * Endpoint hợp đồng: GET /api/v1/provider/profile
 */
export const getMyProviderProfile = async () => {
  try {
    const response = await http.get('/v1/provider/profile', {
      _skipRefresh: true,
    })
    return {
      data: unwrapResponse(response.data),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      return {
        data: { ...mockProfileStore },
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Cập nhật các trường thông tin công khai được phép của Nhà cung cấp (UC18).
 * Endpoint hợp đồng: PUT /api/v1/provider/profile
 */
export const updateMyProviderProfile = async (payload) => {
  const cleanPayload = {
    businessName: payload.businessName.trim(),
    city: payload.city.trim(),
    address: payload.address?.trim() || '',
    bio: payload.bio?.trim() || '',
    logoUrl: payload.logoUrl?.trim() || '',
    isVisible: Boolean(payload.isVisible),
  }

  try {
    const response = await http.put('/v1/provider/profile', cleanPayload, {
      _skipRefresh: true,
    })
    return {
      data: unwrapResponse(response.data),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      mockProfileStore = {
        ...mockProfileStore,
        ...cleanPayload,
        updatedAt: new Date().toISOString(),
      }
      return {
        data: { ...mockProfileStore },
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Kiểm tra hai khoảng nửa mở [startA, endA) và [startB, endB) có giao nhau hay không.
 * Quy tắc UC20: khoảng kết thúc lúc 10:00 KHÔNG xung đột khoảng bắt đầu lúc 10:00.
 */
export const isIntervalOverlapping = (startIsoA, endIsoA, startIsoB, endIsoB) => {
  const aStart = new Date(startIsoA).getTime()
  const aEnd = new Date(endIsoA).getTime()
  const bStart = new Date(startIsoB).getTime()
  const bEnd = new Date(endIsoB).getTime()
  return aStart < bEnd && bStart < aEnd
}

/**
 * Lấy danh sách các khoảng lịch rảnh / khóa lịch của NCC (UC20 - Thuỷ phụ trách BE).
 * Endpoint hợp đồng: GET /api/v1/provider/availability
 */
export const getMyAvailabilityList = async (params = {}) => {
  try {
    const response = await http.get('/v1/provider/availability', {
      params,
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
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      let filtered = [...mockAvailabilityStore].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
      if (params.state && params.state !== 'ALL') {
        filtered = filtered.filter((item) => item.state === params.state)
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
 * Tạo mới khoảng lịch AVAILABLE / BLOCKED (UC20).
 * Endpoint hợp đồng: POST /api/v1/provider/availability
 */
export const createAvailabilitySlot = async ({ startsAt, endsAt, state }) => {
  const body = { startsAt, endsAt, state }
  try {
    const response = await http.post('/v1/provider/availability', body, {
      _skipRefresh: true,
    })
    return {
      data: unwrapResponse(response.data),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      const conflict = mockAvailabilityStore.find((slot) =>
        isIntervalOverlapping(startsAt, endsAt, slot.startsAt, slot.endsAt)
      )
      if (conflict) {
        const conflictErr = new Error(
          'Khoảng thời gian này bị chồng lấn với một khung lịch đã khai báo trước đó.'
        )
        conflictErr.code = 'DATA_CONFLICT'
        throw conflictErr
      }

      const newSlot = {
        id: Date.now(),
        providerId: mockProfileStore.accountId,
        startsAt,
        endsAt,
        state,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockAvailabilityStore = [...mockAvailabilityStore, newSlot]
      return {
        data: newSlot,
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Cập nhật khoảng lịch rảnh / khóa lịch (UC20).
 * Endpoint hợp đồng: PUT /api/v1/provider/availability/{id}
 */
export const updateAvailabilitySlot = async (id, { startsAt, endsAt, state }) => {
  const body = { startsAt, endsAt, state }
  try {
    const response = await http.put(`/v1/provider/availability/${id}`, body, {
      _skipRefresh: true,
    })
    return {
      data: unwrapResponse(response.data),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      const conflict = mockAvailabilityStore.find(
        (slot) =>
          slot.id !== id &&
          isIntervalOverlapping(startsAt, endsAt, slot.startsAt, slot.endsAt)
      )
      if (conflict) {
        const conflictErr = new Error(
          'Khoảng thời gian cập nhật bị chồng lấn với khung lịch khác.'
        )
        conflictErr.code = 'DATA_CONFLICT'
        throw conflictErr
      }

      let updatedSlot = null
      mockAvailabilityStore = mockAvailabilityStore.map((slot) => {
        if (slot.id === id) {
          updatedSlot = {
            ...slot,
            startsAt,
            endsAt,
            state,
            updatedAt: new Date().toISOString(),
          }
          return updatedSlot
        }
        return slot
      })
      return {
        data: updatedSlot,
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Xóa khoảng lịch rảnh khi chưa có đơn giữ chỗ (UC20).
 * Endpoint hợp đồng: DELETE /api/v1/provider/availability/{id}
 */
export const deleteAvailabilitySlot = async (id) => {
  try {
    await http.delete(`/v1/provider/availability/${id}`, {
      _skipRefresh: true,
    })
    return { isMock: false }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      mockAvailabilityStore = mockAvailabilityStore.filter(
        (slot) => slot.id !== id
      )
      return { isMock: true }
    }
    throw error
  }
}
