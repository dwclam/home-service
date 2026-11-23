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
  Info,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Wrench,
} from 'lucide-react'

import {
  searchCustomerServices,
  getCustomerServiceDetail,
  getCustomerServiceAvailableSlots,
} from '../../features/catalog/customerCatalogApi'
import { createBookingSchema } from '../../features/booking/schemas'
import { createBooking, generateClientRequestKey } from '../../features/booking/api'
import { useAuthStore } from '../../features/auth/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FormField } from '../../components/ui/FormField'
import { EmptyState } from '../../components/ui/EmptyState'

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' đ'

const formatDateShortVi = (dateKey) => {
  if (!dateKey) return ''
  try {
    const [y, m, d] = dateKey.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return dateKey
  }
}

export const CreateBookingPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { account } = useAuthStore()

  const queryServiceId = searchParams.get('serviceId')
    ? Number(searchParams.get('serviceId'))
    : null
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

  const todayStr = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const [services, setServices] = useState([])
  const [selectedServiceId, setSelectedServiceId] = useState(queryServiceId)
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [servicesError, setServicesError] = useState('')
  const [servicesReloadTick, setServicesReloadTick] = useState(0)

  const [slotsState, setSlotsState] = useState({
    serviceId: null,
    data: null,
    error: '',
  })
  const [nowTimestamp] = useState(() => Date.now())

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
      serviceId: queryServiceId || '',
      providerId: '',
      bookingDate: queryDate || todayStr,
      bookingTime: queryTime || '',
      recipientName: account?.displayName || '',
      recipientPhone: account?.phone || '',
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

  // Tải danh sách dịch vụ thật từ Backend (UC05 + UC06 nếu có serviceId trên URL)
  useEffect(() => {
    let isMounted = true

    const fetchServices = async () => {
      try {
        const res = await searchCustomerServices({ page: 0, size: 50 })
        let list = res.items || []

        if (queryServiceId && !list.some((item) => Number(item.id) === queryServiceId)) {
          try {
            const detail = await getCustomerServiceDetail(queryServiceId)
            if (detail?.id) {
              list = [detail, ...list]
            }
          } catch {
            // Dịch vụ trong URL không tồn tại hoặc chưa công khai
          }
        }

        if (!isMounted) return
        setServices(list)
        setServicesError('')

        if (list.length > 0) {
          setSelectedServiceId((prev) => {
            if (prev && list.some((s) => Number(s.id) === Number(prev))) {
              return prev
            }
            return list[0].id
          })
        }
      } catch (error) {
        if (!isMounted) return
        setServicesError(
          error?.response?.data?.message ||
            'Không thể tải danh sách dịch vụ từ hệ thống.'
        )
      } finally {
        if (isMounted) setIsLoadingServices(false)
      }
    }

    fetchServices()
    return () => {
      isMounted = false
    }
  }, [queryServiceId, servicesReloadTick])

  const selectedService = useMemo(() => {
    if (!services.length) return null
    return (
      services.find((s) => Number(s.id) === Number(selectedServiceId)) ||
      services[0]
    )
  }, [services, selectedServiceId])

  const activeServiceId = selectedService?.id ?? null

  // Đồng bộ serviceId và providerId vào form khi chọn dịch vụ
  useEffect(() => {
    if (!selectedService) return
    setValue('serviceId', selectedService.id)
    setValue('providerId', selectedService.providerId)
  }, [selectedService, setValue])

  // Tải lịch rảnh thật của NCC cho dịch vụ đang chọn (UC38)
  useEffect(() => {
    if (!activeServiceId) return
    let isMounted = true

    getCustomerServiceAvailableSlots(activeServiceId)
      .then((data) => {
        if (isMounted) {
          setSlotsState({
            serviceId: activeServiceId,
            data: data || null,
            error: '',
          })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSlotsState({
            serviceId: activeServiceId,
            data: null,
            error:
              error?.response?.data?.message ||
              'Không thể tải lịch rảnh của nhà cung cấp.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [activeServiceId])

  const isLoadingSlots =
    Boolean(activeServiceId) && slotsState.serviceId !== activeServiceId
  const slotsData =
    slotsState.serviceId === activeServiceId ? slotsState.data : null
  const slotsError =
    slotsState.serviceId === activeServiceId ? slotsState.error : ''

  // Nhóm các khoảng lịch rảnh theo ngày (YYYY-MM-DD theo giờ địa phương)
  const slotsByDate = useMemo(() => {
    const list = slotsData?.availableSlots || []
    const grouped = {}
    list.forEach((slot) => {
      const start = new Date(slot.startsAt)
      if (Number.isNaN(start.getTime())) return
      const y = start.getFullYear()
      const m = String(start.getMonth() + 1).padStart(2, '0')
      const d = String(start.getDate()).padStart(2, '0')
      const key = `${y}-${m}-${d}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(slot)
    })
    return grouped
  }, [slotsData])

  const availableDateKeys = useMemo(
    () => Object.keys(slotsByDate).sort(),
    [slotsByDate]
  )

  // Sinh các mốc giờ bắt đầu hợp lệ cho ngày đang chọn từ khoảng rảnh thật của NCC
  const availableTimesForSelectedDate = useMemo(() => {
    if (!watchDate || !slotsByDate[watchDate] || !selectedService) return []
    const duration =
      slotsData?.durationMinutes || selectedService.durationMinutes || 60
    const minAllowedTime = nowTimestamp + 60 * 60 * 1000
    const times = new Set()

    slotsByDate[watchDate].forEach((range) => {
      const rangeStart = new Date(range.startsAt).getTime()
      const rangeEnd = new Date(range.endsAt).getTime()
      const maxStart = rangeEnd - duration * 60 * 1000
      if (maxStart >= rangeStart) {
        for (let t = rangeStart; t <= maxStart; t += 30 * 60 * 1000) {
          if (t >= minAllowedTime) {
            const dateObj = new Date(t)
            const hh = String(dateObj.getHours()).padStart(2, '0')
            const mm = String(dateObj.getMinutes()).padStart(2, '0')
            times.add(`${hh}:${mm}`)
          }
        }
      }
    })

    return Array.from(times).sort()
  }, [watchDate, slotsByDate, selectedService, slotsData, nowTimestamp])

  useEffect(() => {
    if (queryDate) setValue('bookingDate', queryDate)
    if (queryTime) setValue('bookingTime', queryTime)
  }, [queryDate, queryTime, setValue])

  const appointmentRange = useMemo(() => {
    if (!watchDate || !watchTime || !selectedService) return null
    try {
      const start = new Date(`${watchDate}T${watchTime}:00`)
      if (Number.isNaN(start.getTime())) return null
      const duration =
        slotsData?.durationMinutes || selectedService.durationMinutes || 60
      const end = new Date(start.getTime() + duration * 60 * 1000)
      const formatTime = (d) =>
        d.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      const formatDate = (d) =>
        d.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      return {
        startStr: `${formatTime(start)} ngày ${formatDate(start)}`,
        endStr: formatTime(end),
      }
    } catch {
      return null
    }
  }, [watchDate, watchTime, selectedService, slotsData])

  const pricing = useMemo(() => {
    const total = Number(
      slotsData?.basePriceVnd ?? selectedService?.basePriceVnd ?? 0
    )
    const deposit = Math.round((total * 30) / 100)
    const balance = total - deposit
    return { total, deposit, balance }
  }, [selectedService, slotsData])

  const onSubmit = async (values) => {
    const appointmentDate = new Date(`${values.bookingDate}T${values.bookingTime}:00`)
    const startsAtIso = appointmentDate.toISOString()

    const payload = {
      clientRequestKey: generateClientRequestKey(),
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
      navigate(`/customer/bookings/${response.id}`, {
        state: { booking: response },
      })
    } catch (error) {
      const errorData = error.response?.data
      const message =
        errorData?.message ||
        'Không thể gửi đơn đặt lịch lúc này. Vui lòng thử lại.'
      toast.error(message)

      const fieldErrors = errorData?.fieldErrors
      if (
        fieldErrors &&
        typeof fieldErrors === 'object' &&
        Object.keys(fieldErrors).length > 0
      ) {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: msg })
        })
      }

      if (error.response?.status === 400 && errorData?.message) {
        setError('bookingTime', { type: 'server', message: errorData.message })
      }
    }
  }

  if (isLoadingServices) {
    return (
      <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-7xl mx-auto flex items-center justify-center py-24 text-sm text-neutral-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          <span>Đang tải danh sách dịch vụ khả dụng...</span>
        </div>
      </div>
    )
  }

  if (servicesError) {
    return (
      <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-xl mx-auto bg-white border border-neutral-200 rounded-md p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-neutral-700">{servicesError}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsLoadingServices(true)
              setServicesReloadTick((prev) => prev + 1)
            }}
          >
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  if (!selectedService) {
    return (
      <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-md">
          <EmptyState
            title="Chưa có dịch vụ nào khả dụng để đặt lịch"
            description="Hiện chưa có gói dịch vụ công khai trên hệ thống. Vui lòng quay lại sau."
            action={
              <Link to="/services">
                <Button variant="primary" size="sm">
                  Khám phá dịch vụ
                </Button>
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách dịch vụ</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mt-2">
            Đặt lịch dịch vụ tại nhà
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              {/* Bước 1: Chọn gói dịch vụ từ dữ liệu thật */}
              <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
                <h2 className="font-display font-bold text-lg text-ink border-b border-neutral-100 pb-3">
                  Chọn gói dịch vụ
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {services.map((service) => {
                    const isSelected = Number(selectedService.id) === Number(service.id)
                    const coverImage = service.images?.[0]?.imageUrl
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(service.id)
                          setValue('bookingTime', '')
                        }}
                        className={`flex gap-3 p-3 text-left rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500 shadow-xs'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt=""
                            className="w-14 h-14 rounded-md object-cover shrink-0 bg-neutral-100"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-md bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                            <Wrench className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-primary-600 uppercase truncate">
                            {service.categoryName || 'Dịch vụ'}
                          </p>
                          <h3 className="text-xs font-semibold text-ink line-clamp-1 mt-0.5">
                            {service.title}
                          </h3>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {service.providerName || 'Nhà cung cấp'}
                          </p>
                          <p className="text-xs font-bold text-primary-600 mt-1 tabular-nums">
                            {formatVnd(service.basePriceVnd)} · {service.durationMinutes} phút
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bước 2: Chọn Ngày & Giờ hẹn theo lịch rảnh thật (UC38) */}
              <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-5">
                <h2 className="font-display font-bold text-lg text-ink border-b border-neutral-100 pb-3">
                  Chọn ngày & khung giờ hẹn
                </h2>

                {isLoadingSlots ? (
                  <div className="flex items-center gap-2 text-xs text-neutral-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                    <span>Đang kiểm tra lịch rảnh của nhà cung cấp...</span>
                  </div>
                ) : slotsError ? (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    {slotsError}
                  </div>
                ) : availableDateKeys.length > 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-neutral-600">
                        Ngày có lịch rảnh
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {availableDateKeys.map((dateKey) => {
                          const isSelected = watchDate === dateKey
                          return (
                            <button
                              key={dateKey}
                              type="button"
                              onClick={() => {
                                clearErrors('bookingDate')
                                clearErrors('bookingTime')
                                setValue('bookingDate', dateKey, {
                                  shouldValidate: true,
                                })
                                setValue('bookingTime', '')
                              }}
                              className={`h-9 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-primary-500 border-primary-500 text-white font-semibold'
                                  : 'bg-white border-neutral-200 text-ink hover:border-primary-300 hover:bg-neutral-50'
                              }`}
                            >
                              {formatDateShortVi(dateKey)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {availableTimesForSelectedDate.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-neutral-600">
                          Khung giờ rảnh khả dụng
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {availableTimesForSelectedDate.map((slot) => {
                            const isSelected = watchTime === slot
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => {
                                  setValue('bookingTime', slot, {
                                    shouldValidate: true,
                                    shouldTouch: true,
                                  })
                                }}
                                className={`h-9 px-3 text-center rounded-md text-xs font-medium border transition-colors cursor-pointer tabular-nums ${
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
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                    Nhà cung cấp hiện chưa mở khung giờ rảnh phù hợp trong thời gian tới.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                  <FormField
                    label="Ngày thực hiện"
                    htmlFor="bookingDate"
                    required
                    error={errors.bookingDate?.message}
                  >
                    <Input
                      {...register('bookingDate', {
                        onChange: () => {
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
                    error={errors.bookingTime?.message}
                  >
                    <Input
                      {...register('bookingTime', {
                        onChange: () => {
                          trigger('bookingTime')
                        },
                      })}
                      id="bookingTime"
                      type="time"
                      hasError={Boolean(errors.bookingTime)}
                      leftIcon={<Clock className="w-4 h-4" />}
                    />
                  </FormField>
                </div>
              </div>

              {/* Bước 3: Địa chỉ & Người nhận */}
              <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
                <h2 className="font-display font-bold text-lg text-ink border-b border-neutral-100 pb-3">
                  Địa chỉ & Thông tin liên hệ
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Họ và tên người nhận"
                    htmlFor="recipientName"
                    required
                    error={errors.recipientName?.message}
                  >
                    <Input
                      {...register('recipientName')}
                      placeholder="Nguyễn Văn An"
                      leftIcon={<User className="w-4 h-4" />}
                    />
                  </FormField>

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
                    <Input {...register('ward')} placeholder="Dịch Vọng" />
                  </FormField>
                </div>

                <FormField
                  label="Địa chỉ chi tiết"
                  htmlFor="addressLine"
                  required
                  error={errors.addressLine?.message}
                >
                  <Input
                    {...register('addressLine')}
                    placeholder="Số nhà, ngõ, tên đường"
                  />
                </FormField>

                <FormField
                  label="Chỉ dẫn đường đi"
                  htmlFor="addressInstructions"
                  error={errors.addressInstructions?.message}
                >
                  <Input
                    {...register('addressInstructions')}
                    placeholder="Ví dụ: Gửi xe tầng hầm B1, bấm chuông phòng 1204"
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
                    placeholder="Ghi chú thêm về thiết bị hoặc yêu cầu đặc biệt..."
                    className="w-full rounded-md border border-neutral-300 px-3.5 py-2.5 text-sm font-sans text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </FormField>
              </div>
            </div>

            {/* Cột phải: Tóm tắt đơn */}
            <div className="lg:col-span-5 sticky top-20 space-y-4">
              <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-5">
                <h3 className="font-display font-bold text-lg text-ink border-b border-neutral-100 pb-3">
                  Tóm tắt đơn đặt lịch
                </h3>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-primary-600 uppercase">
                    {selectedService.categoryName || 'Dịch vụ'}
                  </span>
                  <h4 className="font-semibold text-ink text-sm leading-snug">
                    {selectedService.title}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Thực hiện:{' '}
                    <strong className="text-ink">
                      {slotsData?.provider?.businessName ||
                        selectedService.providerName ||
                        'Nhà cung cấp'}
                    </strong>
                  </p>
                  <p className="text-xs text-neutral-400">
                    Thời lượng dự kiến: {slotsData?.durationMinutes || selectedService.durationMinutes} phút
                  </p>
                </div>

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

                <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Tổng giá dịch vụ</span>
                    <span className="font-semibold text-ink text-base tabular-nums">
                      {formatVnd(pricing.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-600">
                    <span className="flex items-center gap-1">
                      <span>Tiền cọc giữ lịch</span>
                      <Info className="w-3.5 h-3.5 text-neutral-400" />
                    </span>
                    <span className="font-bold text-amber-600 tabular-nums">
                      {formatVnd(pricing.deposit)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Phần còn lại khi hoàn thành</span>
                    <span className="font-semibold text-ink tabular-nums">
                      {formatVnd(pricing.balance)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4 text-xs text-neutral-500 leading-relaxed space-y-1">
                  <p className="font-medium text-neutral-700">
                    Chính sách đặt cọc
                  </p>
                  <p>
                    • Sau khi nhà cung cấp chấp nhận đơn, đặt cọc 30% (
                    <span className="tabular-nums">{formatVnd(pricing.deposit)}</span>).
                  </p>
                  <p>• Nhà cung cấp từ chối hoặc hủy đơn: hoàn 100% tiền cọc.</p>
                  <p>• Khách hủy trước giờ hẹn từ 30 phút: hoàn 50% tiền cọc.</p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                  >
                    Xác nhận & Gửi yêu cầu đặt lịch
                  </Button>
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
