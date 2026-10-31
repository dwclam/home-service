import { http } from '../../lib/http'
import { MOCK_CATEGORIES, MOCK_PROVIDER_SERVICES } from '../../mocks/services'

let mockServicesStore = [...MOCK_PROVIDER_SERVICES]
const mockCategoriesStore = [...MOCK_CATEGORIES]

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
 * Lấy danh sách danh mục đang hoạt động (UC30 - Cường phụ trách BE).
 * Endpoint hợp đồng: GET /api/v1/public/categories
 */
export const getActiveCategories = async () => {
  try {
    const response = await http.get('/v1/public/categories', {
      _skipRefresh: true,
    })
    const unwrapped = unwrapResponse(response.data)
    const items = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped?.items || unwrapped?.content || []
    return {
      items: items.filter((cat) => cat.isActive !== false),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      return {
        items: mockCategoriesStore.filter((cat) => cat.isActive !== false),
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Lấy danh sách gói dịch vụ của Nhà cung cấp có phân trang và lọc (UC19 - Cường phụ trách BE).
 * Endpoint hợp đồng: GET /api/v1/provider/services
 */
export const getMyServicesPage = async ({
  page = 0,
  size = 6,
  status = 'ALL',
  keyword = '',
} = {}) => {
  try {
    const queryParams = {
      page,
      size,
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
    }
    const response = await http.get('/v1/provider/services', {
      params: queryParams,
      _skipRefresh: true,
    })
    const unwrapped = unwrapResponse(response.data)
    if (Array.isArray(unwrapped)) {
      return {
        pageData: {
          items: unwrapped,
          page: 0,
          size: unwrapped.length || size,
          totalElements: unwrapped.length,
          totalPages: 1,
        },
        isMock: false,
      }
    }
    return {
      pageData: {
        items: unwrapped?.items || unwrapped?.content || [],
        page: unwrapped?.page ?? page,
        size: unwrapped?.size ?? size,
        totalElements: unwrapped?.totalElements ?? 0,
        totalPages: unwrapped?.totalPages ?? 1,
      },
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      let filtered = [...mockServicesStore].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )

      if (status && status !== 'ALL') {
        filtered = filtered.filter((s) => s.status === status)
      }

      if (keyword?.trim()) {
        const kw = keyword.trim().toLowerCase()
        filtered = filtered.filter(
          (s) =>
            s.title.toLowerCase().includes(kw) ||
            s.categoryName?.toLowerCase().includes(kw)
        )
      }

      const totalElements = filtered.length
      const totalPages = Math.max(1, Math.ceil(totalElements / size))
      const safePage = Math.min(page, totalPages - 1)
      const items = filtered.slice(safePage * size, (safePage + 1) * size)

      return {
        pageData: {
          items,
          page: safePage,
          size,
          totalElements,
          totalPages,
        },
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Tạo gói dịch vụ mới cho NCC (UC19).
 * Endpoint hợp đồng: POST /api/v1/provider/services
 */
export const createProviderService = async (payload) => {
  const category = mockCategoriesStore.find(
    (c) => c.id === Number(payload.categoryId)
  )
  const cleanBody = {
    title: payload.title.trim(),
    categoryId: Number(payload.categoryId),
    description: payload.description.trim(),
    basePriceVnd: Math.round(Number(payload.basePriceVnd)),
    durationMinutes: Math.round(Number(payload.durationMinutes)),
    status: payload.status,
    images: (payload.images || []).map((img, idx) => ({
      imageUrl: img.imageUrl.trim(),
      altText: img.altText?.trim() || '',
      sortOrder: Number(img.sortOrder ?? idx),
    })),
  }

  try {
    const response = await http.post('/v1/provider/services', cleanBody, {
      _skipRefresh: true,
    })
    return {
      data: unwrapResponse(response.data),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      const created = {
        id: Date.now(),
        providerId: 2001,
        ...cleanBody,
        categoryName: category?.name || 'Danh mục dịch vụ',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockServicesStore = [created, ...mockServicesStore]
      return {
        data: created,
        isMock: true,
      }
    }
    throw error
  }
}

/**
 * Cập nhật gói dịch vụ của NCC (UC19).
 * Lưu ý nghiệp vụ: sửa/lưu trữ dịch vụ không thay đổi các đơn cũ đã chụp snapshot.
 * Endpoint hợp đồng: PUT /api/v1/provider/services/{id}
 */
export const updateProviderService = async (id, payload) => {
  const category = mockCategoriesStore.find(
    (c) => c.id === Number(payload.categoryId)
  )
  const cleanBody = {
    title: payload.title.trim(),
    categoryId: Number(payload.categoryId),
    description: payload.description.trim(),
    basePriceVnd: Math.round(Number(payload.basePriceVnd)),
    durationMinutes: Math.round(Number(payload.durationMinutes)),
    status: payload.status,
    images: (payload.images || []).map((img, idx) => ({
      id: img.id,
      imageUrl: img.imageUrl.trim(),
      altText: img.altText?.trim() || '',
      sortOrder: Number(img.sortOrder ?? idx),
    })),
  }

  try {
    const response = await http.put(`/v1/provider/services/${id}`, cleanBody, {
      _skipRefresh: true,
    })
    return {
      data: unwrapResponse(response.data),
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      let updatedItem = null
      mockServicesStore = mockServicesStore.map((item) => {
        if (item.id === id) {
          updatedItem = {
            ...item,
            ...cleanBody,
            categoryName: category?.name || item.categoryName,
            updatedAt: new Date().toISOString(),
          }
          return updatedItem
        }
        return item
      })
      return {
        data: updatedItem,
        isMock: true,
      }
    }
    throw error
  }
}
