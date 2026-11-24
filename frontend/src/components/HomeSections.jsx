import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarCheck,
  CircleCheck,
  Clock,
  Droplets,
  GraduationCap,
  Hammer,
  MapPin,
  PawPrint,
  Search,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { steps } from '../data/home'
import { useAuthStore } from '../features/auth/authStore'
import {
  getPublicCategoryTree,
  searchCustomerServices,
} from '../features/catalog/customerCatalogApi'

const icons = {
  Zap,
  Droplets,
  Sparkles,
  PawPrint,
  GraduationCap,
  Hammer,
  Wrench,
  Search,
  CalendarCheck,
  CircleCheck,
}

const container = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' đ'

function SectionHeading({ title, subtitle, href, to }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[15px] text-neutral-500">{subtitle}</p>
        )}
      </div>
      {to ? (
        <Link
          to={to}
          className="hidden items-center gap-1 whitespace-nowrap text-sm font-medium text-primary-600 hover:text-primary-700 sm:inline-flex"
        >
          Xem tất cả <ArrowRight size={16} />
        </Link>
      ) : href ? (
        <a
          href={href}
          className="hidden items-center gap-1 whitespace-nowrap text-sm font-medium text-primary-600 hover:text-primary-700 sm:inline-flex"
        >
          Xem tất cả <ArrowRight size={16} />
        </a>
      ) : null}
    </div>
  )
}

export function Categories() {
  const { isAuthenticated } = useAuthStore()
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (!isAuthenticated) return
    let isMounted = true

    getPublicCategoryTree()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setCategories(data)
        }
      })
      .catch(() => {
        if (isMounted) setCategories([])
      })

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  if (!isAuthenticated || categories.length === 0) {
    return null
  }

  return (
    <section id="categories" className="bg-neutral-50 py-20">
      <div className={container}>
        <SectionHeading title="Danh mục dịch vụ" to="/services" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => {
            const Icon = icons[category.iconName] || Wrench
            return (
              <Link
                key={category.id}
                to={`/services?categoryId=${category.id}`}
                className="group flex flex-col items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-50 group-hover:bg-primary-100">
                  <Icon className="h-6 w-6 text-primary-600" />
                </span>
                <span className="text-center text-sm font-medium text-ink">
                  {category.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function FeaturedServices() {
  const { isAuthenticated, account } = useAuthStore()
  const isCustomer = isAuthenticated && account?.accountType === 'CUSTOMER'
  const [services, setServices] = useState([])

  useEffect(() => {
    if (!isCustomer) return
    let isMounted = true

    searchCustomerServices({ sort: 'NEWEST', page: 0, size: 6 })
      .then((res) => {
        if (isMounted) {
          setServices(res?.items || [])
        }
      })
      .catch(() => {
        if (isMounted) setServices([])
      })

    return () => {
      isMounted = false
    }
  }, [isCustomer])

  if (!isCustomer || services.length === 0) {
    return null
  }

  return (
    <section id="featured" className="bg-white py-20 border-t border-neutral-100">
      <div className={container}>
        <SectionHeading title="Dịch vụ mới nhất" to="/services" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.id}
              className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary-600">
                    {service.categoryName || 'Dịch vụ'}
                  </span>
                  {service.durationMinutes != null && (
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500 tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-neutral-400" />
                      {service.durationMinutes} phút
                    </span>
                  )}
                </div>

                <h3 className="line-clamp-2 min-h-[3rem] text-[17px] font-semibold text-ink">
                  <Link
                    to={`/services/${service.id}`}
                    className="hover:text-primary-600 transition-colors"
                  >
                    {service.title}
                  </Link>
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
                  <Link
                    to={`/providers/${service.providerId}`}
                    className="font-medium text-ink hover:text-primary-600 transition-colors"
                  >
                    {service.providerName}
                  </Link>
                  {service.providerCity && (
                    <span className="inline-flex items-center gap-1 text-neutral-500">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      {service.providerCity}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-neutral-200 pt-4">
                <div>
                  <p className="text-xs text-neutral-500">Giá dịch vụ</p>
                  <p className="text-[17px] font-semibold text-primary-600 tabular-nums">
                    {formatVnd(service.basePriceVnd)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/services/${service.id}`}
                    className="inline-flex h-9 items-center rounded-md border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Chi tiết
                  </Link>
                  <Link
                    to={`/booking/new?serviceId=${service.id}`}
                    className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3.5 text-xs font-medium text-white hover:bg-primary-600"
                  >
                    Đặt lịch
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-50 py-20 border-t border-neutral-100">
      <div className={container}>
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[40px]">
            Chỉ với 3 bước đơn giản
          </h2>
          <p className="mt-3 text-[15px] text-neutral-500">
            Từ lúc tìm dịch vụ đến khi hoàn thành chỉ mất vài phút
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = icons[step.icon]
            return (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-primary-50">
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
                <span className="mb-3 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                  Bước {index + 1}
                </span>
                <h3 className="mb-2 text-[17px] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-neutral-500">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function ProviderCallout() {
  return (
    <section id="provider" className="bg-white py-20">
      <div className={container}>
        <div className="overflow-hidden rounded-2xl bg-ink p-10 lg:p-14">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <h2 className="font-display text-[26px] font-bold leading-tight text-white lg:text-[36px]">
                Trở thành nhà cung cấp dịch vụ
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-300">
                Tăng thu nhập bằng cách cung cấp dịch vụ trên nền tảng của chúng tôi. Đăng ký miễn phí, không phí ẩn.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col">
              <Link
                to="/provider/apply"
                className="inline-flex h-11 items-center justify-center rounded-md bg-white px-6 text-sm font-medium text-ink hover:bg-neutral-100"
              >
                Đăng ký làm nhà cung cấp
              </Link>
              <a
                href="/#how-it-works"
                className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-700 px-6 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Tìm hiểu thêm
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
