import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Ban,
  Timer,
  CheckCircle2,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getMyCustomerBookings,
  cancelCustomerBooking,
  evaluateCancellationPolicy,
} from '../../features/booking/api'
import { BOOKING_STATUS } from '../../constants/status'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { CancelBookingModal } from '../../features/booking/components/CancelBookingModal'

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả đơn' },
  { key: BOOKING_STATUS.PENDING_PROVIDER, label: 'Chờ xác nhận' },
  { key: BOOKING_STATUS.CONFIRMED, label: 'Đã xác nhận' },
  { key: BOOKING_STATUS.CANCELLED, label: 'Đã hủy' },
]

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' đ'

const formatDateTimeVi = (isoStr) => {
  if (!isoStr) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoStr))
}

const formatCountdown = (targetIso, nowMs) => {
  if (!targetIso) return null
  const diffSec = Math.floor((new Date(targetIso).getTime() - nowMs) / 1000)
  if (diffSec <= 0) return 'Đã hết hạn phản hồi'
  const mins = Math.floor(diffSec / 60)
  const secs = diffSec % 60
  return `Còn ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} để NCC phản hồi`
}

export const CustomerBookingsPage = () => {
  const location = useLocation()
  const highlightBookingId = location.state?.highlightBookingId || null

  const [bookings, setBookings] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [cancellingBooking, setCancellingBooking] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadBookings = async () => {
      try {
        const res = await getMyCustomerBookings()
        if (isMounted) {
          setBookings(res.items || [])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    loadBookings()
    return () => {
      isMounted = false
    }
  }, [])

  const handleConfirmCancel = async (bookingId, { version, reason }) => {
    try {
      const result = await cancelCustomerBooking(bookingId, { version, reason })
      setBookings((prev) =>
        prev.map((item) => (item.id === bookingId ? result.data : item))
      )
      setCancellingBooking(null)
      toast.success(
        `${result.message} (${result.data.bookingCode})`
      )
    } catch (error) {
      const apiErr = error?.response?.data
      const code = apiErr?.code || error?.code
      if (code === 'DATA_CONFLICT' || error?.response?.status === 409) {
        toast.error(
          'Thông tin đơn đã được cập nhật bởi thao tác khác (409 DATA_CONFLICT). Đang tải lại dữ liệu...'
        )
        const res = await getMyCustomerBookings()
        setBookings(res.items || [])
        setCancellingBooking(null)
        return
      }
      toast.error(
        apiErr?.message || error?.message || 'Không thể hủy đơn đặt lịch.'
      )
    }
  }

  const filteredBookings =
    statusFilter === 'ALL'
      ? bookings
      : bookings.filter((b) => b.status === statusFilter)

  return (
    <div className="bg-neutral-50 min-h-[calc(100vh-64px)] py-8 sm:py-10 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              Đơn đặt dịch vụ của tôi (UC08 & UC11)
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Theo dõi trạng thái đơn, thời hạn phản hồi của Nhà cung cấp và thực hiện hủy đơn theo chính sách hoàn cọc.
            </p>
          </div>

          <Link to="/customer/bookings/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Đặt lịch dịch vụ mới
            </Button>
          </Link>
        </div>

        {/* Bộ lọc tab */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`h-9 px-4 rounded-full text-xs font-semibold transition-colors duration-150 shrink-0 cursor-pointer ${
                  active
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Danh sách đơn */}
        {isLoading ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center text-sm text-neutral-500">
            Đang tải danh sách đơn đặt lịch...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg">
            <EmptyState
              title="Chưa có đơn đặt dịch vụ nào"
              description="Bạn chưa có đơn đặt lịch nào ở trạng thái này. Hãy chọn gói dịch vụ và đặt lịch ngay."
              action={
                <Link to="/customer/bookings/new">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Đặt lịch ngay
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const isHighlighted = booking.id === highlightBookingId
              const evaluation = evaluateCancellationPolicy(
                booking,
                new Date(nowMs)
              )
              const countdownText =
                booking.status === BOOKING_STATUS.PENDING_PROVIDER
                  ? formatCountdown(booking.requestExpiresAt, nowMs)
                  : null

              return (
                <article
                  key={booking.id}
                  className={`bg-white rounded-lg border p-5 sm:p-6 shadow-xs transition-colors ${
                    isHighlighted
                      ? 'border-primary-500 ring-2 ring-primary-500/15'
                      : 'border-neutral-200'
                  }`}
                >
                  {/* Dòng trên: Mã đơn, version, countdown & StatusBadge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-200">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-bold text-ink">
                        {booking.bookingCode}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                        Version #{booking.version ?? 0}
                      </span>
                      {isHighlighted && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Vừa đặt thành công
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {countdownText && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                          <Timer className="w-3.5 h-3.5 text-amber-600" />
                          {countdownText}
                        </span>
                      )}
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>

                  {/* Nội dung chính */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 py-4">
                    <div className="lg:col-span-2 space-y-2.5">
                      <h2 className="text-[17px] font-semibold text-ink">
                        {booking.serviceTitle}
                      </h2>
                      <p className="text-xs text-neutral-500">
                        Nhà cung cấp:{' '}
                        <span className="font-semibold text-neutral-700">
                          {booking.providerName}
                        </span>{' '}
                        (ID #{booking.providerId})
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-1">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary-600" />
                          <strong>Bắt đầu:</strong>{' '}
                          {formatDateTimeVi(booking.startsAt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary-600" />
                          <strong>Kết thúc:</strong>{' '}
                          {formatDateTimeVi(booking.endsAt)} (
                          {booking.durationMinutes} phút)
                        </span>
                      </div>

                      <div className="flex items-start gap-1.5 text-xs text-neutral-600">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>{booking.recipientName}</strong> (
                          {booking.recipientPhone}) — {booking.addressLine}
                          {booking.ward ? `, ${booking.ward}` : ''},{' '}
                          {booking.city}
                        </span>
                      </div>

                      {booking.customerNote && (
                        <p className="text-xs text-neutral-500 italic">
                          Ghi chú khách hàng: &ldquo;{booking.customerNote}&rdquo;
                        </p>
                      )}

                      {booking.status === BOOKING_STATUS.CANCELLED && (
                        <div className="mt-2 p-3 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
                          <p className="font-semibold text-ink">
                            Thông tin kết thúc đơn (Snapshot hủy UC11):
                          </p>
                          <p>
                            Lý do hủy:{' '}
                            <span className="font-medium text-ink">
                              {booking.terminationReason ||
                                'Khách hàng hủy đơn (không ghi lý do)'}
                            </span>
                          </p>
                          <p>
                            Tỷ lệ hoàn cọc áp dụng:{' '}
                            <strong className="text-ink">
                              {booking.refundPercent ?? 0}%
                            </strong>{' '}
                            • Số tiền cọc hoàn dự kiến:{' '}
                            <strong className="text-primary-600">
                              {formatVnd(booking.estimatedRefundAmountVnd ?? 0)}
                            </strong>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Cột phải: Snapshot tiền & nút Hủy đơn UC11 */}
                    <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 flex flex-col justify-between gap-4">
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <dt className="text-neutral-500">Tổng giá gói:</dt>
                          <dd className="font-bold text-ink text-sm">
                            {formatVnd(booking.totalAmountVnd)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-neutral-500">
                            Cọc ({booking.depositPercent || 30}%):
                          </dt>
                          <dd className="font-semibold text-primary-600">
                            {formatVnd(booking.depositAmountVnd)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-neutral-500">Còn lại (70%):</dt>
                          <dd className="font-medium text-ink">
                            {formatVnd(booking.balanceAmountVnd)}
                          </dd>
                        </div>
                      </dl>

                      {booking.status !== BOOKING_STATUS.CANCELLED &&
                        booking.status !== BOOKING_STATUS.REJECTED &&
                        booking.status !== BOOKING_STATUS.EXPIRED && (
                          <div className="pt-3 border-t border-neutral-200 space-y-2">
                            <p className="text-[11px] text-neutral-500 flex items-start gap-1">
                              <Info className="w-3.5 h-3.5 text-primary-600 shrink-0 mt-0.5" />
                              <span>{evaluation.summaryTitle || evaluation.reasonBlocked}</span>
                            </p>

                            <Button
                              variant={
                                evaluation.canCancel ? 'danger' : 'secondary'
                              }
                              size="sm"
                              fullWidth
                              onClick={() => setCancellingBooking(booking)}
                              leftIcon={<Ban className="w-3.5 h-3.5" />}
                            >
                              {evaluation.canCancel
                                ? 'Hủy đơn đặt lịch'
                                : 'Xem quy định hủy'}
                            </Button>
                          </div>
                        )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal xác nhận hủy đơn UC11 */}
      <CancelBookingModal
        isOpen={Boolean(cancellingBooking)}
        booking={cancellingBooking}
        onClose={() => setCancellingBooking(null)}
        onConfirmCancel={handleConfirmCancel}
      />
    </div>
  )
}

export default CustomerBookingsPage
