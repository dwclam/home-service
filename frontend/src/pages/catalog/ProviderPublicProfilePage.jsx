import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MapPin,
  ShieldCheck,
  Clock,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getPublicProviderProfile,
  searchCustomerServices,
} from '../../features/catalog/customerCatalogApi'
import { Button } from '../../components/ui/Button'

const formatVnd = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ'
}

export const ProviderPublicProfilePage = () => {
  const { providerId } = useParams()

  const [provider, setProvider] = useState(null)
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    Promise.resolve().then(() => {
      if (isMounted) setIsLoading(true)
    })

    Promise.all([
      getPublicProviderProfile(providerId),
      searchCustomerServices({ providerId, size: 20 }),
    ])
      .then(([prov, svcRes]) => {
        if (!isMounted) return
        setProvider(prov)
        setServices(svcRes?.items || [])
      })
      .catch((err) => {
        console.warn('Lỗi tải hồ sơ nhà cung cấp:', err)
        if (isMounted) toast.error('Không thể tải hồ sơ nhà cung cấp.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [providerId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 font-sans">
        <p className="text-sm text-neutral-500">Đang tải hồ sơ nhà cung cấp...</p>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 font-sans text-center space-y-4">
        <h2 className="text-xl font-bold font-display text-ink">
          Không tìm thấy Nhà cung cấp
        </h2>
        <p className="text-sm text-neutral-500 max-w-sm">
          Nhà cung cấp không tồn tại hoặc đã tạm dừng hoạt động trên hệ thống.
        </p>
        <Link to="/services">
          <Button variant="primary">Khám phá dịch vụ khác</Button>
        </Link>
      </div>
    )
  }

  const initialLetter = (provider.businessName || 'N').trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách dịch vụ</span>
          </Link>
        </div>

        {/* Provider Profile Header Card */}
        <div className="bg-white p-6 sm:p-8 rounded-md border border-neutral-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar / Logo */}
            <div className="w-20 h-20 rounded-full bg-primary-500 text-white font-display font-bold text-3xl flex items-center justify-center shrink-0 shadow-xs border-4 border-primary-50">
              {initialLetter}
            </div>

            {/* Provider Basic Info */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
                  {provider.businessName}
                </h1>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đối tác Nestify chính thức
                </span>
              </div>

              {provider.address && (
                <p className="text-sm text-neutral-600 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>{provider.address}</span>
                  {provider.city && <span className="text-neutral-400">({provider.city})</span>}
                </p>
              )}
            </div>
          </div>

          {/* Bio / Giới thiệu năng lực */}
          {provider.bio && (
            <div className="p-4 bg-neutral-50 rounded-md border border-neutral-100 text-sm text-neutral-700 leading-relaxed">
              <p className="font-semibold text-ink text-xs uppercase tracking-wider mb-1">
                Giới thiệu đơn vị:
              </p>
              <p>{provider.bio}</p>
            </div>
          )}

          {/* Cam kết đối tác */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-neutral-600 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã xác minh hồ sơ năng lực</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cam kết minh bạch giá dịch vụ</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Bảo hành chất lượng dịch vụ</span>
            </div>
          </div>
        </div>

        {/* Danh sách các gói dịch vụ của NCC này */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="text-xl font-display font-bold text-ink">
                Các gói dịch vụ đang cung cấp ({services.length})
              </h2>
            </div>
          </div>

          {services.length === 0 ? (
            <div className="bg-white p-8 rounded-md border border-neutral-200 text-center text-sm text-neutral-500">
              Nhà cung cấp hiện chưa có gói dịch vụ nào đang mở bán.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => {
                const sId = service.id || service.serviceId
                return (
                  <article
                    key={sId}
                    className="bg-white rounded-md border border-neutral-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
                  >
                    <div className="relative h-44 overflow-hidden bg-neutral-100">
                      <img
                        src={service.image || service.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80'}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/95 text-[11px] font-semibold text-primary-700 shadow-xs">
                        {service.categoryName}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <Link
                          to={`/services/${sId}`}
                          className="font-semibold text-ink text-sm hover:text-primary-600 transition-colors line-clamp-2"
                        >
                          {service.title}
                        </Link>
                        <p className="text-xs text-neutral-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>~{service.durationMinutes} phút</span>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] text-neutral-400 font-medium">Đơn giá</p>
                          <p className="text-base font-bold text-primary-600 font-display">
                            {formatVnd(service.basePriceVnd)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Link to={`/services/${sId}`}>
                            <Button variant="secondary" size="sm">
                              Chi tiết
                            </Button>
                          </Link>
                          <Link to={`/booking/new?serviceId=${sId}`}>
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
        </div>
      </div>
    </div>
  )
}

export default ProviderPublicProfilePage
