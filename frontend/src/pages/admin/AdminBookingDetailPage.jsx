import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Store,
  Wallet,
  Ban,
  PauseCircle,
  PlayCircle,
  History,
  CreditCard,
  ShieldAlert,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getAdminBookingDetail,
  adminCancelBooking,
  adminHoldSettlement,
  adminReleaseSettlement,
} from '../../features/booking/api'
import {
  BOOKING_STATUS,
  BOOKING_STATUS_CONFIG,
  SETTLEMENT_STATUS,
  SETTLEMENT_STATUS_CONFIG,
  BANK_VERIFICATION_CONFIG,
  PAYMENT_STATUS_CONFIG,
  ACTOR_TYPE_LABELS,
  TERMINATION_REASON_LABELS,
} from '../../constants/status'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { AdminBookingActionModal } from '../../features/booking/components/AdminBookingActionModal'

const AUDIT_ACTION_LABELS = {
  ADMIN_CANCEL_BOOKING: 'Can thiệp hủy đơn',
  HOLD_SETTLEMENT: 'Tạm giữ đối soát',
  RELEASE_SETTLEMENT: 'Mở lại đối soát',
}

const PAYMENT_KIND_LABELS = {
  DEPOSIT: 'Đặt cọc',
  BALANCE: 'Thanh toán phần còn lại',
}

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

export const AdminBookingDetailPage = () => {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [actionMode, setActionMode] = useState(null)

  const loadDetail = () => {
    setIsLoading(true)
    setErrorMessage('')
    setReloadTick((prev) => prev + 1)
  }

  useEffect(() => {
    let isMounted = true
    const fetchDetail = async () => {
      try {
        const data = await getAdminBookingDetail(bookingId)
        if (!isMounted) return
        setBooking(data)
        setErrorMessage('')
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(
          error?.response?.data?.message ||
            'Không thể tải chi tiết đơn đặt lịch.'
        )
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchDetail()
    return () => {
      isMounted = false
    }
  }, [bookingId, reloadTick])

  const handleConfirmAction = async (payload) => {
    try {
      let res
      if (payload.mode === 'CANCEL') {
        res = await adminCancelBooking(booking.id, {
          reasonCode: payload.reasonCode,
          reason: payload.reason,
          version: payload.version,
        })
      } else if (payload.mode === 'HOLD') {
        res = await adminHoldSettlement(booking.id, {
          reason: payload.reason,
          version: payload.version,
        })
      } else {
        res = await adminReleaseSettlement(booking.id, {
          reason: payload.reason,
          version: payload.version,
        })
      }
      setBooking(res.data)
      setActionMode(null)
      toast.success(res.message)
    } catch (error) {
      const status = error?.response?.status
      const apiErr = error?.response?.data
      if (status === 409 || apiErr?.code === 'DATA_CONFLICT') {
        toast.error(
          apiErr?.message ||
            'Đơn hàng vừa được cập nhật. Đang tải lại dữ liệu...'
        )
        setActionMode(null)
        await loadDetail()
        return
      }
      toast.error(apiErr?.message || 'Không thể thực hiện thao tác quản trị.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 font-sans">
        <div className="h-10 w-64 bg-neutral-200 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-56 bg-white border border-neutral-200 rounded-md animate-pulse" />
          <div className="h-56 bg-white border border-neutral-200 rounded-md animate-pulse" />
        </div>
      </div>
    )
  }

  if (errorMessage || !booking) {
    return (
      <div className="bg-white border border-neutral-200 rounded-md p-8 text-center space-y-4 font-sans">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm text-neutral-700">
          {errorMessage || 'Không tìm thấy thông tin đơn hàng.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/admin/bookings">
            <Button variant="secondary" size="sm">
              Quay lại danh sách
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={loadDetail}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  const canAdminCancel = [
    BOOKING_STATUS.PENDING_PROVIDER,
    BOOKING_STATUS.PENDING_DEPOSIT,
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.IN_PROGRESS,
  ].includes(booking.status)

  const settlementStatus = booking.settlement?.settlementStatus
  const canHoldSettlement =
    (booking.status === BOOKING_STATUS.COMPLETED ||
      booking.status === BOOKING_STATUS.CANCELLED) &&
    settlementStatus !== SETTLEMENT_STATUS.ON_HOLD

  const canReleaseSettlement =
    settlementStatus === SETTLEMENT_STATUS.ON_HOLD &&
    !booking.settlement?.settledAt

  const addressParts = [
    booking.address?.addressLine,
    booking.address?.ward,
    booking.address?.city,
  ].filter(Boolean)

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <Link
            to="/admin/bookings"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Danh sách đơn hàng</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-ink tabular-nums">
              Đơn hàng {booking.bookingCode}
            </h1>
            <StatusBadge
              status={booking.status}
              configMap={BOOKING_STATUS_CONFIG}
            />
            {settlementStatus && (
              <StatusBadge
                status={settlementStatus}
                configMap={SETTLEMENT_STATUS_CONFIG}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={loadDetail}
          >
            Làm mới
          </Button>
          {canHoldSettlement && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<PauseCircle className="w-4 h-4" />}
              onClick={() => setActionMode('HOLD')}
            >
              Tạm giữ đối soát
            </Button>
          )}
          {canReleaseSettlement && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<PlayCircle className="w-4 h-4" />}
              onClick={() => setActionMode('RELEASE')}
            >
              Mở lại đối soát
            </Button>
          )}
          {canAdminCancel && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              leftIcon={<Ban className="w-4 h-4" />}
              onClick={() => setActionMode('CANCEL')}
            >
              Can thiệp hủy đơn
            </Button>
          )}
        </div>
      </div>

      {/* Dịch vụ, khách hàng, nhà cung cấp */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white border border-neutral-200 rounded-md p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            <span>Dịch vụ & Thời gian</span>
          </h2>
          <p className="font-semibold text-ink">
            {booking.serviceTitleSnapshot}
          </p>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Thời lượng dự kiến</dt>
              <dd className="font-medium text-ink tabular-nums">
                {booking.durationMinutesSnapshot} phút
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Giờ hẹn bắt đầu</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatDateTimeVi(booking.startsAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Giờ hẹn kết thúc</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatDateTimeVi(booking.endsAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Tạo lúc</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatDateTimeVi(booking.createdAt)}
              </dd>
            </div>
            {booking.startedAt && (
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Bắt đầu thực tế</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatDateTimeVi(booking.startedAt)}
                </dd>
              </div>
            )}
            {booking.completedAt && (
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Hoàn thành thực tế</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatDateTimeVi(booking.completedAt)}
                </dd>
              </div>
            )}
          </dl>
          {booking.customerNote && (
            <div className="pt-2 border-t border-neutral-100 text-xs">
              <p className="text-neutral-500 mb-0.5">Ghi chú khách hàng</p>
              <p className="text-ink">{booking.customerNote}</p>
            </div>
          )}
        </section>

        <section className="bg-white border border-neutral-200 rounded-md p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <User className="w-4 h-4 text-primary-600" />
            <span>Khách hàng & Địa chỉ</span>
          </h2>
          <div className="space-y-1 text-xs">
            <p className="text-sm font-semibold text-ink">
              {booking.customer?.displayName || '—'}
            </p>
            <p className="text-neutral-600">{booking.customer?.email || '—'}</p>
            <p className="text-neutral-600 tabular-nums">
              {booking.customer?.phone || '—'}
            </p>
          </div>
          <div className="pt-2 border-t border-neutral-100 space-y-1 text-xs">
            <p className="font-medium text-ink flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>
                {booking.address?.recipientName || '—'} ·{' '}
                {booking.address?.recipientPhone || '—'}
              </span>
            </p>
            <p className="text-neutral-600 pl-5">
              {addressParts.join(', ') || '—'}
            </p>
            {booking.address?.addressInstructions && (
              <p className="text-neutral-500 italic pl-5">
                {booking.address.addressInstructions}
              </p>
            )}
          </div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-md p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Store className="w-4 h-4 text-primary-600" />
            <span>Nhà cung cấp</span>
          </h2>
          <div className="space-y-1 text-xs">
            <p className="text-sm font-semibold text-ink">
              {booking.provider?.businessName || '—'}
            </p>
            <p className="text-neutral-600">{booking.provider?.email || '—'}</p>
            <p className="text-neutral-600 tabular-nums">
              {booking.provider?.phone || '—'}
            </p>
            {booking.provider?.city && (
              <p className="text-neutral-500">{booking.provider.city}</p>
            )}
          </div>
          {booking.provider?.bankVerificationStatus && (
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-neutral-500">Xác minh ngân hàng</span>
              <StatusBadge
                status={booking.provider.bankVerificationStatus}
                configMap={BANK_VERIFICATION_CONFIG}
              />
            </div>
          )}
        </section>
      </div>

      {/* Tài chính & Đối soát + Kết thúc đơn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white border border-neutral-200 rounded-md p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary-600" />
            <span>Tài chính & Đối soát</span>
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Tổng giá trị đơn</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatVnd(booking.totalAmountVnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Tiền cọc</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatVnd(booking.depositAmountVnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Phần còn lại</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatVnd(booking.balanceAmountVnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Đã thu thực tế</dt>
              <dd className="font-medium text-emerald-700 tabular-nums">
                {formatVnd(booking.grossCollectedVnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Đã hoàn khách</dt>
              <dd className="font-medium text-red-600 tabular-nums">
                {formatVnd(booking.refundedVnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Phí nền tảng</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatVnd(booking.platformFeeVnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 col-span-2 pt-2 border-t border-neutral-100">
              <dt className="font-semibold text-ink">Nghĩa vụ trả nhà cung cấp</dt>
              <dd className="font-bold text-primary-600 tabular-nums">
                {formatVnd(booking.providerDueVnd)}
              </dd>
            </div>
          </dl>

          {booking.settlement && (
            <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Trạng thái đối soát</span>
                <StatusBadge
                  status={booking.settlement.settlementStatus}
                  configMap={SETTLEMENT_STATUS_CONFIG}
                />
              </div>
              {booking.settlement.settlementNote && (
                <p className="text-neutral-600">
                  Ghi chú: {booking.settlement.settlementNote}
                </p>
              )}
              {booking.settlement.settledAt && (
                <p className="text-neutral-500 tabular-nums">
                  Chốt lúc: {formatDateTimeVi(booking.settlement.settledAt)}
                  {booking.settlement.settledByAdminName
                    ? ` · ${booking.settlement.settledByAdminName}`
                    : ''}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="bg-white border border-neutral-200 rounded-md p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary-600" />
            <span>Thông tin hủy / kết thúc</span>
          </h2>
          {booking.termination ? (
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Nguyên nhân</dt>
                <dd className="font-medium text-ink">
                  {TERMINATION_REASON_LABELS[
                    booking.termination.terminationReasonCode
                  ] || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Bên thực hiện</dt>
                <dd className="font-medium text-ink">
                  {ACTOR_TYPE_LABELS[booking.termination.terminationActorType] ||
                    '—'}
                  {booking.termination.terminatedByDisplayName
                    ? ` · ${booking.termination.terminatedByDisplayName}`
                    : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Thời điểm</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatDateTimeVi(booking.termination.terminatedAt)}
                </dd>
              </div>
              {booking.termination.refundPercent != null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Tỷ lệ hoàn cọc</dt>
                  <dd className="font-semibold text-ink tabular-nums">
                    {booking.termination.refundPercent}%
                  </dd>
                </div>
              )}
              {booking.termination.estimatedRefundAmountVnd != null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Tiền hoàn dự kiến</dt>
                  <dd className="font-semibold text-ink tabular-nums">
                    {formatVnd(booking.termination.estimatedRefundAmountVnd)}
                  </dd>
                </div>
              )}
              {booking.termination.terminationReason && (
                <div className="pt-2 border-t border-neutral-100">
                  <dt className="text-neutral-500 mb-0.5">Diễn giải chi tiết</dt>
                  <dd className="text-ink">
                    {booking.termination.terminationReason}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-xs text-neutral-500">
              Đơn hàng không có thông tin hủy hoặc từ chối.
            </p>
          )}
        </section>
      </div>

      {/* Giao dịch thanh toán */}
      <section className="bg-white border border-neutral-200 rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-ink">
            Giao dịch thanh toán
          </h2>
        </div>
        {Array.isArray(booking.paymentTransactions) &&
        booking.paymentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold">Mã tham chiếu</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Cần thu
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Thực nhận
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Cần hoàn
                  </th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {booking.paymentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {PAYMENT_KIND_LABELS[tx.kind] || tx.kind}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 tabular-nums">
                      {tx.merchantReference || '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatVnd(tx.expectedAmountVnd)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                      {formatVnd(tx.receivedAmountVnd)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                      {tx.refundDueVnd ? formatVnd(tx.refundDueVnd) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={tx.status}
                        configMap={PAYMENT_STATUS_CONFIG}
                      />
                    </td>
                    <td className="px-4 py-3 text-neutral-500 tabular-nums">
                      {formatDateTimeVi(tx.succeededAt || tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-xs text-neutral-500">
            Chưa phát sinh giao dịch thanh toán cho đơn này.
          </p>
        )}
      </section>

      {/* Lịch sử trạng thái & Nhật ký can thiệp quản trị */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white border border-neutral-200 rounded-md overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center gap-2">
            <History className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-ink">
              Lịch sử trạng thái
            </h2>
          </div>
          {Array.isArray(booking.statusHistory) &&
          booking.statusHistory.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {booking.statusHistory.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-ink">
                      {item.fromStatus
                        ? `${BOOKING_STATUS_CONFIG[item.fromStatus]?.label || item.fromStatus} → `
                        : ''}
                      {BOOKING_STATUS_CONFIG[item.toStatus]?.label ||
                        item.toStatus}
                    </p>
                    {item.note && (
                      <p className="text-neutral-600">{item.note}</p>
                    )}
                  </div>
                  <div className="text-right text-neutral-400 shrink-0">
                    <p>
                      {ACTOR_TYPE_LABELS[item.actorType] || 'Hệ thống'}
                      {item.actorDisplayName ? ` · ${item.actorDisplayName}` : ''}
                    </p>
                    <p className="tabular-nums">
                      {formatDateTimeVi(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-xs text-neutral-500">
              Chưa có lịch sử chuyển trạng thái.
            </p>
          )}
        </section>

        <section className="bg-white border border-neutral-200 rounded-md overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-ink">
              Nhật ký can thiệp quản trị
            </h2>
          </div>
          {Array.isArray(booking.adminAuditLogs) &&
          booking.adminAuditLogs.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {booking.adminAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-5 py-3 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-ink">
                      {AUDIT_ACTION_LABELS[log.action] || log.action}
                    </p>
                    {log.reason && (
                      <p className="text-neutral-600">{log.reason}</p>
                    )}
                  </div>
                  <div className="text-right text-neutral-400 shrink-0">
                    <p>{log.adminDisplayName || 'Quản trị viên'}</p>
                    <p className="tabular-nums">
                      {formatDateTimeVi(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-xs text-neutral-500">
              Chưa có thao tác can thiệp quản trị nào trên đơn này.
            </p>
          )}
        </section>
      </div>

      <AdminBookingActionModal
        isOpen={Boolean(actionMode)}
        mode={actionMode}
        booking={booking}
        onClose={() => setActionMode(null)}
        onConfirm={handleConfirmAction}
      />
    </div>
  )
}

export default AdminBookingDetailPage
