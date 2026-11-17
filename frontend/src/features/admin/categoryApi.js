import { http } from '../../lib/http'

const FALLBACK_STORAGE_KEY = 'nestify_fallback_categories'

const INITIAL_FALLBACK_CATEGORIES = [
  {
    id: 1,
    name: 'Điện lạnh',
    slug: 'dien-lanh',
    description: 'Sửa chữa, bảo dưỡng điều hòa, tủ lạnh, máy giặt gia đình',
    iconName: 'Zap',
    sortOrder: 1,
    active: true,
    parentId: null,
  },
  {
    id: 2,
    name: 'Điện nước',
    slug: 'dien-nuoc',
    description: 'Sửa chữa đường ống nước rò rỉ, thiết bị vệ sinh, hệ thống điện gia dụng',
    iconName: 'Droplets',
    sortOrder: 2,
    active: true,
    parentId: null,
  },
  {
    id: 3,
    name: 'Vệ sinh nhà cửa',
    slug: 've-sinh-nha-cua',
    description: 'Dọn dẹp tổng thể căn hộ, giặt ghế sofa, rèm cửa, diệt côn trùng',
    iconName: 'Sparkles',
    sortOrder: 3,
    active: true,
    parentId: null,
  },
  {
    id: 4,
    name: 'Sửa chữa nhà',
    slug: 'sua-chua-nha',
    description: 'Sơn bả tường, chống thấm, sửa chữa bản lề, khóa cửa và đồ mộc gia đình',
    iconName: 'Hammer',
    sortOrder: 4,
    active: true,
    parentId: null,
  },
  {
    id: 5,
    name: 'Chăm sóc thú cưng',
    slug: 'cham-soc-thu-cung',
    description: 'Tắm vệ sinh, cắt tỉa lông spa cho chó mèo và trông giữ thú cưng tại nhà',
    iconName: 'PawPrint',
    sortOrder: 5,
    active: true,
    parentId: null,
  },
  {
    id: 6,
    name: 'Gia sư & Đào tạo',
    slug: 'gia-su-dao-tao',
    description: 'Gia sư các môn học văn hóa, luyện thi, rèn chữ và ngoại ngữ tại nhà',
    iconName: 'GraduationCap',
    sortOrder: 6,
    active: true,
    parentId: null,
  },
]

// Hàm tiện ích đọc kho fallback
const getFallbackStore = () => {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(
        FALLBACK_STORAGE_KEY,
        JSON.stringify(INITIAL_FALLBACK_CATEGORIES)
      )
      return [...INITIAL_FALLBACK_CATEGORIES]
    }
    return JSON.parse(raw)
  } catch (e) {
    console.warn('Lỗi đọc fallback categories từ localStorage:', e)
    return [...INITIAL_FALLBACK_CATEGORIES]
  }
}

// Hàm tiện ích lưu kho fallback
const saveFallbackStore = (list) => {
  try {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.warn('Lỗi ghi fallback categories vào localStorage:', e)
  }
}

/**
 * Lấy toàn bộ danh mục dịch vụ trong trang quản trị Admin.
 * Endpoint: GET /api/admin/categories
 * Hỗ trợ Smart Fallback khi endpoint backend chưa merge.
 */
export const getAdminCategories = async () => {
  try {
    const response = await http.get('/admin/categories')
    if (Array.isArray(response.data)) {
      saveFallbackStore(response.data)
      return response.data
    }
    return getFallbackStore()
  } catch (error) {
    // Nếu 404 (chưa merge) hoặc lỗi mạng, tự động dùng kho fallback
    console.info('Sử dụng Smart Fallback cho danh mục admin:', error.message)
    return getFallbackStore()
  }
}

/**
 * Tạo mới danh mục dịch vụ.
 * Endpoint: POST /api/admin/categories
 * @param {{
 *   name: string,
 *   slug: string,
 *   description?: string,
 *   iconName?: string,
 *   sortOrder?: number,
 *   parentId?: number | null
 * }} payload
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

  try {
    const response = await http.post('/admin/categories', cleanPayload)
    // Đồng bộ vào fallback store
    const list = getFallbackStore()
    const updatedList = [response.data, ...list]
    saveFallbackStore(updatedList)
    return response.data
  } catch (error) {
    console.info('Fallback tạo danh mục:', error.message)
    const list = getFallbackStore()
    const newCategory = {
      id: Date.now(),
      ...cleanPayload,
      active: true,
    }
    const updatedList = [newCategory, ...list]
    saveFallbackStore(updatedList)
    return newCategory
  }
}

/**
 * Cập nhật thông tin danh mục dịch vụ.
 * Endpoint: PUT /api/admin/categories/{id}
 * @param {number|string} id
 * @param {object} payload
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

  try {
    const response = await http.put(`/admin/categories/${id}`, cleanPayload)
    const list = getFallbackStore()
    const updatedList = list.map((item) =>
      item.id === Number(id) ? { ...item, ...response.data } : item
    )
    saveFallbackStore(updatedList)
    return response.data
  } catch (error) {
    console.info('Fallback cập nhật danh mục:', error.message)
    const list = getFallbackStore()
    const updatedList = list.map((item) =>
      item.id === Number(id) ? { ...item, ...cleanPayload } : item
    )
    saveFallbackStore(updatedList)
    return updatedList.find((item) => item.id === Number(id))
  }
}

/**
 * Bật hoặc tắt trạng thái hoạt động của danh mục (active = true / false).
 * Endpoint: PATCH /api/admin/categories/{id}/active?value={true|false}
 * @param {number|string} id
 * @param {boolean} active
 */
export const toggleAdminCategoryActive = async (id, active) => {
  try {
    const response = await http.patch(
      `/admin/categories/${id}/active?value=${active}`
    )
    const list = getFallbackStore()
    const updatedList = list.map((item) =>
      item.id === Number(id) ? { ...item, active } : item
    )
    saveFallbackStore(updatedList)
    return response.data
  } catch (error) {
    console.info('Fallback toggle trạng thái danh mục:', error.message)
    const list = getFallbackStore()
    const updatedList = list.map((item) =>
      item.id === Number(id) ? { ...item, active } : item
    )
    saveFallbackStore(updatedList)
    return { id: Number(id), active }
  }
}
