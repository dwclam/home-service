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
  ShieldCheck,
  ArrowLeft,
  Send,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { createBookingSchema } from '../../features/booking/schemas'
import {
  generateClientRequestKey,
  getBookableServices,
  getCustomerSavedAddresses,
  createCustomerBooking,
} from '../../features/booking/api'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' đ'

// Mặc định ngày mai lúc 09:00 để luôn thỏa mãn quy tắc MD01 (>= 60 phút từ hiện tại)
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

export const CreateBookingPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedServiceId = Number(searchParams.get('serviceId')) || 1

  const [services, setServices] = useState([])
  const [addresses, setAddresses] = useState([])
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
        {/* Điều hướng quay lại & tiêu đề */}
        <div>
          <Link
            to="/customer/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Xem danh sách đơn đặt lịch của tôi</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Đặt lịch dịch vụ tại nhà (UC08)
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Chọn gói dịch vụ, khung giờ hẹn (cách hiện tại ít nhất 60 phút) và xác nhận địa chỉ phục vụ.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          noValidate
        >
          {/* Cột trái (2/3): Form chọn dịch vụ, thời gian, địa chỉ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bước 1: Chọn gói dịch vụ & thời gian */}
            <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5 sm:p-6 space-y-5">
              <div className="pb-3 border-b border-neutral-200">
                <h2 className="text-[17px] font-semibold text-ink">
                  1. Gói dịch vụ & Thời gian hẹn
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Quy tắc MD01: Thời điểm bắt đầu phải cách hiện tại tối thiểu 60 phút.
                </p>
              </div>

              <FormField
                label="Chọn gói dịch vụ"
                htmlFor="booking-service"
                required
                error={errors.serviceId?.message}
              >
                <select
                  id="booking-service"
                  value={watchedServiceId}
                  onChange={handleServiceSelectChange}
                  className="w-full h-10 px-3 text-[15px] font-sans text-ink bg-white rounded-md border border-neutral-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.title} — {formatVnd(srv.basePriceVnd)} (
                      {srv.durationMinutes} phút)
                    </option>
                  ))}
                </select>
              </FormField>

              {selectedService && (
                <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
                  <p className="font-semibold text-ink">
                    Nhà cung cấp: {selectedService.providerName} (ID: #
                    {selectedService.providerId})
                  </p>
                  <p className="leading-relaxed">
                    {selectedService.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  label="Ngày hẹn làm việc"
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
                  label="Giờ bắt đầu dự kiến"
                  htmlFor="appointmentTime"
                  required
                  error={errors.appointmentTime?.message}
                  hint={`Thời lượng dự kiến: ${selectedService?.durationMinutes || 60} phút`}
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

            {/* Bước 2: Địa chỉ thực hiện dịch vụ */}
            <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5 sm:p-6 space-y-5">
              <div className="pb-3 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-semibold text-ink">
                    2. Địa chỉ & Người liên hệ tại nơi làm việc
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Thông tin địa chỉ được chụp bất biến (Snapshot) vào đơn khi xác nhận đặt lịch.
                  </p>
                </div>

                <div className="inline-flex rounded-full bg-neutral-100 p-1 self-start">
                  <button
                    type="button"
                    onClick={() =>
                      setValue('addressMode', 'SAVED', { shouldValidate: true })
                    }
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      watchedAddressMode === 'SAVED'
                        ? 'bg-primary-500 text-white'
                        : 'text-neutral-700 hover:text-ink'
                    }`}
                  >
                    Sổ địa chỉ đã lưu
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setValue('addressMode', 'MANUAL', {
                        shouldValidate: true,
                      })
                    }
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      watchedAddressMode === 'MANUAL'
                        ? 'bg-primary-500 text-white'
                        : 'text-neutral-700 hover:text-ink'
                    }`}
                  >
                    Nhập địa chỉ mới
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
                              <span className="text-xs font-semibold text-primary-600">
                                ({addr.label})
                              </span>
                            </div>
                            <p className="text-neutral-600 mt-1">
                              {addr.addressLine}, {addr.ward}, {addr.city}
                            </p>
                            {addr.instructions && (
                              <p className="text-xs text-neutral-500 mt-1">
                                Hướng dẫn: {addr.instructions}
                              </p>
                            )}
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
                      label="Họ tên người liên hệ"
                      htmlFor="recipientName"
                      required
                      error={errors.recipientName?.message}
                    >
                      <Input
                        id="recipientName"
                        placeholder="Ví dụ: Lê Khách Mới"
                        leftIcon={<User className="w-4 h-4" />}
                        {...register('recipientName')}
                      />
                    </FormField>

                    <FormField
                      label="Số điện thoại liên hệ"
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
                        placeholder="Ví dụ: Dịch Vọng, Cầu Giấy"
                        {...register('ward')}
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Số nhà, ngõ, tên đường chi tiết"
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
                    label="Hướng dẫn tìm nhà / vào cổng (addressInstructions)"
                    htmlFor="addressInstructions"
                    error={errors.addressInstructions?.message}
                  >
                    <Input
                      id="addressInstructions"
                      placeholder="Ví dụ: Gửi xe tầng hầm B1, bấm chuông cửa số 2"
                      {...register('addressInstructions')}
                    />
                  </FormField>
                </div>
              )}

              <FormField
                label="Ghi chú công việc cho kỹ thuật viên (customerNote)"
                htmlFor="customerNote"
                error={errors.customerNote?.message}
              >
                <textarea
                  id="customerNote"
                  rows={3}
                  placeholder="Ví dụ: Nhà có trẻ nhỏ ngủ buổi trưa, xin gọi điện trước khi bấm chuông..."
                  className="w-full rounded-md border border-neutral-200 px-3 py-2.5 text-[15px] font-sans text-ink bg-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  {...register('customerNote')}
                />
              </FormField>
            </div>
          </div>

          {/* Cột phải (1/3): Snapshot Tài chính & Chính sách + Submit */}
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5 sm:p-6 space-y-5 sticky top-24">
              <div className="pb-3 border-b border-neutral-200">
                <h2 className="text-[17px] font-semibold text-ink flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-600" />
                  <span>Tóm tắt chi phí & Chính sách</span>
                </h2>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Tổng giá gói cố định:</dt>
                  <dd className="font-bold text-ink text-base">
                    {formatVnd(totalAmountVnd)}
                  </dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">
                    Đặt cọc giữ lịch (30%):
                  </dt>
                  <dd className="font-semibold text-primary-600">
                    {formatVnd(depositAmountVnd)}
                  </dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">
                    Thanh toán sau hoàn thành (70%):
                  </dt>
                  <dd className="font-medium text-ink">
                    {formatVnd(balanceAmountVnd)}
                  </dd>
                </div>
              </dl>

              {/* Chính sách hủy snapshot */}
              <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-200 space-y-2 text-xs text-neutral-600 leading-relaxed">
                <p className="font-semibold text-ink flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0" />
                  <span>Chính sách giữ lịch & hoàn cọc (UC08 / UC11)</span>
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Sau khi gửi yêu cầu, đơn ở trạng thái{' '}
                    <strong>Chờ xác nhận (PENDING_PROVIDER)</strong> và chưa thu tiền cọc.
                  </li>
                  <li>
                    Khi thợ nhận đơn, bạn có 15–30 phút để thanh toán cọc 30%.
                  </li>
                  <li>
                    Hủy trước giờ hẹn ≥ 30 phút: hoàn <strong>50%</strong> tiền cọc. Hủy sát giờ (&lt; 30 phút): hoàn <strong>0%</strong>.
                  </li>
                </ul>
              </div>

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
