import { http } from '../../lib/http'
import { SERVICE_STATUS } from '../../constants/status'
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
 * Làm phẳng cây danh mục CategoryTreeResponse từ Backend (CategoryPublicController.tree)
 * để hiển thị rõ quan hệ Cha — Con trên thẻ <select>.
 */
const flattenCategoryTree = (treeNodes = [], parentPrefix = '') => {
  const result = []
  for (const node of treeNodes) {
    if (!node) continue
    const displayName = parentPrefix ? `${parentPrefix} › ${node.name}` : node.name
    result.push({
      id: node.id,
      name: displayName,
      rawName: node.name,
      slug: node.slug,
      iconName: node.iconName,
      isActive: true,
    })
    if (Array.isArray(node.children) && node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, displayName))
    }
  }
  return result
}

/**
 * Lấy danh sách danh mục đang hoạt động (UC30 - Cường phụ trách BE).
 * Endpoint Backend: GET /api/public/categories/tree (CategoryPublicController.tree)
 */
export const getActiveCategories = async () => {
  try {
    const response = await http.get('/public/categories/tree', {
      _skipRefresh: true,
    })
    const unwrapped = unwrapResponse(response.data)
    const rawTree = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped?.items || unwrapped?.content || []
    const flattened = flattenCategoryTree(rawTree)
    return {
      items:
        flattened.length > 0
          ? flattened
          : mockCategoriesStore.filter((cat) => cat.isActive !== false),
      isMock: flattened.length === 0,
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
 * Endpoint Backend: GET /api/provider/services?status=PUBLISHED&page=0&size=6
 * Nguồn BE: ProviderServiceController.list -> trả về Page<ServiceResponse>
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
    }
    const response = await http.get('/provider/services', {
      params: queryParams,
      _skipRefresh: true,
    })
    const unwrapped = unwrapResponse(response.data)
    let rawItems = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped?.items || unwrapped?.content || []

    if (keyword?.trim()) {
      const kw = keyword.trim().toLowerCase()
      rawItems = rawItems.filter(
        (s) =>
          s.title?.toLowerCase().includes(kw) ||
          s.categoryName?.toLowerCase().includes(kw)
      )
    }

    return {
      pageData: {
        items: rawItems,
        page: unwrapped?.page ?? unwrapped?.number ?? page,
        size: unwrapped?.size ?? size,
        totalElements: unwrapped?.totalElements ?? rawItems.length,
        totalPages: Math.max(1, unwrapped?.totalPages ?? 1),
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
 * Công khai gói dịch vụ của NCC (UC19).
 * Endpoint Backend: PATCH /api/provider/services/{id}/publish
 */
export const publishProviderService = async (id) => {
  try {
    const response = await http.patch(`/provider/services/${id}/publish`, null, {
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
            status: SERVICE_STATUS.PUBLISHED,
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

/**
 * Lưu trữ gói dịch vụ của NCC (UC19 - ẩn khỏi khách, giữ nguyên snapshot đơn cũ).
 * Endpoint Backend: PATCH /api/provider/services/{id}/archive
 */
export const archiveProviderService = async (id) => {
  try {
    const response = await http.patch(`/provider/services/${id}/archive`, null, {
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
            status: SERVICE_STATUS.ARCHIVED,
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

/**
 * Tạo gói dịch vụ mới cho NCC (UC19).
 * Endpoint Backend: POST /api/provider/services (CreateServiceRequest)
 * Lưu ý: Backend luôn tạo mới ở trạng thái DRAFT. Nếu người dùng chọn PUBLISHED trong form,
 * tự động gọi tiếp PATCH /api/provider/services/{id}/publish.
 */
export const createProviderService = async (payload) => {
  const category = mockCategoriesStore.find(
    (c) => c.id === Number(payload.categoryId)
  )
  const createBody = {
    categoryId: Number(payload.categoryId),
    title: payload.title.trim(),
    description: payload.description.trim(),
    basePriceVnd: Math.round(Number(payload.basePriceVnd)),
    durationMinutes: Math.round(Number(payload.durationMinutes)),
  }

  const normalizedImages = (payload.images || []).map((img, idx) => ({
    imageUrl: img.imageUrl.trim(),
    altText: img.altText?.trim() || '',
    sortOrder: Number(img.sortOrder ?? idx),
  }))

  try {
    const response = await http.post('/provider/services', createBody, {
      _skipRefresh: true,
    })
    let createdData = unwrapResponse(response.data)

    if (payload.status === SERVICE_STATUS.PUBLISHED && createdData?.id) {
      const pubRes = await publishProviderService(createdData.id)
      createdData = pubRes.data || createdData
    } else if (payload.status === SERVICE_STATUS.ARCHIVED && createdData?.id) {
      const arcRes = await archiveProviderService(createdData.id)
      createdData = arcRes.data || createdData
    }

    return {
      data: {
        ...createdData,
        images: createdData?.images || normalizedImages,
      },
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      const created = {
        id: Date.now(),
        providerId: 2001,
        ...createBody,
        status: payload.status || SERVICE_STATUS.DRAFT,
        images: normalizedImages,
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
 * Endpoint Backend: PUT /api/provider/services/{id} (UpdateServiceRequest)
 * Nếu trạng thái thay đổi sang PUBLISHED / ARCHIVED, kết hợp gọi PATCH /publish hoặc /archive.
 */
export const updateProviderService = async (id, payload, previousStatus) => {
  const category = mockCategoriesStore.find(
    (c) => c.id === Number(payload.categoryId)
  )
  const updateBody = {
    categoryId: Number(payload.categoryId),
    title: payload.title.trim(),
    description: payload.description.trim(),
    basePriceVnd: Math.round(Number(payload.basePriceVnd)),
    durationMinutes: Math.round(Number(payload.durationMinutes)),
  }

  const normalizedImages = (payload.images || []).map((img, idx) => ({
    id: img.id,
    imageUrl: img.imageUrl.trim(),
    altText: img.altText?.trim() || '',
    sortOrder: Number(img.sortOrder ?? idx),
  }))

  try {
    const response = await http.put(`/provider/services/${id}`, updateBody, {
      _skipRefresh: true,
    })
    let updatedData = unwrapResponse(response.data)

    const targetStatus = payload.status
    const currentStatus = previousStatus || updatedData?.status
    if (targetStatus && targetStatus !== currentStatus) {
      if (targetStatus === SERVICE_STATUS.PUBLISHED) {
        const pubRes = await publishProviderService(id)
        updatedData = pubRes.data || updatedData
      } else if (targetStatus === SERVICE_STATUS.ARCHIVED) {
        const arcRes = await archiveProviderService(id)
        updatedData = arcRes.data || updatedData
      }
    }

    return {
      data: {
        ...updatedData,
        images: updatedData?.images || normalizedImages,
      },
      isMock: false,
    }
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      let updatedItem = null
      mockServicesStore = mockServicesStore.map((item) => {
        if (item.id === id) {
          updatedItem = {
            ...item,
            ...updateBody,
            status: payload.status || item.status,
            images: normalizedImages,
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
