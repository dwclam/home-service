import { z } from 'zod'
import { COMPLAINT_CATEGORY } from '../../constants/status'

/**
 * Schema tạo yêu cầu hỗ trợ / khiếu nại của khách hàng (UC39).
 * Khớp CreateComplaintRequest.java:
 * - category: PAYMENT | SERVICE | OTHER (@NotNull)
 * - bookingId: Long (tùy chọn)
 * - subject: 5..200 ký tự (@NotBlank)
 * - description: 10..2000 ký tự (@NotBlank)
 */
export const createComplaintSchema = z.object({
  category: z.enum(
    [
      COMPLAINT_CATEGORY.PAYMENT,
      COMPLAINT_CATEGORY.SERVICE,
      COMPLAINT_CATEGORY.OTHER,
    ],
    {
      message: 'Vui lòng chọn danh mục hỗ trợ',
    }
  ),
  bookingId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().positive('Mã đơn hàng không hợp lệ').optional()
  ),
  subject: z
    .string()
    .trim()
    .min(5, 'Tiêu đề yêu cầu phải từ 5 đến 200 ký tự')
    .max(200, 'Tiêu đề yêu cầu tối đa 200 ký tự'),
  description: z
    .string()
    .trim()
    .min(10, 'Nội dung mô tả phải từ 10 đến 2000 ký tự')
    .max(2000, 'Nội dung mô tả tối đa 2000 ký tự'),
})

/**
 * Schema gửi tin nhắn trong cuộc trò chuyện hỗ trợ (UC39).
 * Khớp SendMessageRequest.java: body @NotBlank, 1..2000 ký tự.
 */
export const sendSupportMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Nội dung tin nhắn không được để trống')
    .max(2000, 'Nội dung tin nhắn tối đa 2000 ký tự'),
})
