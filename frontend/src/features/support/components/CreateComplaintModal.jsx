import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'

import { createComplaintSchema } from '../schemas'
import { getMyCustomerBookings } from '../../booking/api'
import {
  COMPLAINT_CATEGORY,
  COMPLAINT_CATEGORY_LABELS,
} from '../../../constants/status'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { FormField } from '../../../components/ui/FormField'

export const CreateComplaintModal = ({
  isOpen,
  defaultBookingId = '',
  onClose,
  onSubmitComplaint,
}) => {
  const [recentBookings, setRecentBookings] = useState([])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createComplaintSchema),
    defaultValues: {
      category: COMPLAINT_CATEGORY.SERVICE,
      bookingId: defaultBookingId || '',
      subject: '',
      description: '',
    },
  })

  const descriptionValue = useWatch({ control, name: 'description' }) || ''

  useEffect(() => {
    if (!isOpen) return
    reset({
      category: COMPLAINT_CATEGORY.SERVICE,
      bookingId: defaultBookingId || '',
      subject: '',
      description: '',
    })

    let isMounted = true
    getMyCustomerBookings({ page: 0, size: 30 })
      .then((res) => {
        if (isMounted) {
          setRecentBookings(res.items || [])
        }
      })
      .catch(() => {
        // Optional dropdown, ignore if empty
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, defaultBookingId, reset])

  if (!isOpen) return null

  const onSubmit = async (values) => {
    await onSubmitComplaint(values)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-complaint-modal-title"
    >
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
          <h3
            id="create-complaint-modal-title"
            className="text-[17px] font-semibold text-ink"
          >
            Tạo yêu cầu hỗ trợ
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
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-4 overflow-y-auto"
        >
          <FormField
            label="Danh mục hỗ trợ"
            htmlFor="complaint-category"
            required
            error={errors.category?.message}
          >
            <Select id="complaint-category" {...register('category')}>
              {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Đơn đặt lịch liên quan"
            htmlFor="complaint-booking-id"
            error={errors.bookingId?.message}
          >
            <Select id="complaint-booking-id" {...register('bookingId')}>
              <option value="">Không gắn đơn hàng cụ thể</option>
              {recentBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingCode} — {b.serviceTitle}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Tiêu đề yêu cầu"
            htmlFor="complaint-subject"
            required
            error={errors.subject?.message}
          >
            <Input
              id="complaint-subject"
              {...register('subject')}
              placeholder="Ví dụ: Cần hỗ trợ hoàn tiền đơn đặt lịch..."
            />
          </FormField>

          <FormField
            label="Nội dung chi tiết"
            htmlFor="complaint-description"
            required
            error={errors.description?.message}
          >
            <textarea
              id="complaint-description"
              rows={4}
              {...register('description')}
              placeholder="Mô tả rõ vấn đề bạn gặp phải để bộ phận hỗ trợ xử lý nhanh hơn..."
              className="w-full rounded-md border border-neutral-200 px-3.5 py-2.5 text-sm text-ink placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
            <div className="mt-1 flex justify-end text-[11px] text-neutral-400 tabular-nums">
              {descriptionValue.length}/2000
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
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Gửi yêu cầu
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateComplaintModal
