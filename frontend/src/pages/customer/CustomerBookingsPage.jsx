import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Plus,
  Calendar,
  Ban,
  Timer,
  Eye,
  LifeBuoy,
  RefreshCw,
  AlertCircle,
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
import { Pagination } from '../../components/ui/Pagination'
import { CancelBookingModal } from '../../features/booking/components/CancelBookingModal'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: BOOKING_STATUS.PENDING_PROVIDER, label: 'Chờ xác nhận' },
  { key: BOOKING_STATUS.PENDING_DEPOSIT, label: 'Chờ đặt cọc' },
  { key: BOOKING_STATUS.CONFIRMED, label: 'Đã xác nhận' },
  { key: BOOKING_STATUS.IN_PROGRESS, label: 'Đang thực hiện' },
  { key: BOOKING_STATUS.COMPLETED, label: 'Hoàn thành' },
  { key: BOOKING_STATUS.CANCELLED, label: 'Đã hủy' },
  { key: BOOKING_STATUS.REJECTED, label: 'Từ chối' },
  { key: BOOKING_STATUS.EXPIRED, label: 'Hết hạn' },
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
  return `Còn ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} để phản hồi`
}

export const CustomerBookingsPage = () => {
  const location = useLocation()
  const highlightBookingId = location.state?.highlightBookingId || null

  const [pageData, setPageData] = useState({
    items: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
  })
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [cancellingBooking, setCancellingBooking] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadBookings = () => {
    setIsLoading(true)
    setErrorMessage('')
    setReloadTick((prev) => prev + 1)
  }

  useEffect(() => {
    let isMounted = true
    const fetchBookings = async () => {
      try {
        const res = await getMyCustomerBookings({
          status: statusFilter,
          page: currentPage,
          size: PAGE_SIZE,
        })
        if (!isMounted) return
        setPageData(res.pageData)
        setErrorMessage('')
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(
          error?.response?.data?.message ||
            'Không thể tải danh sách đơn đặt lịch.'
        )
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchBookings()
    return () => {
      isMounted = false
    }
  }, [statusFilter, currentPage, reloadTick])

  const handleConfirmCancel = async (bookingId, { version, reason }) => {
    try {
      const result = await cancelCustomerBooking(bookingId, { version, reason })
      setCancellingBooking(null)
      toast.success(result.message || 'Đã hủy đơn đặt lịch.')
      await loadBookings()
    } catch (error) {
      const apiErr = error?.response?.data
      const code = apiErr?.code || error?.code
      if (code === 'DATA_CONFLICT' || error?.response?.status === 409) {
        toast.error(
          'Thông tin đơn đã được cập nhật. Đang tải lại dữ liệu...'
        )
        setCancellingBooking(null)
        await loadBookings()
        return
      }
      toast.error(
        apiErr?.message || error?.message || 'Không thể hủy đơn đặt lịch.'
      )
    }
  }

  const bookings = pageData.items || []

  return (
    <div className="bg-neutral-50 min-h-[calc(100vh-64px)] py-8 sm:py-10 font-sans">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Đơn đặt của tôi
          </h1>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={loadBookings}
              disabled={isLoading}
            >
              Làm mới
            </Button>
            <Link to="/booking/new">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Đặt lịch mới
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key)
                  setCurrentPage(0)
                }}
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

        {errorMessage ? (
          <div className="bg-white border border-neutral-200 rounded-md p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm text-neutral-700">{errorMessage}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadBookings}
            >
              Thử lại
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 bg-white border border-neutral-200 rounded-md animate-pulse"
              />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-md">
            <EmptyState
              title="Chưa có đơn đặt lịch nào"
              description="Các đơn dịch vụ bạn đã đặt sẽ được hiển thị tại đây."
              action={
                <Link to="/services">
                  <Button variant="primary" size="sm">
                    Khám phá dịch vụ
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const policy = evaluateCancellationPolicy(booking, new Date(nowMs))
              const countdown =
                booking.status === BOOKING_STATUS.PENDING_PROVIDER
                  ? formatCountdown(booking.requestExpiresAt, nowMs)
                  : null
              const isHighlighted =
                highlightBookingId &&
                String(highlightBookingId) === String(booking.id)

              return (
                <article
                  key={booking.id}
                  className={`bg-white border rounded-md p-5 space-y-4 ${
                    isHighlighted
                      ? 'border-primary-400 ring-2 ring-primary-500/15'
                      : 'border-neutral-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-semibold text-neutral-500 tabular-nums">
                          {booking.bookingCode}
                        </span>
                        <StatusBadge status={booking.status} />
                      </div>
                      <h2 className="text-base font-bold text-ink">
                        <Link
                          to={`/customer/bookings/${booking.id}`}
                          className="hover:text-primary-600 transition-colors"
                        >
                          {booking.serviceTitle}
                        </Link>
                      </h2>
                      <p className="text-xs text-neutral-500">
                        Nhà cung cấp: {booking.providerName || '—'}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0 space-y-0.5">
                      <p className="text-xs text-neutral-500">Tổng giá trị đơn</p>
                      <p className="text-lg font-bold text-primary-600 tabular-nums">
                        {formatVnd(booking.totalAmountVnd)}
                      </p>
                      {booking.depositAmountVnd != null && (
                        <p className="text-xs text-neutral-500 tabular-nums">
                          Tiền cọc: {formatVnd(booking.depositAmountVnd)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-neutral-600">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary-600" />
                        <strong className="text-ink tabular-nums">
                          {formatDateTimeVi(booking.startsAt)}
                        </strong>
                        <span>→</span>
                        <span className="tabular-nums">
                          {formatDateTimeVi(booking.endsAt)}
                        </span>
                      </span>

                      {countdown && (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium tabular-nums">
                          <Timer className="w-3.5 h-3.5" />
                          {countdown}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link to={`/customer/complaints?bookingId=${booking.id}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          leftIcon={<LifeBuoy className="w-4 h-4" />}
                        >
                          Hỗ trợ
                        </Button>
                      </Link>

                      <Link to={`/customer/bookings/${booking.id}`}>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="w-4 h-4" />}
                        >
                          Chi tiết
                        </Button>
                      </Link>

                      {policy.canCancel && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          leftIcon={<Ban className="w-4 h-4" />}
                          onClick={() => setCancellingBooking(booking)}
                        >
                          Hủy đơn
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}

            <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
              <Pagination
                page={pageData.page}
                size={pageData.size}
                totalElements={pageData.totalElements}
                totalPages={pageData.totalPages}
                onPageChange={(nextPage) => setCurrentPage(nextPage)}
              />
            </div>
          </div>
        )}
      </div>

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
