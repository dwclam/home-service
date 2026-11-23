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
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getMyProviderBookings,
  acceptProviderBooking,
  rejectProviderBooking,
  startProviderService,
  completeProviderService,
} from '../../features/booking/api'
import { BOOKING_STATUS } from '../../constants/status'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { RejectBookingModal } from '../../features/booking/components/RejectBookingModal'
import { ServiceActionModal } from '../../features/booking/components/ServiceActionModal'
import { ProviderBookingDetailModal } from '../../features/booking/components/ProviderBookingDetailModal'

const STATUS_FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: BOOKING_STATUS.PENDING_PROVIDER, label: 'Chờ xác nhận' },
  { key: BOOKING_STATUS.PENDING_DEPOSIT, label: 'Chờ đặt cọc' },
  { key: BOOKING_STATUS.CONFIRMED, label: 'Đã xác nhận' },
  { key: BOOKING_STATUS.IN_PROGRESS, label: 'Đang thực hiện' },
  { key: BOOKING_STATUS.COMPLETED, label: 'Hoàn thành' },
  { key: 'TERMINATED_GROUP', label: 'Đã đóng' },
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
  const [bookings, setBookings] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const [rejectingBooking, setRejectingBooking] = useState(null)
  const [serviceActionTarget, setServiceActionTarget] = useState(null)
  const [detailBooking, setDetailBooking] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const reloadBookings = async () => {
    setIsLoading(true)
    try {
      const res = await getMyProviderBookings({
        status: statusFilter,
        keyword,
      })
      setBookings(res.items || [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const fetchInitial = async () => {
      try {
        const res = await getMyProviderBookings({
          status: statusFilter,
          keyword,
        })
        if (isMounted) {
          setBookings(res.items || [])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    fetchInitial()
    return () => {
      isMounted = false
    }
  }, [statusFilter, keyword])

  const upsertBookingInList = (updatedBooking) => {
    if (!updatedBooking) return
    setBookings((prev) => {
      const exists = prev.some((item) => item.id === updatedBooking.id)
      if (exists) {
        return prev.map((item) =>
          item.id === updatedBooking.id ? updatedBooking : item
        )
      }
      return [updatedBooking, ...prev]
    })
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
      await reloadBookings()
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
      upsertBookingInList(res.data)
      toast.success(res.message || 'Đã chấp nhận đơn đặt dịch vụ.')
    } catch (error) {
      await handleApiErrorWithConflictReload(
        error,
        'Không thể chấp nhận đơn đặt dịch vụ.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirmReject = async (bookingId, { version, reason }) => {
    try {
      const res = await rejectProviderBooking(bookingId, { version, reason })
      upsertBookingInList(res.data)
      setRejectingBooking(null)
      toast.success(res.message || 'Đã từ chối đơn đặt dịch vụ.')
    } catch (error) {
      setRejectingBooking(null)
      await handleApiErrorWithConflictReload(
        error,
        'Không thể từ chối đơn đặt dịch vụ.'
      )
    }
  }

  const handleConfirmServiceAction = async (bookingId, { version, note }) => {
    if (!serviceActionTarget) return
    const isStart = serviceActionTarget.actionType === 'START'
    try {
      const res = isStart
        ? await startProviderService(bookingId, { version, note })
        : await completeProviderService(bookingId, { version, note })
      upsertBookingInList(res.data)
      setServiceActionTarget(null)
      toast.success(
        res.message ||
          (isStart ? 'Đã bắt đầu dịch vụ.' : 'Đã hoàn thành dịch vụ.')
      )
    } catch (error) {
      setServiceActionTarget(null)
      await handleApiErrorWithConflictReload(
        error,
        isStart
          ? 'Không thể bắt đầu dịch vụ.'
          : 'Không thể hoàn thành dịch vụ.'
      )
    }
  }

  const countPendingProvider = bookings.filter(
    (b) => b.status === BOOKING_STATUS.PENDING_PROVIDER
  ).length
  const countConfirmed = bookings.filter(
    (b) => b.status === BOOKING_STATUS.CONFIRMED
  ).length
  const countInProgress = bookings.filter(
    (b) => b.status === BOOKING_STATUS.IN_PROGRESS
  ).length
  const countCompleted = bookings.filter(
    (b) => b.status === BOOKING_STATUS.COMPLETED
  ).length

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          Đơn đặt dịch vụ
        </h2>

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={reloadBookings}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase text-neutral-500">
            Chờ phản hồi
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-ink">
              {String(countPendingProvider).padStart(2, '0')}
            </span>
            <StatusBadge status={BOOKING_STATUS.PENDING_PROVIDER} />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase text-neutral-500">
            Chờ bắt đầu
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-ink">
              {String(countConfirmed).padStart(2, '0')}
            </span>
            <StatusBadge status={BOOKING_STATUS.CONFIRMED} />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase text-neutral-500">
            Đang thực hiện
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-ink">
              {String(countInProgress).padStart(2, '0')}
            </span>
            <StatusBadge status={BOOKING_STATUS.IN_PROGRESS} />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase text-neutral-500">
            Hoàn thành
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-ink">
              {String(countCompleted).padStart(2, '0')}
            </span>
            <StatusBadge status={BOOKING_STATUS.COMPLETED} />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {STATUS_FILTER_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
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

        <div className="w-full md:w-72">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã đơn, dịch vụ, khách hàng..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center text-sm text-neutral-500">
          Đang tải danh sách đơn đặt dịch vụ...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg">
          <EmptyState title="Không tìm thấy đơn đặt dịch vụ nào" />
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isProcessing = processingId === booking.id

            const requestCountdown =
              booking.status === BOOKING_STATUS.PENDING_PROVIDER
                ? getCountdownMeta(
                    booking.requestExpiresAt,
                    nowMs,
                    'Hạn phản hồi',
                    'Đã quá hạn phản hồi'
                  )
                : null

            const depositCountdown =
              booking.status === BOOKING_STATUS.PENDING_DEPOSIT
                ? getCountdownMeta(
                    booking.depositDueAt,
                    nowMs,
                    'Hạn khách đặt cọc',
                    'Đã quá hạn đặt cọc'
                  )
                : null

            const isTooEarlyToStart =
              booking.status === BOOKING_STATUS.CONFIRMED &&
              booking.startsAt &&
              nowMs < new Date(booking.startsAt).getTime()

            return (
              <article
                key={booking.id}
                className="bg-white border border-neutral-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-neutral-200">
                  <span className="text-sm font-bold text-ink">
                    {booking.bookingCode}
                  </span>

                  <div className="flex flex-wrap items-center gap-4">
                    {requestCountdown && (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          requestCountdown.expired
                            ? 'text-red-600'
                            : 'text-amber-700'
                        }`}
                      >
                        <Timer className="w-3.5 h-3.5 shrink-0" />
                        <span>{requestCountdown.text}</span>
                      </span>
                    )}

                    {depositCountdown && (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          depositCountdown.expired
                            ? 'text-red-600'
                            : 'text-amber-700'
                        }`}
                      >
                        <Timer className="w-3.5 h-3.5 shrink-0" />
                        <span>{depositCountdown.text}</span>
                      </span>
                    )}

                    <StatusBadge status={booking.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-2.5">
                    <h3 className="text-[17px] font-semibold text-ink">
                      {booking.serviceTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary-600" />
                        <strong>Bắt đầu:</strong>{' '}
                        {formatDateTimeVi(booking.startsAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary-600" />
                        <strong>Kết thúc:</strong>{' '}
                        {formatDateTimeVi(booking.endsAt)}
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-neutral-600">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>{booking.recipientName}</strong> •{' '}
                        {booking.recipientPhone} — {booking.addressLine}
                        {booking.ward ? `, ${booking.ward}` : ''},{' '}
                        {booking.city}
                      </span>
                    </div>

                    {booking.customerNote && (
                      <p className="text-xs text-neutral-500">
                        Ghi chú khách hàng: {booking.customerNote}
                      </p>
                    )}

                    {booking.providerServiceNote && (
                      <p className="text-xs text-neutral-600 bg-neutral-50 px-3 py-2 rounded border border-neutral-200">
                        <strong>Ghi chú kỹ thuật viên:</strong>{' '}
                        {booking.providerServiceNote}
                      </p>
                    )}

                    {booking.terminationReason && (
                      <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded border border-red-200">
                        <strong>Lý do kết thúc:</strong>{' '}
                        {booking.terminationReason}
                      </p>
                    )}
                  </div>

                  <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 flex flex-col justify-between gap-4">
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <dt className="text-neutral-500">Tổng giá gói:</dt>
                        <dd className="font-bold text-ink text-sm">
                          {formatVnd(booking.totalAmountVnd)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-neutral-500">Cọc giữ lịch:</dt>
                        <dd className="font-semibold text-primary-600">
                          {formatVnd(booking.depositAmountVnd)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-neutral-500">Thực nhận dự kiến:</dt>
                        <dd className="font-semibold text-emerald-700">
                          {formatVnd(booking.providerPayoutAmountVnd)}
                        </dd>
                      </div>
                    </dl>

                    <div className="pt-3 border-t border-neutral-200 space-y-2">
                      {booking.status === BOOKING_STATUS.PENDING_PROVIDER && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={
                              isProcessing || requestCountdown?.expired
                            }
                            onClick={() => setRejectingBooking(booking)}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Từ chối
                          </Button>

                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            isLoading={isProcessing}
                            disabled={requestCountdown?.expired}
                            onClick={() => handleAcceptBooking(booking)}
                            leftIcon={<Check className="w-3.5 h-3.5" />}
                          >
                            Chấp nhận
                          </Button>
                        </div>
                      )}

                      {booking.status === BOOKING_STATUS.CONFIRMED && (
                        <div className="space-y-2">
                          {isTooEarlyToStart && (
                            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                              Bắt đầu từ {formatDateTimeVi(booking.startsAt)}
                            </p>
                          )}

                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            fullWidth
                            disabled={isTooEarlyToStart || isProcessing}
                            onClick={() =>
                              setServiceActionTarget({
                                booking,
                                actionType: 'START',
                              })
                            }
                            leftIcon={<Play className="w-3.5 h-3.5" />}
                          >
                            Bắt đầu dịch vụ
                          </Button>
                        </div>
                      )}

                      {booking.status === BOOKING_STATUS.IN_PROGRESS && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          fullWidth
                          disabled={isProcessing}
                          onClick={() =>
                            setServiceActionTarget({
                              booking,
                              actionType: 'COMPLETE',
                            })
                          }
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Hoàn thành dịch vụ
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        fullWidth
                        onClick={() => setDetailBooking(booking)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <RejectBookingModal
        isOpen={Boolean(rejectingBooking)}
        booking={rejectingBooking}
        onClose={() => setRejectingBooking(null)}
        onConfirmReject={handleConfirmReject}
      />

      <ServiceActionModal
        isOpen={Boolean(serviceActionTarget)}
        actionType={serviceActionTarget?.actionType || 'START'}
        booking={serviceActionTarget?.booking || null}
        onClose={() => setServiceActionTarget(null)}
        onConfirmAction={handleConfirmServiceAction}
      />

      <ProviderBookingDetailModal
        isOpen={Boolean(detailBooking)}
        booking={detailBooking}
        nowMs={nowMs}
        onClose={() => setDetailBooking(null)}
        onAccept={handleAcceptBooking}
        onOpenReject={(b) => setRejectingBooking(b)}
        onOpenStart={(b) =>
          setServiceActionTarget({ booking: b, actionType: 'START' })
        }
        onOpenComplete={(b) =>
          setServiceActionTarget({ booking: b, actionType: 'COMPLETE' })
        }
      />
    </div>
  )
}

export default ProviderBookingsPage
