import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, AlertTriangle, PauseCircle, PlayCircle } from 'lucide-react'

import {
  adminCancelBookingSchema,
  adminSettlementActionSchema,
} from '../schemas'
import { BOOKING_STATUS } from '../../../constants/status'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'

export const AdminBookingActionModal = ({
  isOpen,
  mode,
  booking,
  onClose,
  onConfirm,
}) => {
  const isCancel = mode === 'CANCEL'
  const isHold = mode === 'HOLD'
  const isInProgress = booking?.status === BOOKING_STATUS.IN_PROGRESS
  const fixedReasonCode = isInProgress
    ? 'PROVIDER_UNABLE_TO_CONTINUE'
    : 'SYSTEM_CANCEL'

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(
      isCancel ? adminCancelBookingSchema : adminSettlementActionSchema
    ),
    defaultValues: isCancel
      ? { reasonCode: fixedReasonCode, reason: '' }
      : { reason: '' },
  })

  const reasonValue = useWatch({ control, name: 'reason' }) || ''

  useEffect(() => {
    if (isOpen && booking) {
      reset(
        isCancel
          ? {
              reasonCode:
                booking.status === BOOKING_STATUS.IN_PROGRESS
                  ? 'PROVIDER_UNABLE_TO_CONTINUE'
                  : 'SYSTEM_CANCEL',
              reason: '',
            }
          : { reason: '' }
      )
    }
  }, [isOpen, booking, isCancel, reset])

  if (!isOpen || !booking) return null

  const title = isCancel
    ? 'Can thiệp hủy đơn đặt lịch'
    : isHold
      ? 'Tạm giữ đối soát đơn hàng'
      : 'Mở lại đối soát đơn hàng'

  const submitLabel = isCancel
    ? 'Xác nhận hủy đơn'
    : isHold
      ? 'Xác nhận tạm giữ'
      : 'Xác nhận mở lại'

  const onSubmit = async (values) => {
    if (isCancel) {
      await onConfirm({
        mode: 'CANCEL',
        reasonCode: values.reasonCode,
        reason: values.reason.trim(),
        version: booking.version,
      })
    } else {
      await onConfirm({
        mode,
        reason: values.reason.trim(),
        version: booking.version,
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-booking-action-title"
    >
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h3
            id="admin-booking-action-title"
            className="text-[17px] font-semibold text-ink"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-100 cursor-pointer"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-200 text-sm">
            <p className="font-semibold text-ink">
              {booking.serviceTitleSnapshot || booking.serviceTitle}
            </p>
            <p className="text-xs text-neutral-500 mt-1 tabular-nums">
              Mã đơn: {booking.bookingCode}
            </p>
          </div>

          {isCancel && (
            <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-1">
                <p className="font-semibold">
                  {isInProgress
                    ? 'Hủy đơn đang thực hiện do nhà cung cấp gặp sự cố bất khả kháng'
                    : 'Hủy đơn trước khi thực hiện bởi quản trị hệ thống'}
                </p>
                <p>
                  Nếu đơn đã thu tiền cọc, hệ thống sẽ ghi nhận nghĩa vụ hoàn
                  100% tiền cọc cho khách hàng và lưu vết kiểm toán quản trị.
                </p>
              </div>
            </div>
          )}

          {isHold && (
            <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5 leading-relaxed">
              <PauseCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Đơn hàng sẽ chuyển sang trạng thái tạm giữ đối soát để chặn chi
                trả cho nhà cung cấp trong quá trình xử lý khiếu nại hoặc sai lệch.
              </span>
            </div>
          )}

          {!isCancel && !isHold && (
            <div className="p-3.5 rounded-md bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-start gap-2.5 leading-relaxed">
              <PlayCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
              <span>
                Đơn hàng sẽ được gỡ tạm giữ đối soát và quay về trạng thái chờ
                đối soát để tiếp tục quy trình thanh quyết toán.
              </span>
            </div>
          )}

          <FormField
            label="Lý do thực hiện"
            htmlFor="admin-action-reason"
            required
            error={errors.reason?.message}
          >
            <textarea
              id="admin-action-reason"
              rows={3}
              {...register('reason')}
              placeholder="Nhập lý do chi tiết (tối thiểu 5 ký tự) để lưu vào nhật ký quản trị..."
              className="w-full rounded-md border border-neutral-200 px-3.5 py-2.5 text-sm text-ink placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
            <div className="mt-1 flex justify-end text-[11px] text-neutral-400 tabular-nums">
              {reasonValue.length}/500
            </div>
          </FormField>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              variant={isCancel ? 'danger' : 'primary'}
              size="md"
              isLoading={isSubmitting}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminBookingActionModal
