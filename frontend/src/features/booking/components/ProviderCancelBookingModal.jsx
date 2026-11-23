import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, AlertTriangle } from 'lucide-react'

import { providerCancelBookingSchema } from '../schemas'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'

const QUICK_CANCEL_REASONS = [
  'Kỹ thuật viên gặp sự cố di chuyển, không thể tới đúng giờ hẹn.',
  'Thiết bị hoặc linh kiện chuyên dụng gặp trục trặc đột xuất.',
  'Sự cố bất khả kháng về nhân sự trong khung giờ đã nhận.',
]

export const ProviderCancelBookingModal = ({
  isOpen,
  booking,
  onClose,
  onConfirmCancel,
}) => {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(providerCancelBookingSchema),
    defaultValues: {
      version: booking?.version ?? 0,
      reason: '',
    },
  })

  const reasonValue = useWatch({ control, name: 'reason' }) || ''

  useEffect(() => {
    if (isOpen && booking) {
      reset({
        version: booking.version ?? 0,
        reason: '',
      })
    }
  }, [isOpen, booking, reset])

  if (!isOpen || !booking) return null

  const onSubmit = async (values) => {
    await onConfirmCancel(booking.id, {
      version: booking.version ?? values.version,
      reason: values.reason.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-cancel-modal-title"
    >
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h3
            id="provider-cancel-modal-title"
            className="text-[17px] font-semibold text-ink"
          >
            Hủy đơn đã nhận
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
            <p className="font-semibold text-ink">{booking.serviceTitle}</p>
            <p className="text-xs text-neutral-500 mt-1">
              Mã đơn: {booking.bookingCode}
              {booking.recipientName ? ` · Khách: ${booking.recipientName}` : ''}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>
              Hành động này sẽ hoàn trả 100% tiền cọc cho khách hàng nếu đơn đã
              đặt cọc, đồng thời mở lại khung giờ rảnh và không thể hoàn tác.
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-neutral-600">
              Chọn nhanh lý do
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CANCEL_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setValue('reason', preset, { shouldValidate: true })
                  }
                  className="text-left text-xs px-2.5 py-1.5 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 hover:text-ink transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <FormField
            label="Lý do hủy đơn"
            htmlFor="provider-cancel-reason"
            required
            error={errors.reason?.message}
          >
            <textarea
              id="provider-cancel-reason"
              rows={3}
              {...register('reason')}
              placeholder="Nhập lý do cụ thể gửi tới khách hàng..."
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
              variant="danger"
              size="md"
              isLoading={isSubmitting}
            >
              Xác nhận hủy đơn
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProviderCancelBookingModal
