import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Star, Clock } from 'lucide-react'

import { getBookableServices } from '../../features/booking/api'
import { categories } from '../../data/home'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'

const CATEGORY_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  ...categories.map((cat) => ({ key: cat.title, label: cat.title })),
]

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + 'đ'

export const ServicesCatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category') || 'ALL'
  const initialKeyword = searchParams.get('provider') || ''

  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [keyword, setKeyword] = useState(initialKeyword)

  useEffect(() => {
    let isMounted = true
    const loadServices = async () => {
      try {
        const list = await getBookableServices()
        if (isMounted) {
          setServices(list || [])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    loadServices()
    return () => {
      isMounted = false
    }
  }, [])

  const handleCategoryChange = (nextCategory) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextCategory === 'ALL') {
      nextParams.delete('category')
    } else {
      nextParams.set('category', nextCategory)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const filteredServices = services.filter((srv) => {
    const matchCategory =
      categoryFilter === 'ALL' ||
      srv.categoryName?.toLowerCase().includes(categoryFilter.toLowerCase())

    const kw = keyword.trim().toLowerCase()
    const matchKeyword =
      !kw ||
      srv.title?.toLowerCase().includes(kw) ||
      srv.providerName?.toLowerCase().includes(kw) ||
      srv.categoryName?.toLowerCase().includes(kw)

    return matchCategory && matchKeyword
  })

  return (
    <div className="bg-neutral-50 min-h-[calc(100vh-64px)] py-8 sm:py-10 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Tất cả dịch vụ
          </h1>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {CATEGORY_TABS.map((tab) => {
              const active = categoryFilter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleCategoryChange(tab.key)}
                  className={`h-9 px-3.5 rounded-md text-xs font-medium transition-colors duration-150 shrink-0 cursor-pointer ${
                    active
                      ? 'bg-primary-500 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="w-full md:w-72">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm dịch vụ, nhà cung cấp..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center text-sm text-neutral-500">
            Đang tải danh sách dịch vụ...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg">
            <EmptyState
              title="Không tìm thấy dịch vụ phù hợp"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setKeyword('')
                    handleCategoryChange('ALL')
                  }}
                >
                  Xóa bộ lọc
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => {
              const initials =
                service.initials ||
                (service.providerName || 'N').trim().charAt(0).toUpperCase()
              const coverImg =
                service.image ||
                'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80'

              return (
                <article
                  key={service.id}
                  className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-48 overflow-hidden bg-neutral-100">
                      <img
                        src={coverImg}
                        alt={service.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-medium text-primary-700 backdrop-blur">
                        {service.categoryName}
                      </span>
                    </div>

                    <div className="p-5 pb-4">
                      <h2 className="mb-2 line-clamp-2 min-h-[3.25rem] text-[17px] font-semibold text-ink">
                        {service.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                          {initials}
                        </span>
                        <span className="text-sm text-neutral-600">
                          {service.providerName}
                        </span>
                        {service.rating && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-accent-500 text-accent-500" />
                              <span className="text-sm font-medium text-neutral-700">
                                {service.rating}
                              </span>
                            </span>
                          </>
                        )}
                        {service.durationMinutes && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <span className="inline-flex items-center gap-1 text-neutral-500">
                              <Clock className="w-3.5 h-3.5" />
                              {service.durationMinutes} phút
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
                      <div>
                        <p className="text-xs text-neutral-500">Giá niêm yết</p>
                        <p className="text-[17px] font-semibold text-primary-600">
                          {formatVnd(service.basePriceVnd)}
                        </p>
                      </div>
                      <Link to={`/customer/bookings/new?serviceId=${service.id}`}>
                        <Button variant="primary" size="sm">
                          Đặt lịch
                        </Button>
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ServicesCatalogPage
