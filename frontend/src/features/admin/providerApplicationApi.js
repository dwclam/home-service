import { http } from '../../lib/http'

/**
 * Lấy danh sách hồ sơ đăng ký Nhà cung cấp cho Quản trị viên.
 * GET /api/admin/provider-applications?status=...&page=...&size=...
 */
export const getProviderApplications = async ({
  status = 'PENDING_REVIEW',
  page = 0,
  size = 10,
} = {}) => {
  const response = await http.get('/admin/provider-applications', {
    params: { status, page, size },
  })
  return response.data
}

/**
 * Xem chi tiết hồ sơ đăng ký Nhà cung cấp.
 * GET /api/admin/provider-applications/{id}
 */
export const getProviderApplicationDetail = async (id) => {
  const response = await http.get(`/admin/provider-applications/${id}`)
  return response.data
}

/**
 * Phê duyệt hồ sơ đăng ký Nhà cung cấp.
 * POST /api/admin/provider-applications/{id}/approve (không gửi body)
 */
export const approveProviderApplication = async (id) => {
  const response = await http.post(`/admin/provider-applications/${id}/approve`)
  return response.data
}

/**
 * Từ chối hồ sơ đăng ký Nhà cung cấp kèm lý do bắt buộc.
 * POST /api/admin/provider-applications/{id}/reject
 */
export const rejectProviderApplication = async (id, reason) => {
  const response = await http.post(`/admin/provider-applications/${id}/reject`, {
    reason: reason.trim(),
  })
  return response.data
}

/**
 * Cấp lại mật khẩu tạm khi email thông báo lần đầu gửi thất bại hoặc chưa xác nhận.
 * POST /api/admin/provider-applications/{id}/reissue-credentials
 */
export const reissueProviderCredentials = async (id) => {
  const response = await http.post(
    `/admin/provider-applications/${id}/reissue-credentials`
  )
  return response.data
}
