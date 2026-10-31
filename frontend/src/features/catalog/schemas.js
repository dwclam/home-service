import { z } from 'zod'
import { SERVICE_STATUS } from '../../constants/status'

/**
 * Schema ảnh của gói dịch vụ (khớp bảng service_images).
 */
export const serviceImageItemSchema = z.object({
  id: z.number().optional(),
  imageUrl: z
    .string()
    .trim()
    .min(1, 'Đường dẫn ảnh không được để trống')
    .refine(
      (val) => /^https?:\/\/.+/i.test(val),
      'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://'
    ),
  altText: z
    .string()
    .trim()
    .max(250, 'Mô tả ảnh tối đa 250 ký tự')
    .optional()
    .or(z.literal('')),
  sortOrder: z.coerce
    .number()
    .int('Thứ tự ảnh phải là số nguyên')
    .min(0, 'Thứ tự ảnh không được âm')
    .default(0),
})

/**
 * Schema tạo/cập nhật gói dịch vụ của Nhà cung cấp (UC19).
 * Khớp với bảng services (ServiceOffering.java):
 * - title: NOT NULL, tối đa 200 ký tự
 * - categoryId: NOT NULL (chọn từ danh mục hoạt động)
 * - description: NOT NULL
 * - basePriceVnd: số nguyên dương đồng VND (không dùng số thực)
 * - durationMinutes: số nguyên dương phút (> 0)
 * - status: DRAFT | PUBLISHED | ARCHIVED
 */
export const providerServiceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Tên gói dịch vụ phải có ít nhất 5 ký tự')
    .max(200, 'Tên gói dịch vụ tối đa 200 ký tự'),

  categoryId: z.coerce
    .number({ invalid_type_error: 'Vui lòng chọn danh mục dịch vụ' })
    .int('Danh mục không hợp lệ')
    .positive('Vui lòng chọn danh mục dịch vụ hợp lệ'),

  basePriceVnd: z.coerce
    .number({ invalid_type_error: 'Giá niêm yết phải là số nguyên VND' })
    .int('Giá dịch vụ phải là số nguyên đồng (VND), không dùng số thập phân')
    .min(10000, 'Giá dịch vụ tối thiểu 10.000 đồng')
    .max(100000000, 'Giá dịch vụ vượt quá giới hạn cho phép'),

  durationMinutes: z.coerce
    .number({ invalid_type_error: 'Thời lượng phải là số nguyên phút' })
    .int('Thời lượng phải là số nguyên phút')
    .min(15, 'Thời lượng thực hiện tối thiểu 15 phút')
    .max(720, 'Thời lượng thực hiện tối đa 720 phút (12 giờ)'),

  description: z
    .string()
    .trim()
    .min(15, 'Mô tả chi tiết gói dịch vụ phải có ít nhất 15 ký tự')
    .max(3000, 'Mô tả chi tiết tối đa 3000 ký tự'),

  status: z.enum(
    [
      SERVICE_STATUS.DRAFT,
      SERVICE_STATUS.PUBLISHED,
      SERVICE_STATUS.ARCHIVED,
    ],
    {
      message: 'Trạng thái dịch vụ không hợp lệ',
    }
  ),

  images: z.array(serviceImageItemSchema).max(6, 'Tối đa 6 ảnh cho một gói dịch vụ').default([]),
})
