import { http } from '../../lib/http'

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

/* ============================================================================
 * ĐĂNG KÝ & XÁC THỰC HỒ SƠ NHÀ CUNG CẤP (UC16 / UC36)
 * ========================================================================== */

export const submitProviderApplication = async (data) => {
  const body = {
    email: data.email.trim(),
    applicantName: data.applicantName.trim(),
    phone: data.phone.trim(),
    businessName: data.businessName.trim(),
    city: data.city.trim(),
    description: data.description.trim(),
    documentUrl: data.documentUrl.trim(),
  }

  const response = await http.post('/provider-applications', body)
  return response.data
}

export const verifyProviderEmail = async ({ email, code, registrationToken }) => {
  const body = {
    email: email.trim(),
    code: code.trim(),
    registrationToken,
  }

  const response = await http.post('/provider-applications/verify-email', body)
  return response.data
}

export const resendProviderVerification = async ({ email, registrationToken }) => {
  const body = {
    email: email.trim(),
    registrationToken,
  }

  const response = await http.post('/provider-applications/resend-verification', body)
  return response.data
}

/* ============================================================================
 * QUẢN LÝ HỒ SƠ CÔNG KHAI NHÀ CUNG CẤP (UC18)
 * ========================================================================== */

export const getMyProviderProfile = async () => {
  const response = await http.get('/provider/profile')
  return {
    data: normalizeProfileResponse(unwrapResponse(response.data)),
    isMock: false,
  }
}

export const updateMyProviderProfile = async (payload) => {
  const cleanPayload = {
    businessName: payload.businessName.trim(),
    city: payload.city.trim(),
    address: payload.address?.trim() || '',
    bio: payload.bio?.trim() || '',
    logoUrl: payload.logoUrl?.trim() || '',
  }

  const response = await http.put('/provider/profile', cleanPayload)
  return {
    data: normalizeProfileResponse(unwrapResponse(response.data)),
    isMock: false,
  }
}

/* ============================================================================
 * QUẢN LÝ LỊCH RẢNH / KHÓA LỊCH NHÀ CUNG CẤP (UC20)
 * ========================================================================== */

export const isIntervalOverlapping = (startIsoA, endIsoA, startIsoB, endIsoB) => {
  const aStart = new Date(startIsoA).getTime()
  const aEnd = new Date(endIsoA).getTime()
  const bStart = new Date(startIsoB).getTime()
  const bEnd = new Date(endIsoB).getTime()
  return aStart < bEnd && bStart < aEnd
}

export const getMyAvailabilityList = async ({
  from,
  to,
  state = 'ALL',
} = {}) => {
  const queryParams = {}
  if (from) queryParams.from = from
  if (to) queryParams.to = to

  const response = await http.get('/v1/provider/availability', {
    params: queryParams,
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
}

export const createAvailabilitySlot = async ({ startsAt, endsAt, state }) => {
  const response = await http.post('/v1/provider/availability', {
    startsAt,
    endsAt,
    state,
  })
  return {
    data: unwrapResponse(response.data),
    isMock: false,
  }
}

export const createBatchAvailabilitySlots = async (slots) => {
  const response = await http.post('/v1/provider/availability/batch', { slots })
  return {
    data: unwrapResponse(response.data),
    isMock: false,
  }
}

export const updateAvailabilitySlot = async (id, { startsAt, endsAt, state }) => {
  const response = await http.put(`/v1/provider/availability/${id}`, {
    startsAt,
    endsAt,
    state,
  })
  return {
    data: unwrapResponse(response.data),
    isMock: false,
  }
}

export const deleteAvailabilitySlot = async (id) => {
  await http.delete(`/v1/provider/availability/${id}`)
  return { isMock: false }
}
