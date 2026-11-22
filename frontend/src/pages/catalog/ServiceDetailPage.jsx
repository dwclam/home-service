import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Clock,
  MapPin,
  Building,
  ShieldCheck,
  ArrowRight,
  CalendarCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getCustomerServiceDetail,
  getCustomerServiceAvailableSlots,
} from '../../features/catalog/customerCatalogApi'
import { Button } from '../../components/ui/Button'
import { StatusText } from '../../components/ui/StatusText'

const formatVnd = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ'
}

export const ServiceDetailPage = () => {
  const { serviceId } = useParams()
  const navigate = useNavigate()

  const [service, setService] = useState(null)
  const [availabilityData, setAvailabilityData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // Mốc thời gian hiện tại
  const [currentTimestamp] = useState(() => Date.now())

  // State chọn lịch rảnh (UC38)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  // Tải thông tin chi tiết dịch vụ và lịch rảnh
  useEffect(() => {
    let isMounted = true

    Promise.resolve().then(() => {
      if (isMounted) setIsLoading(true)
    })

    Promise.all([
      getCustomerServiceDetail(serviceId),
      getCustomerServiceAvailableSlots(serviceId),
    ])
      .then(([svc, avail]) => {
        if (!isMounted) return
        setService(svc)
        setAvailabilityData(avail)
      })
      .catch((err) => {
        console.warn('Lỗi lấy dữ liệu dịch vụ:', err)
        if (isMounted) toast.error('Không thể tải chi tiết dịch vụ.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [serviceId])

  // Nhóm các khoảng rảnh availableSlots theo ngày (YYYY-MM-DD theo giờ địa phương)
  const slotsByDate = useMemo(() => {
    if (!availabilityData?.availableSlots) return {}
    const grouped = {}

    availabilityData.availableSlots.forEach((slot) => {
      try {
        const startDate = new Date(slot.startsAt)
        const y = startDate.getFullYear()
        const m = String(startDate.getMonth() + 1).padStart(2, '0')
        const d = String(startDate.getDate()).padStart(2, '0')
        const dateKey = `${y}-${m}-${d}`

        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(slot)
      } catch (e) {
        console.warn('Invalid slot date:', e)
      }
    })

    return grouped
  }, [availabilityData])

  // Danh sách các ngày có lịch rảnh
  const availableDateKeys = useMemo(() => {
    return Object.keys(slotsByDate).sort()
  }, [slotsByDate])

  // Ngày đang chọn (mặc định ngày đầu tiên nếu chưa chọn)
  const activeDate = selectedDate || availableDateKeys[0] || ''

  // Tách các mốc giờ bắt đầu hợp lệ cho ngày đang chọn:
  // startsAt <= T <= endsAt - durationMinutes và T >= now + 60 phút
  const validStartTimesForSelectedDate = useMemo(() => {
    if (!activeDate || !slotsByDate[activeDate] || !service) return []
    const duration = service.durationMinutes || 60
    const minAllowedTime = currentTimestamp + 60 * 60 * 1000 // Quy tắc lead-time MD01: >= 60 phút
    const times = new Set()

    slotsByDate[activeDate].forEach((range) => {
      const rangeStart = new Date(range.startsAt).getTime()
      const rangeEnd = new Date(range.endsAt).getTime()
      const maxStart = rangeEnd - duration * 60 * 1000

      if (maxStart >= rangeStart) {
        // Bước nhảy mỗi 30 phút (1.800.000 ms)
        for (let t = rangeStart; t <= maxStart; t += 30 * 60 * 1000) {
          if (t >= minAllowedTime) {
            const dateObj = new Date(t)
            const hours = String(dateObj.getHours()).padStart(2, '0')
            const mins = String(dateObj.getMinutes()).padStart(2, '0')
            times.add(`${hours}:${mins}`)
          }
        }
      }
    })

    return Array.from(times).sort()
  }, [activeDate, slotsByDate, service, currentTimestamp])

  // Tính toán chi phí dự kiến
  const pricing = useMemo(() => {
    const total = service?.basePriceVnd || 0
    const deposit = Math.round((total * 30) / 100)
    const balance = total - deposit
    return { total, deposit, balance }
  }, [service])

  // Điều hướng sang trang Đặt lịch với thông tin đã chọn
  const handleProceedToBooking = () => {
    if (!activeDate || !selectedTime) {
      toast.error('Vui lòng chọn ngày và khung giờ bạn muốn đặt lịch.')
      return
    }

    const startsAtParam = `${activeDate}T${selectedTime}:00`
    navigate(
      `/booking/new?serviceId=${service.id || service.serviceId}&startsAt=${encodeURIComponent(
        startsAtParam
      )}&date=${activeDate}&time=${selectedTime}`
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 font-sans">
        <p className="text-sm text-neutral-500">Đang tải thông tin dịch vụ...</p>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 font-sans text-center space-y-4">
        <h2 className="text-xl font-bold font-display text-ink">
          Không tìm thấy dịch vụ
        </h2>
        <p className="text-sm text-neutral-500 max-w-sm">
          Dịch vụ không tồn tại hoặc đã tạm dừng phục vụ. Vui lòng quay lại danh sách dịch vụ.
        </p>
        <Link to="/services">
          <Button variant="primary">Khám phá dịch vụ khác</Button>
        </Link>
      </div>
    )
  }

  const images = service.images?.length > 0
    ? service.images
    : [{ id: 1, imageUrl: service.image || 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80' }]
  const currentImage = images[selectedImageIndex] || images[0]

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap">
          <Link to="/" className="hover:text-primary-600 transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <Link to="/services" className="hover:text-primary-600 transition-colors">
            Dịch vụ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <Link
            to={`/services?categoryId=${service.categoryId}`}
            className="hover:text-primary-600 transition-colors font-medium text-ink"
          >
            {service.categoryName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-400 truncate max-w-xs">{service.title}</span>
        </nav>

        {/* 2-Column Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột trái (7 cols) — Chi tiết dịch vụ & NCC */}
          <div className="lg:col-span-7 space-y-6">
            {/* Gallery ảnh dịch vụ */}
            <div className="bg-white p-4 rounded-md border border-neutral-200 shadow-xs space-y-3">
              <div className="relative h-72 sm:h-96 rounded-md overflow-hidden bg-neutral-100">
                <img
                  src={currentImage.imageUrl}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 backdrop-blur text-xs font-semibold text-primary-700 shadow-xs">
                  {service.categoryName}
                </span>
              </div>

              {/* Thumbnails nếu có nhiều ảnh */}
              {images.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      aria-label={`Xem ảnh ${idx + 1}`}
                      className={`relative w-20 h-16 rounded-md overflow-hidden border-2 transition-opacity transition-colors shrink-0 cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-primary-500 shadow-xs'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Thông tin tiêu đề & Thông số */}
            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink leading-tight">
                  {service.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Khu vực: <strong className="text-ink">{service.providerCity || 'Toàn quốc'}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Thời lượng ước tính: <strong className="text-ink tabular-nums">~{service.durationMinutes} phút</strong></span>
                  </span>
                </div>
              </div>

              {/* Mô tả dịch vụ */}
              <div className="border-t border-neutral-100 pt-4 space-y-2">
                <h2 className="font-display font-bold text-base text-ink">
                  Mô tả chi tiết & Cam kết chất lượng
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                  {service.description}
                </p>
              </div>
            </div>

            {/* Thẻ Hồ sơ Nhà cung cấp công khai (UC07 link) */}
            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary-600" />
                  <span>Đơn vị cung cấp dịch vụ</span>
                </h3>
                <StatusText icon={ShieldCheck} label="Đối tác xác thực" tone="success" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-ink text-base">
                    {service.providerName}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Khu vực hoạt động: <strong className="text-ink">{service.providerCity}</strong>
                  </p>
                  {service.providerBio && (
                    <p className="text-xs text-neutral-600 line-clamp-2 max-w-lg leading-relaxed">
                      {service.providerBio}
                    </p>
                  )}
                </div>

                <Link to={`/providers/${service.providerId}`} className="shrink-0">
                  <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                    Xem hồ sơ NCC
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Cột phải (5 cols) — Widget Xem Lịch Rảnh Thực Tế & Đặt Lịch (UC38) */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-5">
              {/* Bảng giá dịch vụ */}
              <div className="border-b border-neutral-100 pb-4 space-y-1">
                <p className="text-sm font-medium text-neutral-500">
                  Giá dịch vụ
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-primary-600 tabular-nums">
                    {formatVnd(pricing.total)}
                  </span>
                  <span className="text-xs text-neutral-500">/ gói</span>
                </div>

                {/* Financial breakdown */}
                <div className="pt-2 text-xs text-neutral-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Đặt cọc giữ chỗ (30%):</span>
                    <strong className="text-amber-700 tabular-nums">{formatVnd(pricing.deposit)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Thanh toán khi hoàn thành (70%):</span>
                    <strong className="text-ink tabular-nums">{formatVnd(pricing.balance)}</strong>
                  </div>
                </div>
              </div>

              {/* Lịch rảnh thực tế */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-primary-500" />
                    <span>Lịch rảnh của thợ trong tuần</span>
                  </h4>
                  <span className="text-[11px] text-neutral-400">7 ngày tới</span>
                </div>

                {/* Danh sách ngày có lịch rảnh */}
                {availableDateKeys.length === 0 ? (
                  <div className="p-4 bg-neutral-50 rounded-md border border-neutral-200 text-center text-xs text-neutral-500">
                    Hiện thợ chưa có khoảng lịch rảnh nào khả dụng trong 7 ngày tới.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 mb-1.5">
                        1. Chọn ngày thực hiện:
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {availableDateKeys.map((dateKey) => {
                          const dateObj = new Date(dateKey)
                          const dayName = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })
                          const dayDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                          const isSelected = activeDate === dateKey

                          return (
                            <button
                              key={dateKey}
                              type="button"
                              onClick={() => {
                                setSelectedDate(dateKey)
                                setSelectedTime('')
                              }}
                              className={`p-2 rounded-md border text-center transition-colors cursor-pointer ${
                                isSelected
                                  ? 'border-primary-500 bg-primary-50 text-primary-700 font-bold shadow-xs'
                                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                              }`}
                            >
                              <p className="text-[11px] uppercase">{dayName}</p>
                              <p className="text-xs mt-0.5">{dayDate}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Danh sách mốc giờ bắt đầu hợp lệ */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 mb-1.5">
                        2. Chọn mốc giờ bắt đầu phù hợp:
                      </label>

                      {validStartTimesForSelectedDate.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic p-3 bg-neutral-50 rounded-md">
                          Không còn khung giờ trống phù hợp trong ngày này.
                        </p>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1 bg-neutral-50/50 rounded-md border border-neutral-100">
                          {validStartTimesForSelectedDate.map((timeStr) => {
                            const isTimeSelected = selectedTime === timeStr
                            return (
                              <button
                                key={timeStr}
                                type="button"
                                onClick={() => setSelectedTime(timeStr)}
                                className={`py-2 px-1 text-center rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                                  isTimeSelected
                                    ? 'bg-primary-500 border-primary-500 text-white font-bold shadow-xs'
                                    : 'bg-white border-neutral-200 text-ink hover:border-neutral-300'
                                }`}
                              >
                                {timeStr}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Nút Đặt lịch */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleProceedToBooking}
                    disabled={!activeDate || !selectedTime}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Tiếp tục đặt lịch
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceDetailPage
