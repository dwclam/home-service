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

/**
 * Tạo yêu cầu hỗ trợ / khiếu nại mới (UC39).
 * Endpoint: POST /api/v1/customer/complaints
 */
export const createCustomerComplaint = async ({
  category,
  bookingId,
  subject,
  description,
}) => {
  const payload = {
    category,
    subject: subject.trim(),
    description: description.trim(),
    ...(bookingId ? { bookingId: Number(bookingId) } : {}),
  }
  const response = await http.post('/v1/customer/complaints', payload)
  return {
    data: unwrapResponse(response.data),
    message: response.data?.message || 'Đã gửi yêu cầu hỗ trợ thành công.',
  }
}

/**
 * Lấy danh sách yêu cầu hỗ trợ / khiếu nại của khách hàng (UC39).
 * Endpoint: GET /api/v1/customer/complaints
 */
export const getMyComplaints = async ({
  status = 'ALL',
  category = 'ALL',
  bookingId,
  page = 0,
  size = 10,
} = {}) => {
  const params = { page, size }
  if (status && status !== 'ALL') params.status = status
  if (category && category !== 'ALL') params.category = category
  if (bookingId) params.bookingId = bookingId

  const response = await http.get('/v1/customer/complaints', { params })
  const unwrapped = unwrapResponse(response.data)
  const items = Array.isArray(unwrapped)
    ? unwrapped
    : unwrapped?.items || unwrapped?.content || []

  return {
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
 * Xem chi tiết một yêu cầu hỗ trợ / khiếu nại của khách hàng (UC39).
 * Endpoint: GET /api/v1/customer/complaints/{id}
 */
export const getMyComplaintDetail = async (complaintId) => {
  const response = await http.get(`/v1/customer/complaints/${complaintId}`)
  return unwrapResponse(response.data)
}

/**
 * Lấy lịch sử tin nhắn hỗ trợ theo complaintId (UC39).
 * Endpoint: GET /api/v1/customer/complaints/{id}/messages
 */
export const getMyComplaintMessages = async (
  complaintId,
  { beforeId, afterId, limit = 30 } = {}
) => {
  const params = {}
  if (beforeId) params.beforeId = beforeId
  if (afterId) params.afterId = afterId
  if (limit) params.limit = limit

  const response = await http.get(`/v1/customer/complaints/${complaintId}/messages`, {
    params,
  })
  return unwrapResponse(response.data)
}

/**
 * Gửi tin nhắn mới trong cuộc trò chuyện hỗ trợ (UC39).
 * Endpoint: POST /api/v1/customer/complaints/{id}/messages
 */
export const sendMyComplaintMessage = async (
  complaintId,
  { body, bookingId } = {}
) => {
  const payload = {
    body: body.trim(),
    ...(bookingId ? { bookingId: Number(bookingId) } : {}),
  }
  const response = await http.post(
    `/v1/customer/complaints/${complaintId}/messages`,
    payload
  )
  return unwrapResponse(response.data)
}
