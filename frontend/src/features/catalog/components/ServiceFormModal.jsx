import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Save,
} from 'lucide-react'

import { providerServiceSchema } from '../schemas'
import { SERVICE_STATUS } from '../../../constants/status'
import { FormField } from '../../../components/ui/FormField'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'

export const ServiceFormModal = ({
  isOpen,
  onClose,
  onSubmitService,
  initialData = null,
  categories = [],
}) => {
  const isEditing = Boolean(initialData?.id)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(providerServiceSchema),
    defaultValues: {
      title: '',
      categoryId: categories[0]?.id || 1,
      basePriceVnd: 250000,
      durationMinutes: 60,
      description: '',
      status: SERVICE_STATUS.DRAFT,
      images: [],
    },
  })

  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: 'images',
  })

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({
        title: initialData.title || '',
        categoryId: initialData.categoryId || categories[0]?.id || 1,
        basePriceVnd: initialData.basePriceVnd ?? 250000,
        durationMinutes: initialData.durationMinutes ?? 60,
        description: initialData.description || '',
        status: initialData.status || SERVICE_STATUS.DRAFT,
        images: (initialData.images || []).map((img, index) => ({
          id: img.id,
          imageUrl: img.imageUrl || '',
          altText: img.altText || '',
          sortOrder: img.sortOrder ?? index,
        })),
      })
    } else {
      reset({
        title: '',
        categoryId: categories[0]?.id || 1,
        basePriceVnd: 250000,
        durationMinutes: 60,
        description: '',
        status: SERVICE_STATUS.DRAFT,
        images: [],
      })
    }
  }, [isOpen, initialData, categories, reset])

  if (!isOpen) return null

  const handleFormSubmit = async (values) => {
    const normalizedImages = (values.images || []).map((img, idx) => ({
      ...img,
      sortOrder: idx,
    }))
    await onSubmitService({
      ...values,
      images: normalizedImages,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-modal-title"
    >
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transition-all duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
          <div>
            <h3
              id="service-modal-title"
              className="text-[17px] font-semibold text-ink"
            >
              {isEditing
                ? 'Chỉnh sửa gói dịch vụ (UC19)'
                : 'Tạo gói dịch vụ mới (UC19)'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Giá cố định theo đồng VND nguyên; sửa gói không đổi giá trên đơn cũ đã chụp snapshot.
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
          className="flex-1 overflow-y-auto p-6 space-y-5"
          noValidate
        >
          <FormField
            label="Tên gói dịch vụ"
            htmlFor="service-title"
            required
            error={errors.title?.message}
          >
            <Input
              id="service-title"
              placeholder="Ví dụ: Vệ sinh & bảo dưỡng điều hòa treo tường trọn gói"
              {...register('title')}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Danh mục dịch vụ (UC30)"
              htmlFor="service-category"
              required
              error={errors.categoryId?.message}
            >
              <select
                id="service-category"
                className="w-full h-10 px-3 text-[15px] font-sans text-ink bg-white rounded-md border border-neutral-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                {...register('categoryId')}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Trạng thái hiển thị"
              htmlFor="service-status"
              required
              error={errors.status?.message}
            >
              <select
                id="service-status"
                className="w-full h-10 px-3 text-[15px] font-sans text-ink bg-white rounded-md border border-neutral-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                {...register('status')}
              >
                <option value={SERVICE_STATUS.DRAFT}>
                  Bản nháp (DRAFT - Chưa nhận đơn)
                </option>
                <option value={SERVICE_STATUS.PUBLISHED}>
                  Công khai (PUBLISHED - Cho phép đặt lịch)
                </option>
                <option value={SERVICE_STATUS.ARCHIVED}>
                  Lưu trữ (ARCHIVED - Ngừng nhận đơn mới)
                </option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Giá niêm yết cố định (VND)"
              htmlFor="service-price"
              required
              error={errors.basePriceVnd?.message}
              hint="Số nguyên đồng VND, ví dụ: 250000"
            >
              <Input
                id="service-price"
                type="number"
                step="1000"
                min="10000"
                placeholder="250000"
                {...register('basePriceVnd')}
              />
            </FormField>

            <FormField
              label="Thời lượng thực hiện dự kiến (Phút)"
              htmlFor="service-duration"
              required
              error={errors.durationMinutes?.message}
              hint="Dùng để tính khung lịch rảnh phù hợp (UC38)"
            >
              <Input
                id="service-duration"
                type="number"
                step="15"
                min="15"
                placeholder="60"
                {...register('durationMinutes')}
              />
            </FormField>
          </div>

          <FormField
            label="Mô tả quy trình & Phạm vi công việc"
            htmlFor="service-description"
            required
            error={errors.description?.message}
          >
            <textarea
              id="service-description"
              rows={4}
              placeholder="Nêu rõ các bước thực hiện, vật tư bao gồm và điều kiện bảo hành..."
              className={`w-full rounded-md border px-3 py-2.5 text-[15px] font-sans text-ink bg-white outline-none transition-colors duration-150 placeholder:text-neutral-400 ${
                errors.description
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
              }`}
              {...register('description')}
            />
          </FormField>

          {/* Quản lý danh sách ảnh & Thứ tự ảnh (service_images) */}
          <div className="pt-2 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-ink">
                  Hình ảnh gói dịch vụ & Thứ tự hiển thị ({fields.length}/6)
                </h4>
                <p className="text-xs text-neutral-500">
                  Ảnh vị trí đầu tiên (#1) được dùng làm ảnh bìa hiển thị ngoài danh sách.
                </p>
              </div>

              {fields.length < 6 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    append({
                      imageUrl: '',
                      altText: '',
                      sortOrder: fields.length,
                    })
                  }
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Thêm ảnh
                </Button>
              )}
            </div>

            {fields.length === 0 ? (
              <div className="p-4 rounded-md bg-neutral-50 border border-dashed border-neutral-200 text-center text-xs text-neutral-500">
                Chưa có hình ảnh minh họa. Nhấn &ldquo;Thêm ảnh&rdquo; để đính kèm URL hình ảnh thực tế.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-3 rounded-md bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 text-xs font-semibold text-ink">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => swap(index, index - 1)}
                        className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40 cursor-pointer"
                        title="Đưa lên trước"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === fields.length - 1}
                        onClick={() => swap(index, index + 1)}
                        className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40 cursor-pointer"
                        title="Đưa xuống sau"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                      <div>
                        <Input
                          placeholder="https://example.com/anh-dich-vu.jpg"
                          leftIcon={<ImageIcon className="w-4 h-4" />}
                          error={Boolean(errors.images?.[index]?.imageUrl)}
                          {...register(`images.${index}.imageUrl`)}
                        />
                        {errors.images?.[index]?.imageUrl && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.images[index].imageUrl.message}
                          </p>
                        )}
                      </div>

                      <Input
                        placeholder="Mô tả ngắn (alt text)"
                        {...register(`images.${index}.altText`)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 rounded-md text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                      aria-label="Xóa ảnh"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
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
              {isEditing ? 'Lưu thay đổi' : 'Tạo gói dịch vụ'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ServiceFormModal
