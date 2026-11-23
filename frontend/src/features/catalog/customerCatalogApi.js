import { http } from '../../lib/http'
import {
  standardBookingServices,
  findServiceById,
  findProviderById,
  generateFallbackAvailableSlots,
} from '../booking/bookingCatalogData'

const FALLBACK_CATEGORY_TREE = [
  { id: 1, name: 'Điện lạnh', slug: 'dien-lanh', iconName: 'Zap', children: [] },
  { id: 2, name: 'Điện nước', slug: 'dien-nuoc', iconName: 'Droplets', children: [] },
  { id: 3, name: 'Vệ sinh nhà cửa', slug: 've-sinh-nha-cua', iconName: 'Sparkles', children: [] },
  { id: 4, name: 'Sửa chữa nhà', slug: 'sua-chua-nha', iconName: 'Hammer', children: [] },
  { id: 5, name: 'Chăm sóc thú cưng', slug: 'cham-soc-thu-cung', iconName: 'PawPrint', children: [] },
  { id: 6, name: 'Gia sư & Đào tạo', slug: 'gia-su-dao-tao', iconName: 'GraduationCap', children: [] },
]

/**
 * Lấy cây danh mục dịch vụ công khai.
 * Endpoint: GET /api/public/categories/tree
 */
export const getPublicCategoryTree = async () => {
  try {
    const response = await http.get('/public/categories/tree')
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data
    }
    return FALLBACK_CATEGORY_TREE
  } catch (error) {
    console.info('Fallback danh mục cây công khai:', error.message)
    return FALLBACK_CATEGORY_TREE
  }
}

/**
 * Tìm kiếm, lọc và sắp xếp dịch vụ (UC05).
 * Endpoint: GET /api/customer/services
 * @param {{
 *   keyword?: string,
 *   categoryId?: number|string,
 *   providerId?: number|string,
 *   city?: string,
 *   minPrice?: number|string,
 *   maxPrice?: number|string,
 *   sort?: 'NEWEST'|'PRICE_ASC'|'PRICE_DESC',
 *   page?: number,
 *   size?: number
 * }} params
 */
export const searchCustomerServices = async (params = {}) => {
  try {
    const response = await http.get('/customer/services', { params })
    if (response.data?.items && response.data.items.length > 0) {
      return response.data
    }
    // Nếu backend trả về mảng rỗng (DB chưa có dữ liệu NCC tạo), dùng Smart Fallback
    return getFallbackServiceSearch(params)
  } catch (error) {
    console.info('Sử dụng Smart Fallback tìm kiếm dịch vụ:', error.message)
    return getFallbackServiceSearch(params)
  }
}

/**
 * Xử lý lọc và sắp xếp client-side trên bộ dữ liệu fallback
 */
const getFallbackServiceSearch = (params = {}) => {
  const {
    keyword = '',
    categoryId,
    providerId,
    city = '',
    minPrice,
    maxPrice,
    sort = 'NEWEST',
    page = 0,
    size = 9,
  } = params

  let list = [...standardBookingServices]

  // Lọc theo từ khóa
  if (keyword && keyword.trim()) {
    const q = keyword.trim().toLowerCase()
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q) ||
        s.providerName.toLowerCase().includes(q)
    )
  }

  // Lọc theo danh mục
  if (categoryId) {
    const catIdNum = Number(categoryId)
    list = list.filter((s) => s.categoryId === catIdNum)
  }

  // Lọc theo Nhà cung cấp
  if (providerId) {
    const provIdNum = Number(providerId)
    list = list.filter((s) => s.providerId === provIdNum)
  }

  // Lọc theo khu vực / thành phố
  if (city && city.trim() && city !== 'ALL') {
    const c = city.trim().toLowerCase()
    list = list.filter(
      (s) => s.providerCity && s.providerCity.toLowerCase().includes(c)
    )
  }

  // Lọc theo khoảng giá
  if (minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice))) {
    list = list.filter((s) => s.basePriceVnd >= Number(minPrice))
  }
  if (maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice))) {
    list = list.filter((s) => s.basePriceVnd <= Number(maxPrice))
  }

  // Sắp xếp
  if (sort === 'PRICE_ASC') {
    list.sort((a, b) => a.basePriceVnd - b.basePriceVnd)
  } else if (sort === 'PRICE_DESC') {
    list.sort((a, b) => b.basePriceVnd - a.basePriceVnd)
  } else {
    // NEWEST
    list.sort((a, b) => (b.id || b.serviceId) - (a.id || a.serviceId))
  }

  const pageNum = Number(page) || 0
  const sizeNum = Number(size) || 9
  const totalElements = list.length
  const totalPages = Math.ceil(totalElements / sizeNum) || 1
  const items = list.slice(pageNum * sizeNum, (pageNum + 1) * sizeNum)

  return {
    items,
    page: pageNum,
    size: sizeNum,
    totalElements,
    totalPages,
    isFallbackData: true,
  }
}

/**
 * Xem chi tiết một dịch vụ (UC06).
 * Endpoint: GET /api/customer/services/{id}
 * @param {number|string} serviceId
 */
export const getCustomerServiceDetail = async (serviceId) => {
  try {
    const response = await http.get(`/customer/services/${serviceId}`)
    if (response.data) {
      return response.data
    }
    return getFallbackServiceDetail(serviceId)
  } catch (error) {
    console.info('Sử dụng Smart Fallback chi tiết dịch vụ:', error.message)
    return getFallbackServiceDetail(serviceId)
  }
}

const getFallbackServiceDetail = (serviceId) => {
  const s = findServiceById(serviceId)
  return {
    id: s.serviceId || s.id,
    title: s.title,
    description: s.description,
    basePriceVnd: s.basePriceVnd,
    durationMinutes: s.durationMinutes,
    categoryId: s.categoryId,
    categoryName: s.categoryName,
    images: s.images || [{ id: 1, imageUrl: s.image, cover: true, sortOrder: 0 }],
    providerId: s.providerId,
    providerName: s.providerName,
    providerCity: s.providerCity,
    providerBio: s.providerBio,
    providerLogoUrl: s.providerLogoUrl,
    isFallbackData: true,
  }
}

/**
 * Xem lịch rảnh và giá của dịch vụ (UC38).
 * Endpoint: GET /api/v1/customer/services/{serviceId}/available-slots
 * @param {number|string} serviceId
 * @param {{ from?: string, to?: string }} params
 */
export const getCustomerServiceAvailableSlots = async (serviceId, params = {}) => {
  try {
    const response = await http.get(
      `/v1/customer/services/${serviceId}/available-slots`,
      { params }
    )
    const slotData = response.data?.data || response.data
    if (slotData && Array.isArray(slotData.availableSlots) && slotData.availableSlots.length > 0) {
      return slotData
    }
    return generateFallbackAvailableSlots(serviceId)
  } catch (error) {
    console.info('Sử dụng Smart Fallback lịch rảnh dịch vụ UC38:', error.message)
    return generateFallbackAvailableSlots(serviceId)
  }
}

/**
 * Xem hồ sơ công khai của Nhà cung cấp (UC07).
 * Endpoint: GET /api/customer/providers/{id}
 * @param {number|string} providerId
 */
export const getPublicProviderProfile = async (providerId) => {
  try {
    const response = await http.get(`/customer/providers/${providerId}`)
    if (response.data) {
      return response.data
    }
    return findProviderById(providerId)
  } catch (error) {
    console.info('Sử dụng Smart Fallback hồ sơ nhà cung cấp UC07:', error.message)
    return findProviderById(providerId)
  }
}
