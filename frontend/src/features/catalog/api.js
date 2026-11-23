import { http } from '../../lib/http'
import { SERVICE_STATUS } from '../../constants/status'

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
 * Lấy danh sách danh mục đang hoạt động (UC30).
 * Endpoint: GET /api/public/categories/tree
 */
export const getActiveCategories = async () => {
  const response = await http.get('/public/categories/tree')
  const unwrapped = unwrapResponse(response.data)
  const rawTree = Array.isArray(unwrapped)
    ? unwrapped
    : unwrapped?.items || unwrapped?.content || []
  return {
    items: flattenCategoryTree(rawTree),
    isMock: false,
  }
}

/**
 * Lấy danh sách gói dịch vụ của Nhà cung cấp có phân trang và lọc (UC19).
 * Endpoint: GET /api/provider/services?status=PUBLISHED&page=0&size=6
 * Response: PageResponse<ServiceResponse> { items, page, size, totalElements, totalPages }
 */
export const getMyServicesPage = async ({
  page = 0,
  size = 6,
  status = 'ALL',
  keyword = '',
} = {}) => {
  const queryParams = {
    page,
    size,
    ...(status && status !== 'ALL' ? { status } : {}),
  }
  const response = await http.get('/provider/services', {
    params: queryParams,
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
}

/**
 * Tạo gói dịch vụ mới cho Nhà cung cấp (UC19).
 * Endpoint: POST /api/provider/services (+ PATCH /publish hoặc /archive nếu người dùng chọn)
 */
export const createProviderService = async (payload) => {
  const cleanImages = (payload.images || [])
    .filter((img) => img.imageUrl?.trim())
    .map((img, idx) => ({
      imageUrl: img.imageUrl.trim(),
      altText: img.altText?.trim() || payload.title.trim(),
      sortOrder: idx,
    }))

  const createBody = {
    categoryId: Number(payload.categoryId),
    title: payload.title.trim(),
    description: payload.description.trim(),
    basePriceVnd: Number(payload.basePriceVnd),
    durationMinutes: Number(payload.durationMinutes),
    images: cleanImages,
  }

  const response = await http.post('/provider/services', createBody)
  let created = unwrapResponse(response.data)

  if (created?.id && payload.status === SERVICE_STATUS.PUBLISHED) {
    const pubRes = await http.patch(`/provider/services/${created.id}/publish`)
    created = unwrapResponse(pubRes.data)
  } else if (created?.id && payload.status === SERVICE_STATUS.ARCHIVED) {
    const archRes = await http.patch(`/provider/services/${created.id}/archive`)
    created = unwrapResponse(archRes.data)
  }

  return { data: created, isMock: false }
}

/**
 * Cập nhật gói dịch vụ của Nhà cung cấp (UC19).
 * Endpoint: PUT /api/provider/services/{id} (+ PATCH publish/archive nếu đổi trạng thái)
 */
export const updateProviderService = async (serviceId, payload) => {
  const cleanImages = (payload.images || [])
    .filter((img) => img.imageUrl?.trim())
    .map((img, idx) => ({
      imageUrl: img.imageUrl.trim(),
      altText: img.altText?.trim() || payload.title.trim(),
      sortOrder: idx,
    }))

  const updateBody = {
    categoryId: Number(payload.categoryId),
    title: payload.title.trim(),
    description: payload.description.trim(),
    basePriceVnd: Number(payload.basePriceVnd),
    durationMinutes: Number(payload.durationMinutes),
    images: cleanImages,
  }

  const response = await http.put(`/provider/services/${serviceId}`, updateBody)
  let updated = unwrapResponse(response.data)

  if (
    payload.status === SERVICE_STATUS.PUBLISHED &&
    updated?.status !== SERVICE_STATUS.PUBLISHED
  ) {
    const pubRes = await http.patch(`/provider/services/${serviceId}/publish`)
    updated = unwrapResponse(pubRes.data)
  } else if (
    payload.status === SERVICE_STATUS.ARCHIVED &&
    updated?.status !== SERVICE_STATUS.ARCHIVED
  ) {
    const archRes = await http.patch(`/provider/services/${serviceId}/archive`)
    updated = unwrapResponse(archRes.data)
  }

  return { data: updated, isMock: false }
}

/**
 * Đổi trạng thái công khai / lưu trữ dịch vụ (UC19).
 */
export const updateProviderServiceStatus = async (serviceId, nextStatus) => {
  const actionPath =
    nextStatus === SERVICE_STATUS.PUBLISHED
      ? `/provider/services/${serviceId}/publish`
      : `/provider/services/${serviceId}/archive`

  const response = await http.patch(actionPath)
  return {
    data: unwrapResponse(response.data),
    isMock: false,
  }
}

export const publishProviderService = async (serviceId) => {
  return updateProviderServiceStatus(serviceId, SERVICE_STATUS.PUBLISHED)
}

export const archiveProviderService = async (serviceId) => {
  return updateProviderServiceStatus(serviceId, SERVICE_STATUS.ARCHIVED)
}
