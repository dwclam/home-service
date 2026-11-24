import { useEffect, useState } from 'react'
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Wallet,
  FileText,
  Check,
  XCircle,
  Play,
  CheckCircle2,
  Ban,
  History,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import { getProviderBookingDetail } from '../api'
import {
  BOOKING_STATUS,
  BOOKING_STATUS_CONFIG,
  ACTOR_TYPE_LABELS,
  TERMINATION_REASON_LABELS,
} from '../../../constants/status'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Button } from '../../../components/ui/Button'

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

export const ProviderBookingDetailModal = ({
  isOpen,
  booking,
  nowMs,
  onClose,
  onAccept,
  onOpenReject,
  onOpenCancel,
  onOpenStart,
  onOpenComplete,
}) => {
  const [detailState, setDetailState] = useState({
    bookingId: null,
    version: null,
    data: null,
    error: '',
  })

  const bookingId = booking?.id ?? null
  const bookingVersion = booking?.version ?? null

  useEffect(() => {
    if (!isOpen || !bookingId) return

    let isMounted = true

    getProviderBookingDetail(bookingId)
      .then((res) => {
        if (isMounted) {
          setDetailState({
            bookingId,
            version: bookingVersion,
            data: res?.data || null,
            error: '',
          })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setDetailState({
            bookingId,
            version: bookingVersion,
            data: null,
            error:
              error?.response?.data?.message ||
              'Không thể tải đầy đủ chi tiết đơn hàng.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, bookingId, bookingVersion])

  if (!isOpen || !booking) return null

  const isCurrentDetailLoaded =
    detailState.bookingId === bookingId &&
    detailState.version === bookingVersion
  const isLoadingDetail = !isCurrentDetailLoaded
  const detail = isCurrentDetailLoaded ? detailState.data : null
  const detailError = isCurrentDetailLoaded ? detailState.error : ''

  const current = detail ? { ...booking, ...detail } : booking

  const isExpiredRequest =
    current.status === BOOKING_STATUS.PENDING_PROVIDER &&
    current.requestExpiresAt &&
    new Date(current.requestExpiresAt).getTime() <= nowMs

  const isTooEarlyToStart =
    current.status === BOOKING_STATUS.CONFIRMED &&
    current.startsAt &&
    nowMs < new Date(current.startsAt).getTime()

  const canProviderCancel =
    current.status === BOOKING_STATUS.PENDING_DEPOSIT ||
    current.status === BOOKING_STATUS.CONFIRMED

  const timelineItems = [
    { label: 'Tạo yêu cầu', value: current.createdAt },
    { label: 'Hạn phản hồi', value: current.requestExpiresAt },
    { label: 'Nhận đơn', value: current.acceptedAt },
    { label: 'Hạn đặt cọc', value: current.depositDueAt },
    { label: 'Giờ hẹn bắt đầu', value: current.startsAt },
    { label: 'Giờ hẹn kết thúc', value: current.endsAt },
    { label: 'Thực tế bắt đầu', value: current.startedAt },
    { label: 'Thực tế hoàn thành', value: current.completedAt },
    { label: 'Hạn thanh toán phần còn lại', value: current.balanceDueAt },
    { label: 'Thời điểm kết thúc', value: current.terminatedAt },
  ].filter((item) => Boolean(item.value))

  const addressParts = [current.addressLine, current.ward, current.city].filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-booking-detail-title"
    >
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
          <h3
            id="provider-booking-detail-title"
            className="text-[17px] font-semibold text-ink"
          >
            Chi tiết đơn {current.bookingCode}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-100 cursor-pointer"
            aria-label="Đóng chi tiết đơn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto text-sm">
          {isLoadingDetail && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
              <span>Đang tải đầy đủ thông tin đơn hàng...</span>
            </div>
          )}

          {detailError && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{detailError}</span>
            </div>
          )}

          <div className="p-4 rounded-md bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Gói dịch vụ
              </span>
              <StatusBadge status={current.status} />
            </div>
            <p className="text-base font-bold text-ink">{current.serviceTitle}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                <strong>Bắt đầu:</strong> {formatDateTimeVi(current.startsAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-600" />
                <strong>Kết thúc:</strong> {formatDateTimeVi(current.endsAt)}
              </span>
              {current.durationMinutes != null && (
                <span>
                  <strong>Thời lượng:</strong> {current.durationMinutes} phút
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-md border border-neutral-200 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary-600" />
                <span>Khách hàng & Địa chỉ</span>
              </p>
              <p className="font-semibold text-ink">
                {current.recipientName || current.customerName || '—'}
              </p>
              {current.recipientPhone && (
                <p className="text-xs text-neutral-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="tabular-nums">{current.recipientPhone}</span>
                </p>
              )}
              {addressParts.length > 0 && (
                <p className="text-xs text-neutral-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                  <span>{addressParts.join(', ')}</span>
                </p>
              )}
              {current.addressInstructions && (
                <p className="text-xs text-neutral-500 italic">
                  Chỉ dẫn: {current.addressInstructions}
                </p>
              )}
            </div>

            <div className="p-4 rounded-md border border-neutral-200 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary-600" />
                <span>Giá trị đơn hàng</span>
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tổng giá trị đơn</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatVnd(current.totalAmountVnd)}
                  </span>
                </div>
                {current.depositAmountVnd != null && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tiền cọc</span>
                    <span className="font-semibold text-primary-600 tabular-nums">
                      {formatVnd(current.depositAmountVnd)}
                    </span>
                  </div>
                )}
                {current.balanceAmountVnd != null && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Phần còn lại</span>
                    <span className="font-medium text-neutral-700 tabular-nums">
                      {formatVnd(current.balanceAmountVnd)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {current.customerNote && (
            <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-200 space-y-1">
              <p className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                <span>Ghi chú từ khách hàng</span>
              </p>
              <p className="text-xs text-neutral-700 leading-relaxed">
                {current.customerNote}
              </p>
            </div>
          )}

          {current.terminationReason && (
            <div className="p-3.5 rounded-md bg-red-50 border border-red-200 space-y-1">
              <p className="text-xs font-semibold text-red-700">
                Lý do kết thúc đơn
                {current.terminationReasonCode &&
                  ` · ${TERMINATION_REASON_LABELS[current.terminationReasonCode] || ''}`}
              </p>
              <p className="text-xs text-red-600">{current.terminationReason}</p>
            </div>
          )}

          {timelineItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Các mốc thời gian
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {timelineItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-2 rounded-md bg-neutral-50 border border-neutral-200"
                  >
                    <span className="text-neutral-500">{item.label}</span>
                    <span className="font-medium text-ink tabular-nums">
                      {formatDateTimeVi(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(current.history) && current.history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary-600" />
                <span>Lịch sử trạng thái</span>
              </p>
              <div className="border border-neutral-200 rounded-md divide-y divide-neutral-100">
                {current.history.map((item, idx) => (
                  <div
                    key={`${item.createdAt}-${idx}`}
                    className="px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-ink">
                        {item.fromStatus
                          ? `${BOOKING_STATUS_CONFIG[item.fromStatus]?.label || item.fromStatus} → `
                          : ''}
                        {BOOKING_STATUS_CONFIG[item.toStatus]?.label || item.toStatus}
                      </p>
                      {item.note && (
                        <p className="text-neutral-500">{item.note}</p>
                      )}
                    </div>
                    <div className="text-neutral-400 shrink-0 sm:text-right">
                      <p>{ACTOR_TYPE_LABELS[item.actorType] || 'Hệ thống'}</p>
                      <p className="tabular-nums">{formatDateTimeVi(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          {current.status === BOOKING_STATUS.PENDING_PROVIDER && (
            <>
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<XCircle className="w-4 h-4" />}
                disabled={Boolean(isExpiredRequest)}
                onClick={() => {
                  onClose()
                  onOpenReject?.(current)
                }}
              >
                Từ chối
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Check className="w-4 h-4" />}
                disabled={Boolean(isExpiredRequest)}
                onClick={() => {
                  onClose()
                  onAccept?.(current)
                }}
              >
                Chấp nhận đơn
              </Button>
            </>
          )}

          {canProviderCancel && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              leftIcon={<Ban className="w-4 h-4" />}
              onClick={() => {
                onClose()
                onOpenCancel?.(current)
              }}
            >
              Hủy đơn
            </Button>
          )}

          {current.status === BOOKING_STATUS.CONFIRMED && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Play className="w-4 h-4" />}
              disabled={Boolean(isTooEarlyToStart)}
              onClick={() => {
                onClose()
                onOpenStart?.(current)
              }}
            >
              Bắt đầu dịch vụ
            </Button>
          )}

          {current.status === BOOKING_STATUS.IN_PROGRESS && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => {
                onClose()
                onOpenComplete?.(current)
              }}
            >
              Hoàn thành dịch vụ
            </Button>
          )}

          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProviderBookingDetailModal
