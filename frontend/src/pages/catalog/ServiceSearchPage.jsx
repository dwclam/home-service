import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Search,
  X,
  MapPin,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  searchCustomerServices,
  getPublicCategoryTree,
} from '../../features/catalog/customerCatalogApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const CITIES = [
  { value: '', label: 'Tất cả khu vực' },
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'TP. Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
  { value: 'Đà Nẵng', label: 'Đà Nẵng' },
]

const SORT_OPTIONS = [
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'PRICE_ASC', label: 'Giá thấp đến cao' },
  { value: 'PRICE_DESC', label: 'Giá cao đến thấp' },
]

const formatVnd = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ'
}

export const ServiceSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Đọc params từ URL
  const keywordParam = searchParams.get('keyword') || ''
  const categoryIdParam = searchParams.get('categoryId') || ''
  const cityParam = searchParams.get('city') || ''
  const minPriceParam = searchParams.get('minPrice') || ''
  const maxPriceParam = searchParams.get('maxPrice') || ''
  const sortParam = searchParams.get('sort') || 'NEWEST'
  const pageParam = Number(searchParams.get('page')) || 0

  // Local state cho form tìm kiếm
  const [keywordInput, setKeywordInput] = useState(keywordParam)
  const [prevKeywordParam, setPrevKeywordParam] = useState(keywordParam)

  // Điều chỉnh state khi query param thay đổi từ ngoài theo chuẩn React docs
  if (keywordParam !== prevKeywordParam) {
    setPrevKeywordParam(keywordParam)
    setKeywordInput(keywordParam)
  }

  const [categories, setCategories] = useState([])
  const [servicesData, setServicesData] = useState({
    items: [],
    page: 0,
    size: 9,
    totalElements: 0,
    totalPages: 1,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)

  // Tải cây danh mục
  useEffect(() => {
    let isMounted = true
    getPublicCategoryTree()
      .then((data) => {
        if (isMounted) setCategories(data || [])
      })
      .catch((err) => {
        console.warn('Lỗi lấy cây danh mục:', err)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Cập nhật URL Search Params
  const updateParams = useCallback((newParams) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === '' || v === undefined || v === null) {
          next.delete(k)
        } else {
          next.set(k, String(v))
        }
      })
      return next
    })
  }, [setSearchParams])

  // Tải danh sách dịch vụ
  useEffect(() => {
    let isMounted = true

    Promise.resolve().then(() => {
      if (isMounted) setIsLoading(true)
    })

    const params = {
      keyword: keywordParam,
      categoryId: categoryIdParam,
      city: cityParam,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam,
      sort: sortParam,
      page: pageParam,
      size: 9,
    }

    searchCustomerServices(params)
      .then((res) => {
        if (isMounted) {
          setAuthRequired(false)
          setServicesData(res)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          setAuthRequired(true)
          setServicesData({
            items: [],
            page: 0,
            size: 9,
            totalElements: 0,
            totalPages: 1,
          })
          return
        }
        toast.error(
          err?.response?.data?.message || 'Không thể tải danh sách dịch vụ.'
        )
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [keywordParam, categoryIdParam, cityParam, minPriceParam, maxPriceParam, sortParam, pageParam])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    updateParams({ keyword: keywordInput.trim(), page: 0 })
  }

  const handleClearKeyword = () => {
    setKeywordInput('')
    updateParams({ keyword: '', page: 0 })
  }

  const handleResetFilters = () => {
    setKeywordInput('')
    setSearchParams({})
  }

  // Flatten cây danh mục cho dropdown
  const flatCategories = useMemo(() => {
    const result = []
    const traverse = (cats, prefix = '') => {
      cats.forEach((c) => {
        result.push({ id: c.id, name: prefix + c.name, slug: c.slug })
        if (c.children && c.children.length > 0) {
          traverse(c.children, prefix + '— ')
        }
      })
    }
    traverse(categories)
    return result
  }, [categories])

  const isFiltering = Boolean(
    keywordParam || categoryIdParam || cityParam || minPriceParam || maxPriceParam
  )

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
              Danh sách dịch vụ
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className="lg:hidden"
              leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            >
              Bộ lọc ({isFiltering ? 'Đang lọc' : 'Tất cả'})
            </Button>
          </div>
        </div>

        {/* Toolbar Tìm kiếm & Lọc chính */}
        <div className="bg-white p-4 sm:p-5 rounded-md border border-neutral-200 shadow-xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2.5">
            <div className="relative flex-1">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Tìm tên dịch vụ, thợ, mô tả (ví dụ: điều hòa, sửa nước, dọn nhà...)"
                leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
                rightIcon={
                  keywordInput ? (
                    <button
                      type="button"
                      onClick={handleClearKeyword}
                      className="text-neutral-400 hover:text-ink cursor-pointer"
                      title="Xóa từ khóa"
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null
                }
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Tìm kiếm
            </Button>
          </form>

          {/* Hàng bộ lọc Desktop (Dropdowns) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-neutral-100 ${showFilterDrawer ? 'block' : 'hidden lg:grid'}`}>
            {/* Chọn Danh mục */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Danh mục dịch vụ
              </label>
              <select
                value={categoryIdParam}
                onChange={(e) => updateParams({ categoryId: e.target.value, page: 0 })}
                className="w-full h-10 px-3 text-xs font-sans text-ink bg-white rounded-md border border-neutral-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Tất cả danh mục</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn Khu vực */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Khu vực phục vụ
              </label>
              <select
                value={cityParam}
                onChange={(e) => updateParams({ city: e.target.value, page: 0 })}
                className="w-full h-10 px-3 text-xs font-sans text-ink bg-white rounded-md border border-neutral-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Giá tối thiểu */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Giá từ (VND)
              </label>
              <Input
                type="number"
                min={0}
                step={50000}
                placeholder="0"
                value={minPriceParam}
                onChange={(e) => updateParams({ minPrice: e.target.value, page: 0 })}
              />
            </div>

            {/* Giá tối đa */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Đến mức giá (VND)
              </label>
              <Input
                type="number"
                min={0}
                step={50000}
                placeholder="1.000.000"
                value={maxPriceParam}
                onChange={(e) => updateParams({ maxPrice: e.target.value, page: 0 })}
              />
            </div>

            {/* Sắp xếp */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Sắp xếp theo
              </label>
              <select
                value={sortParam}
                onChange={(e) => updateParams({ sort: e.target.value, page: 0 })}
                className="w-full h-10 px-3 text-xs font-sans text-ink bg-white rounded-md border border-neutral-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Active Filter Badges */}
          {isFiltering && (
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="text-neutral-400 font-medium">Đang lọc theo:</span>
              {keywordParam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 font-medium">
                  Từ khóa: &quot;{keywordParam}&quot;
                  <button
                    type="button"
                    onClick={() => updateParams({ keyword: '', page: 0 })}
                    className="hover:text-primary-900 cursor-pointer"
                    aria-label="Xóa bộ lọc từ khóa"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {categoryIdParam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 font-medium">
                  Danh mục: {flatCategories.find((c) => String(c.id) === String(categoryIdParam))?.name || categoryIdParam}
                  <button
                    type="button"
                    onClick={() => updateParams({ categoryId: '', page: 0 })}
                    className="hover:text-primary-900 cursor-pointer"
                    aria-label="Xóa bộ lọc danh mục"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {cityParam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 font-medium">
                  Khu vực: {cityParam}
                  <button
                    type="button"
                    onClick={() => updateParams({ city: '', page: 0 })}
                    className="hover:text-primary-900 cursor-pointer"
                    aria-label="Xóa bộ lọc khu vực"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(minPriceParam || maxPriceParam) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 font-medium tabular-nums">
                  Giá: {minPriceParam ? formatVnd(minPriceParam) : '0'} - {maxPriceParam ? formatVnd(maxPriceParam) : 'Max'}
                  <button
                    type="button"
                    onClick={() => updateParams({ minPrice: '', maxPrice: '', page: 0 })}
                    className="hover:text-primary-900 cursor-pointer"
                    aria-label="Xóa bộ lọc khoảng giá"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline font-medium cursor-pointer ml-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại tất cả</span>
              </button>
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between text-xs text-neutral-500 px-1 tabular-nums">
          <span>
            Tìm thấy <strong className="text-ink font-semibold">{servicesData.totalElements}</strong> dịch vụ phù hợp
          </span>
          <span>
            Trang {servicesData.page + 1} / {servicesData.totalPages || 1}
          </span>
        </div>

        {/* Grid Dịch vụ / Skeletons / Empty */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-md border border-neutral-200 overflow-hidden animate-pulse space-y-3 p-4"
              >
                <div className="h-44 bg-neutral-200 rounded-md" />
                <div className="h-4 bg-neutral-200 rounded w-1/3" />
                <div className="h-5 bg-neutral-200 rounded w-3/4" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
                <div className="h-8 bg-neutral-100 rounded" />
              </div>
            ))}
          </div>
        ) : servicesData.items.length === 0 ? (
          <div className="bg-white p-12 rounded-md border border-neutral-200 text-center space-y-4">
            <Search className="w-8 h-8 text-neutral-300 mx-auto" aria-hidden="true" />
            <h2 className="text-lg font-bold font-display text-ink">
              Không tìm thấy dịch vụ phù hợp
            </h2>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              {authRequired
                ? 'Vui lòng đăng nhập bằng tài khoản Khách hàng để tìm kiếm và đặt các gói dịch vụ trên hệ thống.'
                : 'Không có dịch vụ nào khớp với bộ lọc hiện tại của bạn. Vui lòng thử tìm với từ khóa khác hoặc xóa bớt tiêu chí lọc.'}
            </p>
            {authRequired ? (
              <Link to="/login">
                <Button type="button" variant="primary" size="md">
                  Đăng nhập Khách hàng
                </Button>
              </Link>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleResetFilters}
              >
                Xóa toàn bộ bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesData.items.map((service) => {
              const serviceId = service.id || service.serviceId
              return (
                <article
                  key={serviceId}
                  className="group bg-white rounded-md border border-neutral-200 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden"
                >
                  {/* Service Image & Category Badge */}
                  <div className="relative h-48 overflow-hidden bg-neutral-100 shrink-0">
                    <img
                      src={service.image || service.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80'}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-xs font-semibold text-primary-700 shadow-xs">
                      {service.categoryName || 'Dịch vụ'}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <Link
                        to={`/services/${serviceId}`}
                        className="block font-semibold text-ink text-base line-clamp-2 hover:text-primary-600 transition-colors"
                      >
                        {service.title}
                      </Link>

                      {/* Provider Info */}
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                        <span className="text-neutral-400">NCC:</span>
                        <Link
                          to={`/providers/${service.providerId}`}
                          className="font-medium text-ink hover:text-primary-600 transition-colors truncate"
                        >
                          {service.providerName}
                        </Link>
                      </div>

                      {/* City & Duration */}
                      <div className="flex items-center gap-3 text-xs text-neutral-500 pt-1">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{service.providerCity || 'Toàn quốc'}</span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>~{service.durationMinutes} phút</span>
                        </span>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-neutral-400 font-medium">Đơn giá từ</p>
                        <p className="text-base font-bold text-primary-600 font-display tabular-nums">
                          {formatVnd(service.basePriceVnd)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/services/${serviceId}`}>
                          <Button variant="secondary" size="sm">
                            Chi tiết
                          </Button>
                        </Link>
                        <Link to={`/booking/new?serviceId=${serviceId}`}>
                          <Button variant="primary" size="sm">
                            Đặt lịch
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {servicesData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={servicesData.page <= 0}
              onClick={() => updateParams({ page: servicesData.page - 1 })}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Trang trước
            </Button>

            <span className="text-xs font-semibold px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-ink tabular-nums">
              {servicesData.page + 1} / {servicesData.totalPages}
            </span>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={servicesData.page >= servicesData.totalPages - 1}
              onClick={() => updateParams({ page: servicesData.page + 1 })}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Trang sau
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ServiceSearchPage
