import { http } from '../../lib/http'
import {
  MOCK_PROVIDER_PROFILE,
  MOCK_PROVIDER_AVAILABILITY,
} from '../../mocks/provider'

// Bộ nhớ tạm phía client khi chạy chế độ Dev Seed hoặc chưa bật server BE
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

const normalizeProfileResponse = (raw) => {
  if (!raw) return null
  const isVisibleVal = Boolean(raw.visible ?? raw.isVisible ?? true)
  return {
    ...raw,
    visible: isVisibleVal,
    isVisible: isVisibleVal,
  }
}

const isEndpointUnavailable = (error) => {
  const status = error?.response?.status
  return (
    !error?.response || status === 404 || status === 401 || status === 403 || status === 502
  )
}

/**
 * Lấy hồ sơ của Nhà cung cấp đang đăng nhập (UC18 - Cường phụ trách BE).
 * Endpoint Backend: GET /api/provider/profile (ProviderProfileController.getMine)
 */
export const getMyProviderProfile = async () => {
  try {
    const response = await http.get('/provider/profile', {
      _skipRefresh: true,
    })
    return {
      data: normalizeProfileResponse(unwrapResponse(response.data)),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      return {
        data: normalizeProfileResponse({ ...mockProfileStore }),
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Cập nhật 5 trường thông tin công khai được phép của Nhà cung cấp (UC18).
 * Endpoint Backend: PUT /api/provider/profile (ProviderProfileController.updateMine)
 * DTO: UpdateProviderProfileRequest { businessName, bio, city, address, logoUrl }
 */
export const updateMyProviderProfile = async (payload) => {
  const cleanPayload = {
    businessName: payload.businessName.trim(),
    city: payload.city.trim(),
    address: payload.address?.trim() || '',
    bio: payload.bio?.trim() || '',
    logoUrl: payload.logoUrl?.trim() || '',
  }

  try {
    const response = await http.put('/provider/profile', cleanPayload, {
      _skipRefresh: true,
    })
    return {
      data: normalizeProfileResponse(unwrapResponse(response.data)),
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
        data: normalizeProfileResponse({ ...mockProfileStore }),
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
 * Tự động gộp các slot cùng state tiếp giáp hoặc giao nhau theo quy tắc BR-UC20-05 (Auto-Merge).
 */
const normalizeAndAutoMergeSlots = (slotsList) => {
  const sorted = [...slotsList].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  )
  const merged = []
  for (const slot of sorted) {
    if (merged.length === 0) {
      merged.push({ ...slot })
      continue
    }
    const prev = merged[merged.length - 1]
    const prevEnd = new Date(prev.endsAt).getTime()
    const currStart = new Date(slot.startsAt).getTime()
    const currEnd = new Date(slot.endsAt).getTime()

    if (prev.state === slot.state && currStart <= prevEnd) {
      prev.endsAt = new Date(Math.max(prevEnd, currEnd)).toISOString()
      prev.updatedAt = new Date().toISOString()
    } else {
      merged.push({ ...slot })
    }
  }
  return merged
}

/**
 * Lấy danh sách các khoảng lịch rảnh / khóa lịch của NCC (UC20 - Thuỷ phụ trách BE).
 * Endpoint Backend: GET /api/v1/provider/availability?from=...&to=...
 */
export const getMyAvailabilityList = async ({
  from,
  to,
  state = 'ALL',
} = {}) => {
  try {
    const queryParams = {}
    if (from) queryParams.from = from
    if (to) queryParams.to = to

    const response = await http.get('/v1/provider/availability', {
      params: queryParams,
      _skipRefresh: true,
    })
    const unwrapped = unwrapResponse(response.data)
    let items = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped?.items || unwrapped?.content || []

    if (state && state !== 'ALL') {
      items = items.filter((item) => item.state === state)
    }

    return {
      items,
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      let filtered = [...mockAvailabilityStore].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
      if (from) {
        const fromMs = new Date(from).getTime()
        filtered = filtered.filter(
          (item) => new Date(item.endsAt).getTime() > fromMs
        )
      }
      if (to) {
        const toMs = new Date(to).getTime()
        filtered = filtered.filter(
          (item) => new Date(item.startsAt).getTime() < toMs
        )
      }
      if (state && state !== 'ALL') {
        filtered = filtered.filter((item) => item.state === state)
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
 * Endpoint Backend: POST /api/v1/provider/availability
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
      if (new Date(endsAt).getTime() <= Date.now()) {
        const pastErr = new Error(
          'Thời gian kết thúc phải lớn hơn thời gian bắt đầu và ở tương lai.'
        )
        pastErr.code = 'BUSINESS_ERROR'
        throw pastErr
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
      mockAvailabilityStore = normalizeAndAutoMergeSlots([
        ...mockAvailabilityStore,
        newSlot,
      ])
      return {
        data: newSlot,
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Mở lịch hàng loạt cho Nhà cung cấp (UC20 - Batch Availability).
 * Endpoint Backend: POST /api/v1/provider/availability/batch
 * Body: { slots: [{ startsAt, endsAt, state }, ...] }
 */
export const createBatchAvailabilitySlots = async (slots) => {
  const body = { slots }
  try {
    const response = await http.post('/v1/provider/availability/batch', body, {
      _skipRefresh: true,
    })
    return {
      data: unwrapResponse(response.data),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      const createdSlots = slots.map((item, idx) => ({
        id: Date.now() + idx,
        providerId: mockProfileStore.accountId,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        state: item.state || 'AVAILABLE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      mockAvailabilityStore = normalizeAndAutoMergeSlots([
        ...mockAvailabilityStore,
        ...createdSlots,
      ])
      return {
        data: createdSlots,
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Cập nhật khoảng lịch rảnh / khóa lịch (UC20).
 * Endpoint Backend: PUT /api/v1/provider/availability/{id}
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
      let updatedSlot = null
      const nextList = mockAvailabilityStore.map((slot) => {
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
      mockAvailabilityStore = normalizeAndAutoMergeSlots(nextList)
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
 * Endpoint Backend: DELETE /api/v1/provider/availability/{id}
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
