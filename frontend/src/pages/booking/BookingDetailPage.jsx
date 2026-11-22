import { useState, useEffect, useMemo } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  AlertTriangle,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  CreditCard,
  Building,
} from 'lucide-react'

import { getBookingDetail, cancelBooking } from '../../features/booking/api'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { StatusText } from '../../components/ui/StatusText'

const STATUS_BADGE_MAP = {
  PENDING_PROVIDER: {
    label: 'Đang chờ thợ xác nhận',
    tone: 'warning',
    icon: Clock,
  },
  PENDING_DEPOSIT: {
    label: 'Chờ đặt cọc',
    tone: 'warning',
    icon: Clock,
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    tone: 'info',
    icon: CheckCircle2,
  },
  IN_PROGRESS: {
    label: 'Đang thực hiện',
    tone: 'primary',
    icon: Loader2,
    spin: true,
  },
  WAITING_CONFIRMATION: {
    label: 'Chờ xác nhận hoàn thành',
    tone: 'info',
    icon: Clock,
  },
  COMPLETED: {
    label: 'Hoàn thành',
    tone: 'success',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Đã hủy',
    tone: 'neutral',
    icon: XCircle,
  },
  REJECTED: {
    label: 'Đã từ chối',
    tone: 'danger',
    icon: XCircle,
  },
  EXPIRED: {
    label: 'Đã hết hạn',
    tone: 'neutral',
    icon: Clock,
  },
}

const getStatusBadge = (status) => {
  return (
    STATUS_BADGE_MAP[status] || {
      label: 'Đang cập nhật',
      tone: 'neutral',
      icon: Clock,
    }
  )
}

const formatVnd = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ'
}

const formatDateTime = (isoStr) => {
  if (!isoStr) return '-'
  try {
    const d = new Date(isoStr)
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoStr
  }
}

const calculateRemainingSeconds = (targetIso, status) => {
  if (!targetIso || status !== 'PENDING_PROVIDER') return 0
  try {
    return Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000))
  } catch {
    return 0
  }
}

export const BookingDetailPage = () => {
  const { bookingId } = useParams()
  const location = useLocation()

  const [booking, setBooking] = useState(location.state?.booking || null)
  const [isLoading, setIsLoading] = useState(!location.state?.booking)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  // Tải thông tin đơn hàng
  useEffect(() => {
    let isMounted = true
    const fetchBooking = async () => {
      try {
        const data = await getBookingDetail(bookingId)
        if (isMounted) setBooking(data)
      } catch (error) {
        console.warn('Lỗi lấy thông tin đơn:', error)
        if (isMounted) {
          toast.error('Không tìm thấy thông tin đơn đặt lịch.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchBooking()
    return () => {
      isMounted = false
    }
  }, [bookingId])

  // Đóng Modal hủy đơn bằng phím Escape khi không đang gửi yêu cầu
  useEffect(() => {
    if (!cancelModalOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isCancelling) {
        setCancelModalOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [cancelModalOpen, isCancelling])

  // Đếm ngược thời gian phản hồi của nhà cung cấp (requestExpiresAt)
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calculateRemainingSeconds(
      location.state?.booking?.requestExpiresAt,
      location.state?.booking?.status
    )
  )

  useEffect(() => {
    if (!booking?.requestExpiresAt || booking.status !== 'PENDING_PROVIDER') {
      return
    }

    const timer = setInterval(() => {
      setRemainingSeconds(() => {
        const expires = new Date(booking.requestExpiresAt).getTime()
        const now = Date.now()
        const diff = Math.max(0, Math.floor((expires - now) / 1000))
        if (diff <= 0) {
          clearInterval(timer)
          return 0
        }
        return diff
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [booking?.requestExpiresAt, booking?.status])

  const countdownFormatted = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [remainingSeconds])

  // Xử lý xác nhận hủy đơn
  const handleConfirmCancel = async () => {
    if (!booking) return
    setIsCancelling(true)
    try {
      const updated = await cancelBooking(booking.id, {
        version: booking.version ?? 0,
        reason: cancelReason,
      })
      setBooking(updated)
      setCancelModalOpen(false)
      toast.success('Hủy đơn đặt lịch thành công!')
    } catch (error) {
      const errorData = error.response?.data
      toast.error(errorData?.message || 'Không thể hủy đơn đặt lịch lúc này.')
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 font-sans">
        <p className="text-sm text-neutral-500">Đang tải thông tin đơn đặt lịch...</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 font-sans text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-neutral-400" />
        <h2 className="text-xl font-bold font-display text-ink">
          Không tìm thấy đơn đặt lịch
        </h2>
        <p className="text-sm text-neutral-500 max-w-sm">
          Đơn đặt lịch không tồn tại hoặc đã bị xóa. Vui lòng kiểm tra lại đường dẫn.
        </p>
        <Link to="/">
          <Button variant="primary">Quay về trang chủ</Button>
        </Link>
      </div>
    )
  }

  const isPending = booking.status === 'PENDING_PROVIDER'
  const isCancelled = booking.status === 'CANCELLED'
  const statusBadge = getStatusBadge(booking.status)

  return (
    <>
      <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Navigation Breadcrumb */}
          <div className="flex items-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về trang chủ</span>
            </Link>
          </div>

          {/* Booking Main Header Card */}
          <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <span className="text-xs text-neutral-500">
                  Mã đơn đặt lịch
                </span>
                <h1 className="text-2xl font-mono font-bold text-ink tracking-tight mt-0.5 tabular-nums">
                  {booking.bookingCode || `BK-${booking.id}`}
                </h1>
              </div>

              {/* Trạng thái không nền, không viền */}
              <div>
                <StatusText
                  icon={statusBadge.icon}
                  label={statusBadge.label}
                  tone={statusBadge.tone}
                  spin={Boolean(statusBadge.spin)}
                />
              </div>
            </div>

            {/* Countdown timer for PENDING_PROVIDER */}
            {isPending && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-900">
                      Thời gian còn lại để thợ phản hồi:
                    </p>
                    <p className="text-sm text-amber-800">
                      Nếu thợ không phản hồi trước thời hạn, đơn sẽ tự động hủy và hoàn cọc 100%.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-2xl font-bold text-amber-700 tabular-nums">
                    {countdownFormatted}
                  </span>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="border-t border-neutral-100 pt-3 text-xs text-neutral-600 space-y-1">
                <p className="font-semibold text-ink">Đơn đã được hủy thành công.</p>
                {booking.cancelReason && (
                  <p>
                    Lý do hủy: <span className="text-neutral-700">{booking.cancelReason}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2-Column Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Thông tin dịch vụ & Thời gian */}
            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
              <h2 className="font-display font-bold text-base text-ink border-b border-neutral-100 pb-2">
                Dịch vụ & Lịch hẹn
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-400">Tên gói dịch vụ:</p>
                  <p className="font-semibold text-ink text-base">
                    {booking.serviceTitle || 'Dịch vụ tại nhà'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-neutral-700">
                  <Building className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="text-neutral-500">Nhà cung cấp:</span>
                  <span className="font-semibold text-ink">
                    {booking.providerName || `Đối tác #${booking.providerId}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-neutral-700">
                  <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="text-neutral-500">Giờ bắt đầu:</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatDateTime(booking.startsAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-neutral-700">
                  <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="text-neutral-500">Dự kiến kết thúc:</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatDateTime(booking.endsAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Địa chỉ thực hiện & Người nhận */}
            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
              <h2 className="font-display font-bold text-base text-ink border-b border-neutral-100 pb-2">
                Địa chỉ & Người nhận
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-neutral-700">
                  <User className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="text-neutral-500">Người nhận:</span>
                  <span className="font-semibold text-ink">{booking.recipientName}</span>
                </div>

                <div className="flex items-center gap-2 text-neutral-700">
                  <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="text-neutral-500">Số điện thoại:</span>
                  <span className="font-semibold text-ink tabular-nums">{booking.recipientPhone}</span>
                </div>

                <div className="flex items-start gap-2 text-neutral-700">
                  <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-500">Địa chỉ: </span>
                    <span className="font-medium text-ink">
                      {booking.addressLine}
                      {booking.ward ? `, ${booking.ward}` : ''}
                      {booking.city ? `, ${booking.city}` : ''}
                    </span>
                  </div>
                </div>

                {booking.addressInstructions && (
                  <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-600 leading-relaxed">
                    <span className="font-semibold text-neutral-700">Chỉ dẫn: </span>
                    {booking.addressInstructions}
                  </p>
                )}

                {booking.customerNote && (
                  <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-600 leading-relaxed">
                    <span className="font-semibold text-neutral-700">Ghi chú: </span>
                    {booking.customerNote}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table Card */}
          <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h2 className="font-display font-bold text-base text-ink">
                Chi tiết thanh toán
              </h2>
              <CreditCard className="w-4 h-4 text-neutral-400" />
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-neutral-600">
                <span>Tổng giá dịch vụ:</span>
                <span className="font-semibold text-ink text-base tabular-nums">
                  {formatVnd(booking.totalAmountVnd)}
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-600">
                <span>Tiền cọc giữ lịch ({booking.depositPercent || 30}%):</span>
                <span className="font-bold text-amber-600 text-base tabular-nums">
                  {formatVnd(booking.depositAmountVnd)}
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-600 border-t border-neutral-100 pt-2.5">
                <span>Số tiền còn lại thanh toán khi hoàn thành (70%):</span>
                <span className="font-semibold text-ink tabular-nums">
                  {formatVnd(booking.balanceAmountVnd)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link to="/booking/new" className="w-full sm:w-auto">
                <Button variant="secondary" size="md" fullWidth>
                  Đặt dịch vụ khác
                </Button>
              </Link>
            </div>

            {/* Action Cancel Order (UC11) */}
            {isPending && (
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={() => setCancelModalOpen(true)}
                leftIcon={<AlertTriangle className="w-4 h-4" />}
              >
                Hủy đơn đặt lịch
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Hủy Đơn Đặt Lịch */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-md shadow-xl border border-neutral-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-display font-bold text-base text-ink">
                  Xác nhận hủy đơn đặt lịch
                </h3>
              </div>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelModalOpen(false)}
                aria-label="Đóng cửa sổ hủy đơn"
                className="text-neutral-400 hover:text-ink cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-600 leading-relaxed">
                Bạn có chắc chắn muốn hủy đơn đặt lịch{' '}
                <strong className="text-ink">{booking.bookingCode}</strong> không?
              </p>

              <FormField
                label="Lý do hủy đơn (tùy chọn)"
                htmlFor="cancelReason"
              >
                <textarea
                  id="cancelReason"
                  rows={3}
                  value={cancelReason}
                  disabled={isCancelling}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ví dụ: Tôi có việc bận đột xuất, muốn đổi lịch..."
                  className="w-full rounded-md border border-neutral-300 px-3.5 py-2.5 text-sm font-sans text-ink outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isCancelling}
                  onClick={() => setCancelModalOpen(false)}
                >
                  Giữ lại đơn
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  isLoading={isCancelling}
                  onClick={handleConfirmCancel}
                >
                  Xác nhận hủy đơn
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default BookingDetailPage
