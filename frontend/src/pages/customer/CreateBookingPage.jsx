import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  FileText,
  ArrowLeft,
  Send,
  CalendarClock,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { createBookingSchema } from '../../features/booking/schemas'
import {
  generateClientRequestKey,
  getBookableServices,
  getCustomerSavedAddresses,
  getServiceAvailableSlots,
  createCustomerBooking,
} from '../../features/booking/api'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' đ'

const getDefaultAppointmentParts = () => {
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000)
  const yyyy = tomorrow.getFullYear()
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const dd = String(tomorrow.getDate()).padStart(2, '0')
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: '09:00',
  }
}

const formatSlotLabelVi = (startsAtIso, endsAtIso) => {
  if (!startsAtIso || !endsAtIso) return '—'
  const start = new Date(startsAtIso)
  const end = new Date(endsAtIso)
  const datePart = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(start)
  const startTime = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(start)
  const endTime = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(end)
  return `${datePart} • ${startTime} – ${endTime}`
}

export const CreateBookingPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedServiceId = Number(searchParams.get('serviceId')) || 1

  const [services, setServices] = useState([])
  const [addresses, setAddresses] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [clientRequestKey] = useState(() => generateClientRequestKey())

  const defaultTimeParts = getDefaultAppointmentParts()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      serviceId: preselectedServiceId,
      providerId: 2,
      appointmentDate: defaultTimeParts.date,
      appointmentTime: defaultTimeParts.time,
      addressMode: 'SAVED',
      addressId: 1,
      recipientName: 'Nguyễn Văn Khách',
      recipientPhone: '0901234567',
      addressLine: '',
      ward: '',
      city: 'Hà Nội',
      addressInstructions: '',
      customerNote: '',
    },
  })

  const watchedServiceId = useWatch({ control, name: 'serviceId' })
  const watchedAddressMode = useWatch({ control, name: 'addressMode' })
  const watchedAddressId = useWatch({ control, name: 'addressId' })

  useEffect(() => {
    let isMounted = true
    const loadInitialOptions = async () => {
      const [srvList, addrList] = await Promise.all([
        getBookableServices(),
        getCustomerSavedAddresses(),
      ])
      if (!isMounted) return
      setServices(srvList)
      setAddresses(addrList)

      const matched =
        srvList.find((s) => s.id === Number(preselectedServiceId)) || srvList[0]
      if (matched) {
        setValue('serviceId', matched.id)
        setValue('providerId', matched.providerId)
      }
    }
    loadInitialOptions()
    return () => {
      isMounted = false
    }
  }, [preselectedServiceId, setValue])

  useEffect(() => {
    let isMounted = true
    const activeId = Number(watchedServiceId)
    if (!activeId) return

    const loadSlotsForService = async () => {
      setSlotsLoading(true)
      try {
        const res = await getServiceAvailableSlots(activeId)
        if (!isMounted) return
        setAvailableSlots(res.availableSlots || res.data?.availableSlots || [])
      } finally {
        if (isMounted) {
          setSlotsLoading(false)
        }
      }
    }
    loadSlotsForService()
    return () => {
      isMounted = false
    }
  }, [watchedServiceId])

  const selectedService =
    services.find((s) => s.id === Number(watchedServiceId)) || services[0]

  const handleServiceSelectChange = (e) => {
    const nextId = Number(e.target.value)
    setValue('serviceId', nextId, { shouldValidate: true })
    const found = services.find((s) => s.id === nextId)
    if (found) {
      setValue('providerId', found.providerId, { shouldValidate: true })
    }
  }

  const handlePickSlot = (slot) => {
    if (!slot?.startsAt) return
    const dt = new Date(slot.startsAt)
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    const hh = String(dt.getHours()).padStart(2, '0')
    const mi = String(dt.getMinutes()).padStart(2, '0')
    setValue('appointmentDate', `${yyyy}-${mm}-${dd}`, { shouldValidate: true })
    setValue('appointmentTime', `${hh}:${mi}`, { shouldValidate: true })
    toast.success('Đã chọn khung giờ.')
  }

  const totalAmountVnd = selectedService?.basePriceVnd || 350000
  const depositAmountVnd = Math.round(totalAmountVnd * 0.3)
  const balanceAmountVnd = totalAmountVnd - depositAmountVnd

  const onSubmit = async (values) => {
    try {
      const startsAtIso = new Date(
        `${values.appointmentDate}T${values.appointmentTime}:00`
      ).toISOString()

      const payload = {
        clientRequestKey,
        providerId: selectedService?.providerId || Number(values.providerId),
        serviceId: Number(values.serviceId),
        startsAt: startsAtIso,
        customerNote: values.customerNote,
      }

      if (values.addressMode === 'SAVED') {
        payload.addressId = Number(values.addressId)
      } else {
        payload.recipientName = values.recipientName
        payload.recipientPhone = values.recipientPhone
        payload.addressLine = values.addressLine
        payload.ward = values.ward
        payload.city = values.city
        payload.addressInstructions = values.addressInstructions
      }

      const result = await createCustomerBooking(payload)
      toast.success(
        `${result.message}: Mã đơn ${result.data.bookingCode}`
      )
      navigate('/customer/bookings', {
        state: { highlightBookingId: result.data.id },
      })
    } catch (error) {
      const apiErr = error?.response?.data
      if (apiErr?.fieldErrors && typeof apiErr.fieldErrors === 'object') {
        Object.entries(apiErr.fieldErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: String(msg) })
        })
      }
      toast.error(
        apiErr?.message ||
          error?.message ||
          'Không thể tạo yêu cầu đặt lịch. Vui lòng kiểm tra lại thông tin.'
      )
    }
  }

  return (
    <div className="bg-neutral-50 min-h-[calc(100vh-64px)] py-8 sm:py-10 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <Link
            to="/customer/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Đơn đặt của tôi</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Đặt lịch dịch vụ
          </h1>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          noValidate
        >
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5 sm:p-6 space-y-5">
              <div className="pb-3 border-b border-neutral-200">
                <h2 className="text-[17px] font-semibold text-ink">
                  1. Dịch vụ & Thời gian hẹn
                </h2>
              </div>

              <FormField
                label="Chọn gói dịch vụ"
                htmlFor="booking-service"
                required
                error={errors.serviceId?.message}
              >
                <Select
                  id="booking-service"
                  value={watchedServiceId}
                  onChange={handleServiceSelectChange}
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.title} — {formatVnd(srv.basePriceVnd)}
                    </option>
                  ))}
                </Select>
              </FormField>

              {selectedService && (
                <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
                  <p className="font-semibold text-ink">
                    Nhà cung cấp: {selectedService.providerName}
                  </p>
                  <p className="leading-relaxed">
                    {selectedService.description}
                  </p>
                </div>
              )}

              {!slotsLoading && availableSlots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-primary-600" />
                    <span>Khung giờ trống gợi ý</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot, idx) => (
                      <Button
                        key={slot.id || idx}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePickSlot(slot)}
                      >
                        {formatSlotLabelVi(slot.startsAt, slot.endsAt)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  label="Ngày hẹn"
                  htmlFor="appointmentDate"
                  required
                  error={errors.appointmentDate?.message}
                >
                  <Input
                    id="appointmentDate"
                    type="date"
                    leftIcon={<Calendar className="w-4 h-4" />}
                    {...register('appointmentDate')}
                  />
                </FormField>

                <FormField
                  label="Giờ bắt đầu"
                  htmlFor="appointmentTime"
                  required
                  error={errors.appointmentTime?.message}
                >
                  <Input
                    id="appointmentTime"
                    type="time"
                    leftIcon={<Clock className="w-4 h-4" />}
                    {...register('appointmentTime')}
                  />
                </FormField>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5 sm:p-6 space-y-5">
              <div className="pb-3 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-[17px] font-semibold text-ink">
                  2. Địa chỉ phục vụ
                </h2>

                <div className="inline-flex rounded-md bg-neutral-100 border border-neutral-200 p-1 self-start">
                  <button
                    type="button"
                    onClick={() =>
                      setValue('addressMode', 'SAVED', { shouldValidate: true })
                    }
                    className={`px-3 h-7 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      watchedAddressMode === 'SAVED'
                        ? 'bg-white text-ink shadow-xs'
                        : 'text-neutral-600 hover:text-ink'
                    }`}
                  >
                    Địa chỉ đã lưu
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setValue('addressMode', 'MANUAL', {
                        shouldValidate: true,
                      })
                    }
                    className={`px-3 h-7 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      watchedAddressMode === 'MANUAL'
                        ? 'bg-white text-ink shadow-xs'
                        : 'text-neutral-600 hover:text-ink'
                    }`}
                  >
                    Địa chỉ mới
                  </button>
                </div>
              </div>

              {watchedAddressMode === 'SAVED' ? (
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const isSelected = Number(watchedAddressId) === addr.id
                    return (
                      <label
                        key={addr.id}
                        className={`block p-4 rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/40'
                            : 'border-neutral-200 bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            value={addr.id}
                            checked={isSelected}
                            onChange={() =>
                              setValue('addressId', addr.id, {
                                shouldValidate: true,
                              })
                            }
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink">
                                {addr.recipientName}
                              </span>
                              <span className="text-neutral-400">•</span>
                              <span className="font-medium text-neutral-700">
                                {addr.recipientPhone}
                              </span>
                            </div>
                            <p className="text-neutral-600 mt-1">
                              {addr.addressLine}, {addr.ward}, {addr.city}
                            </p>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                  {errors.addressId && (
                    <p className="text-xs text-red-500">
                      {errors.addressId.message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      label="Người liên hệ"
                      htmlFor="recipientName"
                      required
                      error={errors.recipientName?.message}
                    >
                      <Input
                        id="recipientName"
                        placeholder="Nguyễn Văn An"
                        leftIcon={<User className="w-4 h-4" />}
                        {...register('recipientName')}
                      />
                    </FormField>

                    <FormField
                      label="Số điện thoại"
                      htmlFor="recipientPhone"
                      required
                      error={errors.recipientPhone?.message}
                    >
                      <Input
                        id="recipientPhone"
                        placeholder="0988776655"
                        leftIcon={<Phone className="w-4 h-4" />}
                        {...register('recipientPhone')}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      label="Tỉnh / Thành phố"
                      htmlFor="city"
                      required
                      error={errors.city?.message}
                    >
                      <Input
                        id="city"
                        placeholder="Hà Nội"
                        leftIcon={<MapPin className="w-4 h-4" />}
                        {...register('city')}
                      />
                    </FormField>

                    <FormField
                      label="Phường / Xã"
                      htmlFor="ward"
                      error={errors.ward?.message}
                    >
                      <Input
                        id="ward"
                        placeholder="Dịch Vọng, Cầu Giấy"
                        {...register('ward')}
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Địa chỉ chi tiết"
                    htmlFor="addressLine"
                    required
                    error={errors.addressLine?.message}
                  >
                    <Input
                      id="addressLine"
                      placeholder="Số 45 đường Cầu Giấy..."
                      {...register('addressLine')}
                    />
                  </FormField>

                  <FormField
                    label="Hướng dẫn tìm nhà"
                    htmlFor="addressInstructions"
                    error={errors.addressInstructions?.message}
                  >
                    <Input
                      id="addressInstructions"
                      placeholder="Gửi xe tầng hầm B1, bấm chuông cửa số 2"
                      {...register('addressInstructions')}
                    />
                  </FormField>
                </div>
              )}

              <FormField
                label="Ghi chú cho kỹ thuật viên"
                htmlFor="customerNote"
                error={errors.customerNote?.message}
              >
                <textarea
                  id="customerNote"
                  rows={3}
                  placeholder="Ghi chú thêm về yêu cầu công việc..."
                  className="w-full rounded-md border border-neutral-200 px-3 py-2.5 text-[15px] font-sans text-ink bg-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  {...register('customerNote')}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5 sm:p-6 space-y-5 sticky top-24">
              <div className="pb-3 border-b border-neutral-200">
                <h2 className="text-[17px] font-semibold text-ink flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-600" />
                  <span>Tóm tắt chi phí</span>
                </h2>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Tổng giá gói:</dt>
                  <dd className="font-bold text-ink text-base">
                    {formatVnd(totalAmountVnd)}
                  </dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Đặt cọc giữ lịch:</dt>
                  <dd className="font-semibold text-primary-600">
                    {formatVnd(depositAmountVnd)}
                  </dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Thanh toán sau hoàn thành:</dt>
                  <dd className="font-medium text-ink">
                    {formatVnd(balanceAmountVnd)}
                  </dd>
                </div>
              </dl>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Xác nhận đặt lịch
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateBookingPage
