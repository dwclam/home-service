import { z } from 'zod'

/**
 * Hàm tiện ích chuyển đổi tiếng Việt có dấu thành slug URL chuẩn.
 * Ví dụ: "Sửa chữa điện lạnh" -> "sua-chua-dien-lanh"
 */
export const slugifyVietnamese = (text) => {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Schema xác thực form tạo mới / chỉnh sửa danh mục dịch vụ.
 * Khớp với CreateCategoryRequest của backend.
 */
export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên danh mục không được để trống')
    .max(100, 'Tên danh mục tối đa 100 ký tự'),

  slug: z
    .string()
    .trim()
    .min(1, 'Slug định danh không được để trống')
    .max(120, 'Slug tối đa 120 ký tự')
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Slug chỉ chứa chữ thường, số và dấu gạch ngang phân cách (ví dụ: dien-lanh)'
    ),

  description: z
    .string()
    .trim()
    .max(500, 'Mô tả danh mục tối đa 500 ký tự')
    .optional()
    .or(z.literal('')),

  iconName: z
    .string()
    .trim()
    .max(50, 'Tên icon tối đa 50 ký tự')
    .optional()
    .or(z.literal('')),

  sortOrder: z.coerce
    .number({ invalid_type_error: 'Thứ tự sắp xếp phải là số nguyên' })
    .int('Thứ tự sắp xếp phải là số nguyên')
    .min(0, 'Thứ tự sắp xếp phải lớn hơn hoặc bằng 0')
    .default(0),

  parentId: z.coerce
    .number()
    .nullable()
    .optional(),
})
