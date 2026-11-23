import { http } from '../../lib/http'

/**
 * Lấy toàn bộ danh mục dịch vụ trong trang quản trị Admin (UC30).
 * Endpoint: GET /api/admin/categories
 */
export const getAdminCategories = async () => {
  const response = await http.get('/admin/categories')
  return Array.isArray(response.data) ? response.data : []
}

/**
 * Tạo mới danh mục dịch vụ (UC30).
 * Endpoint: POST /api/admin/categories
 */
export const createAdminCategory = async (payload) => {
  const cleanPayload = {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    description: payload.description?.trim() || null,
    iconName: payload.iconName?.trim() || 'Zap',
    sortOrder: Number(payload.sortOrder) || 0,
    parentId: payload.parentId ? Number(payload.parentId) : null,
  }

  const response = await http.post('/admin/categories', cleanPayload)
  return response.data
}

/**
 * Cập nhật thông tin danh mục dịch vụ (UC30).
 * Endpoint: PUT /api/admin/categories/{id}
 */
export const updateAdminCategory = async (id, payload) => {
  const cleanPayload = {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    description: payload.description?.trim() || null,
    iconName: payload.iconName?.trim() || 'Zap',
    sortOrder: Number(payload.sortOrder) || 0,
    parentId: payload.parentId ? Number(payload.parentId) : null,
  }

  const response = await http.put(`/admin/categories/${id}`, cleanPayload)
  return response.data
}

/**
 * Bật hoặc tắt trạng thái hoạt động của danh mục (UC30).
 * Endpoint: PATCH /api/admin/categories/{id}/active?value={true|false}
 */
export const toggleAdminCategoryActive = async (id, active) => {
  const response = await http.patch(
    `/admin/categories/${id}/active`,
    null,
    { params: { value: active } }
  )
  return response.data
}
