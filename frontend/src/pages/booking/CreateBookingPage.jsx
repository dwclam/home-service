import { useState, useMemo, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  ShieldAlert,
  Info,
  ArrowLeft,
} from 'lucide-react'

import { standardBookingServices, findServiceById } from '../../features/booking/bookingCatalogData'
import { createBookingSchema } from '../../features/booking/schemas'
import { createBooking, createMockBooking } from '../../features/booking/api'
import { useAuthStore } from '../../features/auth/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FormField } from '../../components/ui/FormField'

const TIME_SLOTS = [
  '08:00',
  '09:30',
  '11:00',
  '13:30',
  '15:00',
  '16:30',
  '18:00',
]

const formatVnd = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ'
}

export const CreateBookingPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { account } = useAuthStore()

  // Lấy serviceId, date, time hoặc startsAt từ query param nếu có
  const initialServiceId = Number(searchParams.get('serviceId')) || 1
  const queryStartsAt = searchParams.get('startsAt') || ''
  const rawQueryDate = searchParams.get('date') || ''
  const rawQueryTime = searchParams.get('time') || ''

  const { queryDate, queryTime } = useMemo(() => {
    let date = rawQueryDate
    let time = rawQueryTime
    if (queryStartsAt && (!date || !time)) {
      const d = new Date(queryStartsAt)
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const min = String(d.getMinutes()).padStart(2, '0')
        date = date || `${yyyy}-${mm}-${dd}`
        time = time || `${hh}:${min}`
      }
    }
    return { queryDate: date, queryTime: time }
  }, [rawQueryDate, rawQueryTime, queryStartsAt])

  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId)

  // Ngày tối thiểu là hôm nay (theo giờ địa phương)
  const todayStr = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const selectedService = useMemo(() => {
    return findServiceById(selectedServiceId)
  }, [selectedServiceId])

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    clearErrors,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      serviceId: selectedService.serviceId,
      providerId: selectedService.providerId,
      bookingDate: queryDate || todayStr,
      bookingTime: queryTime || '',
      recipientName: account?.displayName || '',
      recipientPhone: '',
      city: 'Hà Nội',
      ward: '',
      addressLine: '',
      addressInstructions: '',
      customerNote: '',
    },
    mode: 'onTouched',
  })

  const watchDate = useWatch({ control, name: 'bookingDate' })
  const watchTime = useWatch({ control, name: 'bookingTime' })

  // Cập nhật serviceId và providerId khi người dùng chọn dịch vụ khác
  useEffect(() => {
    setValue('serviceId', selectedService.serviceId)
    setValue('providerId', selectedService.providerId)
  }, [selectedService, setValue])

  // Đồng bộ ngày và giờ khi URL searchParams thay đổi
  useEffect(() => {
    if (queryDate) setValue('bookingDate', queryDate)
    if (queryTime) setValue('bookingTime', queryTime)
  }, [queryDate, queryTime, setValue])

  // Tính thời gian kết thúc dự kiến
  const appointmentRange = useMemo(() => {
    if (!watchDate || !watchTime) return null
    try {
      const start = new Date(`${watchDate}T${watchTime}:00`)
      if (Number.isNaN(start.getTime())) return null
      const end = new Date(start.getTime() + selectedService.durationMinutes * 60 * 1000)
      const formatTime = (d) =>
        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
      const formatDate = (d) =>
        d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

      return {
        startStr: `${formatTime(start)} ngày ${formatDate(start)}`,
        endStr: `${formatTime(end)}`,
      }
    } catch {
      return null
    }
  }, [watchDate, watchTime, selectedService])

  // Tính toán tiền cọc 30% và số tiền còn lại 70%
  const pricing = useMemo(() => {
    const total = selectedService.basePriceVnd || 0
    const deposit = Math.round((total * 30) / 100)
    const balance = total - deposit
    return { total, deposit, balance }
  }, [selectedService])

  // Nộp form gọi API thật
  const onSubmit = async (values) => {
    const appointmentDate = new Date(`${values.bookingDate}T${values.bookingTime}:00`)
    const startsAtIso = appointmentDate.toISOString()

    const payload = {
      clientRequestKey: crypto.randomUUID(),
      providerId: Number(values.providerId),
      serviceId: Number(values.serviceId),
      startsAt: startsAtIso,
      recipientName: values.recipientName.trim(),
      recipientPhone: values.recipientPhone.trim(),
      addressLine: values.addressLine.trim(),
      ward: values.ward?.trim() || undefined,
      city: values.city.trim(),
      addressInstructions: values.addressInstructions?.trim() || undefined,
      customerNote: values.customerNote?.trim() || undefined,
    }

    try {
      const response = await createBooking(payload)
      toast.success('Gửi yêu cầu đặt lịch dịch vụ thành công!')
      navigate(`/customer/bookings/${response.id}`, { state: { booking: response } })
    } catch (error) {
      const errorData = error.response?.data
      const message =
        errorData?.message ||
        'Không thể gửi đơn đặt lịch lên hệ thống. Vui lòng thử lại hoặc sử dụng Chế độ Demo.'
      toast.error(message)

      const fieldErrors = errorData?.fieldErrors
      if (fieldErrors && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: msg })
        })
      }

      if (error.response?.status === 400 && errorData?.message) {
        setError('bookingTime', { type: 'server', message: errorData.message })
        setError('startsAt', { type: 'server', message: errorData.message })
      }
    }
  }

  // Chế độ Demo khi DB local chưa seed lịch thợ
  const handleDemoSubmit = () => {
    const values = getValues()
    if (!values.bookingDate || !values.bookingTime) {
      toast.error('Vui lòng chọn ngày và khung giờ hẹn trước khi tạo đơn mô phỏng.')
      return
    }
    if (!values.recipientName || !values.recipientPhone || !values.addressLine) {
      toast.error('Vui lòng nhập họ tên, số điện thoại và địa chỉ thực hiện.')
      return
    }

    const mockBooking = createMockBooking(values, selectedService)
    toast.success('Đã tạo đơn đặt lịch mô phỏng (Chế độ Demo)!')
    navigate(`/customer/bookings/${mockBooking.id}`, {
      state: { booking: mockBooking },
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mt-2">
            Đặt Lịch Dịch Vụ Tại Nhà
          </h1>
        </div>

        {/* 2-Column Layout */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cột trái (7 cols) - Các bước nhập form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Bước 1: Chọn gói dịch vụ */}
              <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-display font-bold text-lg text-ink">
                    Chọn gói dịch vụ
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {standardBookingServices.map((service) => {
                    const isSelected = selectedServiceId === service.serviceId
                    return (
                      <button
                        key={service.serviceId}
                        type="button"
                        onClick={() => setSelectedServiceId(service.serviceId)}
                        className={`flex gap-3 p-3 text-left rounded-md border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500 shadow-xs'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <img
                          src={service.image}
                          alt=""
                          className="w-16 h-16 rounded-md object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-primary-600 uppercase">
                            {service.categoryName}
                          </p>
                          <h3 className="text-xs font-semibold text-ink line-clamp-1 mt-0.5">
                            {service.title}
                          </h3>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {service.providerName}
                          </p>
                          <p className="text-xs font-bold text-primary-600 mt-1">
                            {formatVnd(service.basePriceVnd)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bước 2: Chọn Ngày & Giờ hẹn */}
              <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-display font-bold text-lg text-ink">
                    Chọn ngày & khung giờ hẹn
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Ngày thực hiện"
                    htmlFor="bookingDate"
                    required
                    error={errors.bookingDate?.message}
                  >
                    <Input
                      {...register('bookingDate', {
                        onChange: () => {
                          clearErrors('startsAt')
                          if (getValues('bookingTime')) {
                            trigger('bookingTime')
                          }
                        },
                      })}
                      id="bookingDate"
                      type="date"
                      min={todayStr}
                      hasError={Boolean(errors.bookingDate)}
                      leftIcon={<Calendar className="w-4 h-4" />}
                    />
                  </FormField>

                  <FormField
                    label="Khung giờ hẹn"
                    htmlFor="bookingTime"
                    required
                    error={errors.startsAt?.message || errors.bookingTime?.message}
                  >
                    <Input
                      {...register('bookingTime', {
                        onChange: () => {
                          clearErrors('startsAt')
                          trigger('bookingTime')
                        },
                      })}
                      id="bookingTime"
                      type="time"
                      hasError={Boolean(errors.startsAt || errors.bookingTime)}
                      leftIcon={<Clock className="w-4 h-4" />}
                    />
                  </FormField>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-neutral-500">
                    Gợi ý chọn nhanh
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = watchTime === slot
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            clearErrors('startsAt')
                            setValue('bookingTime', slot, {
                              shouldValidate: true,
                              shouldTouch: true,
                            })
                          }}
                          className={`h-9 px-3 text-center rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary-500 border-primary-500 text-white font-semibold shadow-xs'
                              : 'bg-white border-neutral-200 text-ink hover:border-primary-300 hover:bg-neutral-50'
                          }`}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Bước 3: Địa chỉ & Người nhận trực tiếp */}
              <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="font-display font-bold text-lg text-ink">
                    Địa chỉ & Thông tin liên hệ
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Họ và tên người nhận"
                    htmlFor="recipientName"
                    required
                    error={errors.recipientName?.message}
                  >
                    <Input
                      {...register('recipientName')}
                      placeholder="Nguyễn Văn Khách"
                      leftIcon={<User className="w-4 h-4" />}
                    />
                  </FormField>

                  {/* Số điện thoại: TUYỆT ĐỐI KHÔNG PLACEHOLDER, KHÔNG HINT (Law 4) */}
                  <FormField
                    label="Số điện thoại người nhận"
                    htmlFor="recipientPhone"
                    required
                    error={errors.recipientPhone?.message}
                  >
                    <Input
                      {...register('recipientPhone')}
                      type="tel"
                      autoComplete="tel"
                      leftIcon={<Phone className="w-4 h-4" />}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Tỉnh / Thành phố"
                    htmlFor="city"
                    required
                    error={errors.city?.message}
                  >
                    <Input
                      {...register('city')}
                      placeholder="Hà Nội"
                      leftIcon={<MapPin className="w-4 h-4" />}
                    />
                  </FormField>

                  <FormField
                    label="Phường / Xã"
                    htmlFor="ward"
                    error={errors.ward?.message}
                  >
                    <Input
                      {...register('ward')}
                      placeholder="Dịch Vọng"
                    />
                  </FormField>
                </div>

                <FormField
                  label="Địa chỉ chi tiết (Số nhà, ngõ, tên đường)"
                  htmlFor="addressLine"
                  required
                  error={errors.addressLine?.message}
                >
                  <Input
                    {...register('addressLine')}
                    placeholder="Số 45 Cầu Giấy"
                  />
                </FormField>

                <FormField
                  label="Chỉ dẫn đường đi / Địa điểm cụ thể"
                  htmlFor="addressInstructions"
                  error={errors.addressInstructions?.message}
                >
                  <Input
                    {...register('addressInstructions')}
                    placeholder="Gửi xe ở tầng hầm B1, bấm chuông phòng 1204"
                  />
                </FormField>

                <FormField
                  label="Ghi chú cho thợ"
                  htmlFor="customerNote"
                  error={errors.customerNote?.message}
                >
                  <textarea
                    {...register('customerNote')}
                    id="customerNote"
                    rows={2}
                    placeholder="Cần thợ mang theo thang gấp, máy hút bụi công nghiệp..."
                    className="w-full rounded-md border border-neutral-300 px-3.5 py-2.5 text-sm font-sans text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </FormField>
              </div>
            </div>

            {/* Cột phải (5 cols) - Tóm tắt đơn & Bóc tách tài chính */}
            <div className="lg:col-span-5 sticky top-20 space-y-4">
              <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-5">
                <h3 className="font-display font-bold text-lg text-ink border-b border-neutral-100 pb-3">
                  Tóm tắt đơn đặt lịch
                </h3>

                {/* Service Card Thumbnail */}
                <div className="flex gap-3">
                  <img
                    src={selectedService.image}
                    alt=""
                    className="w-20 h-20 rounded-md object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-primary-600 uppercase">
                      {selectedService.categoryName}
                    </span>
                    <h4 className="font-semibold text-ink text-sm leading-snug mt-0.5 line-clamp-2">
                      {selectedService.title}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      Thực hiện: <strong className="text-ink">{selectedService.providerName}</strong>
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Thời lượng dự kiến: ~{selectedService.durationMinutes} phút
                    </p>
                  </div>
                </div>

                {/* Appointment Snapshot */}
                {appointmentRange && (
                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-700">
                      <Clock className="w-3.5 h-3.5 text-primary-500" />
                      <span className="text-neutral-500">Bắt đầu:</span>
                      <strong className="text-ink">{appointmentRange.startStr}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-700 pl-5">
                      <span className="text-neutral-500">Dự kiến xong:</span>
                      <strong className="text-ink">{appointmentRange.endStr}</strong>
                    </div>
                  </div>
                )}

                {/* Financial Breakdown Table */}
                <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Tổng giá dịch vụ:</span>
                    <span className="font-semibold text-ink text-base">
                      {formatVnd(pricing.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-600">
                    <span className="flex items-center gap-1">
                      <span>Tiền cọc giữ lịch (30%):</span>
                      <Info className="w-3.5 h-3.5 text-neutral-400" />
                    </span>
                    <span className="font-bold text-amber-600">
                      {formatVnd(pricing.deposit)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Thanh toán khi hoàn thành (70%):</span>
                    <span className="font-semibold text-ink">
                      {formatVnd(pricing.balance)}
                    </span>
                  </div>
                </div>

                {/* Deposit Refund Policy Note */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md text-xs text-amber-900 leading-relaxed space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                    <span>Chính sách đặt cọc minh bạch:</span>
                  </p>
                  <p className="text-[11px] text-amber-800">
                    - Sau khi thợ chấp nhận đơn, bạn sẽ tiến hành đặt cọc 30% ({formatVnd(pricing.deposit)}).
                  </p>
                  <p className="text-[11px] text-amber-800">
                    - Nếu thợ từ chối đơn: Hoàn 100% tiền cọc ngay lập tức.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    - Nếu bạn hủy trước giờ hẹn 30 phút: Hoàn 50% tiền cọc.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                  >
                    Xác nhận & Gửi yêu cầu đặt lịch
                  </Button>

                  {/* Demo Fallback Mode Button */}
                  <button
                    type="button"
                    onClick={handleDemoSubmit}
                    className="w-full py-2 px-3 rounded-md border border-dashed border-neutral-300 text-xs text-neutral-600 hover:text-primary-600 hover:border-primary-400 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Tạo đơn mô phỏng (Chế độ Demo khi DB chưa có lịch thợ)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateBookingPage
