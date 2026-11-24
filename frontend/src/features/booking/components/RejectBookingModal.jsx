import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, XCircle } from 'lucide-react'

import { rejectBookingSchema } from '../schemas'
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

export const RejectBookingModal = ({
  isOpen,
  booking,
  onClose,
  onConfirmReject,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rejectBookingSchema),
    defaultValues: {
      version: 0,
      reason: '',
    },
  })

  useEffect(() => {
    if (isOpen && booking) {
      reset({
        version: booking.version ?? 0,
        reason: '',
      })
    }
  }, [isOpen, booking, reset])

  if (!isOpen || !booking) return null

  const onFormSubmit = async (values) => {
    await onConfirmReject(booking.id, {
      version: Number(values.version),
      reason: values.reason.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-booking-modal-title"
    >
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg overflow-hidden transition-all duration-200">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h3
            id="reject-booking-modal-title"
            className="text-[17px] font-semibold text-ink"
          >
            Từ chối đơn {booking.bookingCode}
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

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="p-6 space-y-5"
          noValidate
        >
          <input type="hidden" {...register('version')} />

          <div className="p-4 rounded-md bg-neutral-50 border border-neutral-200 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">{booking.serviceTitle}</span>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 pt-1 border-t border-neutral-200">
              <span>Giờ hẹn: {formatDateTimeVi(booking.startsAt)}</span>
              <span>
                Giá trị đơn:{' '}
                <strong className="text-ink">
                  {formatVnd(booking.totalAmountVnd)}
                </strong>
              </span>
            </div>
          </div>

          <FormField
            label="Lý do từ chối"
            htmlFor="reject-reason"
            required
            error={errors.reason?.message}
          >
            <textarea
              id="reject-reason"
              rows={3}
              placeholder="Nhập lý do từ chối..."
              className={`w-full rounded-md border px-3 py-2.5 text-[15px] font-sans text-ink bg-white outline-none transition-colors duration-150 placeholder:text-neutral-400 ${
                errors.reason
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
              }`}
              {...register('reason')}
            />
          </FormField>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Quay lại
            </Button>

            <Button
              type="submit"
              variant="danger"
              isLoading={isSubmitting}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Xác nhận từ chối
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RejectBookingModal
