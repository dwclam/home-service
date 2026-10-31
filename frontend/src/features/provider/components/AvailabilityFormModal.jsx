import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Calendar, Clock, Save } from 'lucide-react'

import { providerAvailabilitySchema } from '../schemas'
import { AVAILABILITY_STATE } from '../../../constants/status'
import { FormField } from '../../../components/ui/FormField'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'

const toLocalParts = (isoStr) => {
  if (!isoStr) {
    return {
      date: '2026-11-05',
      time: '08:00',
    }
  }
  const d = new Date(isoStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  }
}

export const AvailabilityFormModal = ({
  isOpen,
  onClose,
  onSubmitSlot,
  initialSlot = null,
}) => {
  const isEditing = Boolean(initialSlot?.id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(providerAvailabilitySchema),
    defaultValues: {
      date: '2026-11-05',
      startTime: '08:00',
      endTime: '12:00',
      state: AVAILABILITY_STATE.AVAILABLE,
    },
  })

  useEffect(() => {
    if (!isOpen) return
    if (initialSlot) {
      const startParts = toLocalParts(initialSlot.startsAt)
      const endParts = toLocalParts(initialSlot.endsAt)
      reset({
        date: startParts.date,
        startTime: startParts.time,
        endTime: endParts.time,
        state: initialSlot.state || AVAILABILITY_STATE.AVAILABLE,
      })
    } else {
      reset({
        date: '2026-11-05',
        startTime: '08:00',
        endTime: '12:00',
        state: AVAILABILITY_STATE.AVAILABLE,
      })
    }
  }, [isOpen, initialSlot, reset])

  if (!isOpen) return null

  const handleFormSubmit = async (values) => {
    const startsAtIso = new Date(
      `${values.date}T${values.startTime}:00`
    ).toISOString()
    const endsAtIso = new Date(
      `${values.date}T${values.endTime}:00`
    ).toISOString()

    await onSubmitSlot({
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      state: values.state,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="availability-modal-title"
    >
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg overflow-hidden transition-all duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3
              id="availability-modal-title"
              className="text-[17px] font-semibold text-ink"
            >
              {isEditing
                ? 'Cập nhật khung lịch (UC20)'
                : 'Thêm khung lịch rảnh / khóa lịch (UC20)'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Quy ước nửa mở [bắt đầu, kết thúc): ca kết thúc 10:00 không chặn ca bắt đầu 10:00.
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
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-6 space-y-5"
          noValidate
        >
          <FormField
            label="Ngày áp dụng"
            htmlFor="slot-date"
            required
            error={errors.date?.message}
          >
            <Input
              id="slot-date"
              type="date"
              leftIcon={<Calendar className="w-4 h-4" />}
              {...register('date')}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Giờ bắt đầu"
              htmlFor="slot-start"
              required
              error={errors.startTime?.message}
            >
              <Input
                id="slot-start"
                type="time"
                leftIcon={<Clock className="w-4 h-4" />}
                {...register('startTime')}
              />
            </FormField>

            <FormField
              label="Giờ kết thúc"
              htmlFor="slot-end"
              required
              error={errors.endTime?.message}
            >
              <Input
                id="slot-end"
                type="time"
                leftIcon={<Clock className="w-4 h-4" />}
                {...register('endTime')}
              />
            </FormField>
          </div>

          <FormField
            label="Trạng thái khung giờ"
            htmlFor="slot-state"
            required
            error={errors.state?.message}
            hint="Chọn Khóa lịch (BLOCKED) nếu bạn bận đột xuất trong khung giờ chưa có đơn giữ chỗ."
          >
            <select
              id="slot-state"
              className="w-full h-10 px-3 text-[15px] font-sans text-ink bg-white rounded-md border border-neutral-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              {...register('state')}
            >
              <option value={AVAILABILITY_STATE.AVAILABLE}>
                Mở nhận việc (AVAILABLE)
              </option>
              <option value={AVAILABILITY_STATE.BLOCKED}>
                Khóa lịch tạm nghỉ (BLOCKED)
              </option>
            </select>
          </FormField>

          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isEditing ? 'Lưu khung lịch' : 'Thêm khung lịch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AvailabilityFormModal
