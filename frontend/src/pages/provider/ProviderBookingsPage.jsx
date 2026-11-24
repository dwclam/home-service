import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Timer,
  Check,
  XCircle,
  Play,
  CheckCircle2,
  Eye,
  Ban,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getMyProviderBookings,
  acceptProviderBooking,
  rejectProviderBooking,
  cancelProviderBooking,
  startProviderService,
  completeProviderService,
} from '../../features/booking/api'
import { BOOKING_STATUS } from '../../constants/status'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { RejectBookingModal } from '../../features/booking/components/RejectBookingModal'
import { ProviderCancelBookingModal } from '../../features/booking/components/ProviderCancelBookingModal'
import { ServiceActionModal } from '../../features/booking/components/ServiceActionModal'
import { ProviderBookingDetailModal } from '../../features/booking/components/ProviderBookingDetailModal'

const PAGE_SIZE = 10

const STATUS_FILTER_TABS = [
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

const getCountdownMeta = (targetIso, nowMs, activePrefix, expiredLabel) => {
  if (!targetIso) return null
  const diffSec = Math.floor((new Date(targetIso).getTime() - nowMs) / 1000)
  if (diffSec <= 0) {
    return { expired: true, text: expiredLabel }
  }
  const mins = Math.floor(diffSec / 60)
  const secs = diffSec % 60
  return {
    expired: false,
    text: `${activePrefix}: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
  }
}

export const ProviderBookingsPage = () => {
  const [pageData, setPageData] = useState({
    items: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
  })
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const [rejectingBooking, setRejectingBooking] = useState(null)
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [serviceActionTarget, setServiceActionTarget] = useState(null)
  const [detailBooking, setDetailBooking] = useState(null)

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
        const res = await getMyProviderBookings({
          status: statusFilter,
          keyword,
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
            'Không thể tải danh sách đơn đặt lịch. Vui lòng thử lại.'
        )
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchBookings()
    return () => {
      isMounted = false
    }
  }, [statusFilter, keyword, currentPage, reloadTick])

  const handleStatusChange = (nextStatus) => {
    setStatusFilter(nextStatus)
    setCurrentPage(0)
  }

  const handleApiErrorWithConflictReload = async (error, defaultMsg) => {
    const apiErr = error?.response?.data
    const code = apiErr?.code || error?.code
    const status = error?.response?.status || error?.status
    if (code === 'DATA_CONFLICT' || status === 409) {
      toast.error(
        apiErr?.message ||
          'Đơn hàng đã thay đổi trạng thái. Đang tải lại dữ liệu...'
      )
      await loadBookings()
      return
    }
    toast.error(apiErr?.message || error?.message || defaultMsg)
  }

  const handleAcceptBooking = async (booking) => {
    setProcessingId(booking.id)
    try {
      const res = await acceptProviderBooking(booking.id, {
        version: booking.version,
      })
      toast.success(res.message || 'Đã chấp nhận đơn đặt lịch.')
      await loadBookings()
    } catch (error) {
      await handleApiErrorWithConflictReload(
        error,
        'Không thể chấp nhận đơn đặt lịch.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirmReject = async (bookingId, { reason, version }) => {
    setProcessingId(bookingId)
    try {
      const res = await rejectProviderBooking(bookingId, { reason, version })
      setRejectingBooking(null)
      toast.success(res.message || 'Đã từ chối đơn đặt lịch.')
      await loadBookings()
    } catch (error) {
      await handleApiErrorWithConflictReload(
        error,
        'Không thể từ chối đơn đặt lịch.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirmCancel = async (bookingId, { reason, version }) => {
    setProcessingId(bookingId)
    try {
      const res = await cancelProviderBooking(bookingId, { reason, version })
      setCancellingBooking(null)
      toast.success(res.message || 'Đã hủy đơn đặt lịch.')
      await loadBookings()
    } catch (error) {
      await handleApiErrorWithConflictReload(
        error,
        'Không thể hủy đơn đặt lịch.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirmServiceAction = async (
    bookingId,
    mode,
    { note, version }
  ) => {
    setProcessingId(bookingId)
    try {
      const res =
        mode === 'START'
          ? await startProviderService(bookingId, { note, version })
          : await completeProviderService(bookingId, { note, version })
      setServiceActionTarget(null)
      toast.success(
        res.message ||
          (mode === 'START'
            ? 'Đã bắt đầu thực hiện dịch vụ.'
            : 'Đã hoàn thành dịch vụ.')
      )
      await loadBookings()
    } catch (error) {
      await handleApiErrorWithConflictReload(
        error,
        mode === 'START'
          ? 'Không thể bắt đầu dịch vụ.'
          : 'Không thể hoàn thành dịch vụ.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  const bookings = pageData.items || []

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-ink">
          Quản lý đơn đặt lịch
        </h1>
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
      </div>

      <div className="bg-white border border-neutral-200 rounded-md p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {STATUS_FILTER_TABS.map((tab) => {
              const active = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleStatusChange(tab.key)}
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

          <div className="w-full lg:w-72 shrink-0">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm mã đơn, dịch vụ, khách hàng..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="bg-white border border-neutral-200 rounded-md p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-neutral-700">{errorMessage}</p>
          <Button type="button" variant="secondary" size="sm" onClick={loadBookings}>
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
            title="Chưa có đơn đặt lịch phù hợp"
            description="Các yêu cầu đặt dịch vụ từ khách hàng sẽ xuất hiện tại đây."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isBusy = processingId === booking.id
            const requestCountdown =
              booking.status === BOOKING_STATUS.PENDING_PROVIDER
                ? getCountdownMeta(
                    booking.requestExpiresAt,
                    nowMs,
                    'Còn lại để phản hồi',
                    'Đã hết hạn phản hồi'
                  )
                : null

            const isTooEarlyToStart =
              booking.status === BOOKING_STATUS.CONFIRMED &&
              booking.startsAt &&
              nowMs < new Date(booking.startsAt).getTime()

            const canCancelAccepted =
              booking.status === BOOKING_STATUS.PENDING_DEPOSIT ||
              booking.status === BOOKING_STATUS.CONFIRMED

            return (
              <article
                key={booking.id}
                className="bg-white border border-neutral-200 rounded-md p-5 space-y-4"
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
                      {booking.serviceTitle}
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Khách hàng: {booking.recipientName || '—'}
                      {booking.city ? ` · ${booking.city}` : ''}
                    </p>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <p className="text-xs text-neutral-500">Tổng giá trị đơn</p>
                    <p className="text-lg font-bold text-primary-600 tabular-nums">
                      {formatVnd(booking.totalAmountVnd)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-neutral-600">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-ink">
                        {formatDateTimeVi(booking.startsAt)}
                      </p>
                      <p className="text-neutral-500">
                        Kết thúc dự kiến: {formatDateTimeVi(booking.endsAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-ink">
                        {booking.recipientName || '—'}
                      </p>
                      <p className="text-neutral-500">
                        {booking.city || 'Xem chi tiết địa chỉ bên trong'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2 border-t border-neutral-100">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {requestCountdown && (
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium tabular-nums ${
                          requestCountdown.expired
                            ? 'text-red-600'
                            : 'text-amber-700'
                        }`}
                      >
                        <Timer className="w-3.5 h-3.5" />
                        {requestCountdown.text}
                      </span>
                    )}

                    {booking.status === BOOKING_STATUS.CONFIRMED &&
                      isTooEarlyToStart && (
                        <span className="inline-flex items-center gap-1.5 text-sky-700 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Chờ tới giờ hẹn để bắt đầu
                        </span>
                      )}

                    {booking.status === BOOKING_STATUS.IN_PROGRESS && (
                      <span className="inline-flex items-center gap-1.5 text-neutral-500">
                        Nếu gặp sự cố khi đang thi công, vui lòng liên hệ quản trị viên hỗ trợ.
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye className="w-4 h-4" />}
                      onClick={() => setDetailBooking(booking)}
                    >
                      Chi tiết
                    </Button>

                    {booking.status === BOOKING_STATUS.PENDING_PROVIDER && (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          leftIcon={<XCircle className="w-4 h-4" />}
                          disabled={
                            isBusy || Boolean(requestCountdown?.expired)
                          }
                          onClick={() => setRejectingBooking(booking)}
                        >
                          Từ chối
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="w-4 h-4" />}
                          isLoading={isBusy}
                          disabled={Boolean(requestCountdown?.expired)}
                          onClick={() => handleAcceptBooking(booking)}
                        >
                          Chấp nhận
                        </Button>
                      </>
                    )}

                    {canCancelAccepted && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        leftIcon={<Ban className="w-4 h-4" />}
                        disabled={isBusy}
                        onClick={() => setCancellingBooking(booking)}
                      >
                        Hủy đơn
                      </Button>
                    )}

                    {booking.status === BOOKING_STATUS.CONFIRMED && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        leftIcon={<Play className="w-4 h-4" />}
                        disabled={isBusy || Boolean(isTooEarlyToStart)}
                        onClick={() =>
                          setServiceActionTarget({ booking, mode: 'START' })
                        }
                      >
                        Bắt đầu
                      </Button>
                    )}

                    {booking.status === BOOKING_STATUS.IN_PROGRESS && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        disabled={isBusy}
                        onClick={() =>
                          setServiceActionTarget({ booking, mode: 'COMPLETE' })
                        }
                      >
                        Hoàn thành
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

      <RejectBookingModal
        isOpen={Boolean(rejectingBooking)}
        booking={rejectingBooking}
        onClose={() => setRejectingBooking(null)}
        onConfirmReject={handleConfirmReject}
      />

      <ProviderCancelBookingModal
        isOpen={Boolean(cancellingBooking)}
        booking={cancellingBooking}
        onClose={() => setCancellingBooking(null)}
        onConfirmCancel={handleConfirmCancel}
      />

      <ServiceActionModal
        isOpen={Boolean(serviceActionTarget)}
        booking={serviceActionTarget?.booking || null}
        mode={serviceActionTarget?.mode || 'START'}
        onClose={() => setServiceActionTarget(null)}
        onConfirmAction={handleConfirmServiceAction}
      />

      <ProviderBookingDetailModal
        isOpen={Boolean(detailBooking)}
        booking={detailBooking}
        nowMs={nowMs}
        onClose={() => setDetailBooking(null)}
        onAccept={handleAcceptBooking}
        onOpenReject={(target) => setRejectingBooking(target)}
        onOpenCancel={(target) => setCancellingBooking(target)}
        onOpenStart={(target) =>
          setServiceActionTarget({ booking: target, mode: 'START' })
        }
        onOpenComplete={(target) =>
          setServiceActionTarget({ booking: target, mode: 'COMPLETE' })
        }
      />
    </div>
  )
}

export default ProviderBookingsPage
