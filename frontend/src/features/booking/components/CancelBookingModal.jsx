import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, AlertTriangle, ShieldAlert, Ban } from 'lucide-react'

import { cancelBookingSchema } from '../schemas'
import { evaluateCancellationPolicy } from '../api'
import { FormField } from '../../../components/ui/FormField'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'

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

export const CancelBookingModal = ({
  isOpen,
  booking,
  onClose,
  onConfirmCancel,
}) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(cancelBookingSchema),
    defaultValues: {
      version: 0,
      reason: '',
    },
  })

  const watchedReason = useWatch({ control, name: 'reason' }) || ''

  useEffect(() => {
    if (isOpen && booking) {
      reset({
        version: booking.version ?? 0,
        reason: '',
      })
    }
  }, [isOpen, booking, reset])

  if (!isOpen || !booking) return null

  const evaluation = evaluateCancellationPolicy(booking, new Date())

  const onFormSubmit = async (values) => {
    if (!evaluation.canCancel) return
    await onConfirmCancel(booking.id, {
      version: Number(values.version),
      reason: values.reason,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-booking-modal-title"
    >
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg overflow-hidden transition-all duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3
              id="cancel-booking-modal-title"
              className="text-[17px] font-semibold text-ink"
            >
              Xác nhận hủy đơn đặt lịch (UC11)
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Mã đơn: <span className="font-semibold text-ink">{booking.bookingCode}</span> • Phiên bản (Version): #{booking.version ?? 0}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-100 cursor-pointer"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="p-6 space-y-5"
          noValidate
        >
          <input type="hidden" {...register('version')} />

          {/* Tóm tắt thông tin đơn */}
          <div className="p-4 rounded-md bg-neutral-50 border border-neutral-200 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-neutral-500">
                Trạng thái hiện tại:
              </span>
              <StatusBadge status={booking.status} />
            </div>
            <p className="font-semibold text-ink">{booking.serviceTitle}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 pt-1 border-t border-neutral-200">
              <span>Giờ hẹn: {formatDateTimeVi(booking.startsAt)}</span>
              <span>
                Tiền cọc (30%):{' '}
                <strong className="text-ink">
                  {formatVnd(booking.depositAmountVnd)}
                </strong>
              </span>
            </div>
          </div>

          {/* Cảnh báo chính sách hoàn cọc theo ma trận UC11 */}
          {evaluation.canCancel ? (
            <div
              className={`p-4 rounded-md border flex items-start gap-3 ${
                evaluation.policyType === 'LATE_CANCEL'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-sm mb-1">
                  {evaluation.summaryTitle}
                </p>
                <p>{evaluation.summaryDetail}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-sm mb-1">
                  Không đủ điều kiện tự hủy đơn
                </p>
                <p>{evaluation.reasonBlocked}</p>
              </div>
            </div>
          )}

          {/* Nhập lý do hủy (Tùy chọn, tối đa 500 ký tự) */}
          {evaluation.canCancel && (
            <FormField
              label="Lý do hủy đơn (Tùy chọn)"
              htmlFor="cancel-reason"
              error={errors.reason?.message}
              hint={`Tối đa 500 ký tự (${watchedReason.length}/500). Bạn có thể để trống nếu không muốn ghi chú.`}
            >
              <textarea
                id="cancel-reason"
                rows={3}
                placeholder="Ví dụ: Tôi có việc đột xuất vào khung giờ hẹn này, muốn đặt lại sang ngày khác..."
                className={`w-full rounded-md border px-3 py-2.5 text-[15px] font-sans text-ink bg-white outline-none transition-colors duration-150 placeholder:text-neutral-400 ${
                  errors.reason
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                }`}
                {...register('reason')}
              />
            </FormField>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Giữ lại đơn
            </Button>

            {evaluation.canCancel && (
              <Button
                type="submit"
                variant="danger"
                isLoading={isSubmitting}
                leftIcon={<Ban className="w-4 h-4" />}
              >
                Xác nhận hủy đơn
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default CancelBookingModal
