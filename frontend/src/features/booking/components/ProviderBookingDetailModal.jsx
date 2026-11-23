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
} from 'lucide-react'

import { BOOKING_STATUS } from '../../../constants/status'
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
  onOpenStart,
  onOpenComplete,
}) => {
  if (!isOpen || !booking) return null

  const isExpiredRequest =
    booking.status === BOOKING_STATUS.PENDING_PROVIDER &&
    booking.requestExpiresAt &&
    new Date(booking.requestExpiresAt).getTime() <= nowMs

  const isTooEarlyToStart =
    booking.status === BOOKING_STATUS.CONFIRMED &&
    booking.startsAt &&
    nowMs < new Date(booking.startsAt).getTime()

  const timelineItems = [
    { label: 'Tạo yêu cầu', value: booking.createdAt },
    { label: 'Hạn phản hồi', value: booking.requestExpiresAt },
    { label: 'Nhận đơn', value: booking.acceptedAt },
    { label: 'Hạn đặt cọc', value: booking.depositDueAt },
    { label: 'Giờ hẹn bắt đầu', value: booking.startsAt },
    { label: 'Giờ hẹn kết thúc', value: booking.endsAt },
    { label: 'Thực tế bắt đầu', value: booking.startedAt },
    { label: 'Thực tế hoàn thành', value: booking.completedAt },
    { label: 'Hạn thanh toán phần còn lại', value: booking.balanceDueAt },
    { label: 'Thời điểm kết thúc', value: booking.terminatedAt },
  ].filter((item) => Boolean(item.value))

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
            Chi tiết đơn {booking.bookingCode}
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
          <div className="p-4 rounded-md bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Gói dịch vụ
              </span>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-base font-bold text-ink">{booking.serviceTitle}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                <strong>Bắt đầu:</strong> {formatDateTimeVi(booking.startsAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-600" />
                <strong>Kết thúc:</strong> {formatDateTimeVi(booking.endsAt)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-md border border-neutral-200 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary-600" />
                <span>Khách hàng & Địa chỉ</span>
              </p>
              <p className="font-semibold text-ink">{booking.recipientName}</p>
              <p className="text-xs text-neutral-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span>{booking.recipientPhone}</span>
              </p>
              <p className="text-xs text-neutral-600 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                <span>
                  {booking.addressLine}
                  {booking.ward ? `, ${booking.ward}` : ''}, {booking.city}
                </span>
              </p>
              {booking.addressInstructions && (
                <p className="text-xs text-neutral-500 pt-1 border-t border-neutral-100">
                  <strong>Hướng dẫn:</strong> {booking.addressInstructions}
                </p>
              )}
              {booking.customerNote && (
                <p className="text-xs text-neutral-600 pt-1 border-t border-neutral-100">
                  <strong>Ghi chú:</strong> {booking.customerNote}
                </p>
              )}
            </div>

            <div className="p-4 rounded-md border border-neutral-200 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary-600" />
                <span>Chi tiết thanh toán</span>
              </p>
              <dl className="space-y-1.5 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Tổng giá gói:</dt>
                  <dd className="font-bold text-ink text-sm">
                    {formatVnd(booking.totalAmountVnd)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Tiền cọc giữ lịch:</dt>
                  <dd className="font-semibold text-primary-600">
                    {formatVnd(booking.depositAmountVnd)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Thanh toán sau hoàn thành:</dt>
                  <dd className="font-semibold text-ink">
                    {formatVnd(booking.balanceAmountVnd)}
                  </dd>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200">
                  <dt className="text-neutral-500">Phí nền tảng:</dt>
                  <dd className="font-medium text-neutral-600">
                    {formatVnd(booking.platformFeeAmountVnd)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-700 font-medium">
                    Thực nhận dự kiến:
                  </dt>
                  <dd className="font-bold text-emerald-700">
                    {formatVnd(booking.providerPayoutAmountVnd)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="p-4 rounded-md border border-neutral-200 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary-600" />
              <span>Lịch sử thời gian</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {timelineItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-1 border-b border-neutral-100"
                >
                  <span className="text-neutral-500">{item.label}:</span>
                  <span className="font-semibold text-ink">
                    {formatDateTimeVi(item.value)}
                  </span>
                </div>
              ))}
            </div>

            {booking.providerServiceNote && (
              <p className="text-xs text-neutral-600 pt-2">
                <strong>Ghi chú kỹ thuật viên:</strong> {booking.providerServiceNote}
              </p>
            )}

            {booking.terminationReason && (
              <p className="text-xs text-red-700 pt-2">
                <strong>Lý do kết thúc:</strong> {booking.terminationReason}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {booking.status === BOOKING_STATUS.PENDING_PROVIDER && (
              <>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={isExpiredRequest}
                  onClick={() => {
                    onClose()
                    onOpenReject(booking)
                  }}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Từ chối
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isExpiredRequest}
                  onClick={() => {
                    onClose()
                    onAccept(booking)
                  }}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Chấp nhận
                </Button>
              </>
            )}

            {booking.status === BOOKING_STATUS.CONFIRMED && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isTooEarlyToStart}
                onClick={() => {
                  onClose()
                  onOpenStart(booking)
                }}
                leftIcon={<Play className="w-3.5 h-3.5" />}
              >
                Bắt đầu dịch vụ
              </Button>
            )}

            {booking.status === BOOKING_STATUS.IN_PROGRESS && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose()
                  onOpenComplete(booking)
                }}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Hoàn thành dịch vụ
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProviderBookingDetailModal
