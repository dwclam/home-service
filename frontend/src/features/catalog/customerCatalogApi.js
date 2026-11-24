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

const cleanParams = (raw = {}) => {
  const result = {}
  Object.entries(raw).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (typeof value === 'string' && value.trim() === '') return
    result[key] = value
  })
  return result
}

/**
 * Lấy cây danh mục dịch vụ công khai (UC30).
 * Endpoint: GET /api/public/categories/tree
 */
export const getPublicCategoryTree = async () => {
  const response = await http.get('/public/categories/tree')
  const unwrapped = unwrapResponse(response.data)
  return Array.isArray(unwrapped) ? unwrapped : []
}

/**
 * Tìm kiếm, lọc và sắp xếp dịch vụ (UC05).
 * Endpoint: GET /api/customer/services
 */
export const searchCustomerServices = async (params = {}) => {
  const response = await http.get('/customer/services', {
    params: cleanParams(params),
  })
  const data = unwrapResponse(response.data)
  const items = Array.isArray(data)
    ? data
    : data?.items || data?.content || []

  return {
    items,
    page: data?.page ?? data?.number ?? Number(params.page || 0),
    size: data?.size ?? Number(params.size || 9),
    totalElements: data?.totalElements ?? items.length,
    totalPages: Math.max(1, data?.totalPages ?? 1),
  }
}

/**
 * Xem chi tiết một dịch vụ (UC06).
 * Endpoint: GET /api/customer/services/{id}
 */
export const getCustomerServiceDetail = async (serviceId) => {
  const response = await http.get(`/customer/services/${serviceId}`)
  return unwrapResponse(response.data)
}

/**
 * Xem lịch rảnh và giá của dịch vụ (UC38).
 * Endpoint: GET /api/v1/customer/services/{serviceId}/available-slots
 */
export const getCustomerServiceAvailableSlots = async (serviceId, params = {}) => {
  const response = await http.get(
    `/v1/customer/services/${serviceId}/available-slots`,
    { params: cleanParams(params) }
  )
  return unwrapResponse(response.data)
}

/**
 * Xem hồ sơ công khai của Nhà cung cấp (UC07).
 * Endpoint: GET /api/customer/providers/{id}
 */
export const getPublicProviderProfile = async (providerId) => {
  const response = await http.get(`/customer/providers/${providerId}`)
  return unwrapResponse(response.data)
}
