import { z } from 'zod'
import { AVAILABILITY_STATE } from '../../constants/status'

/**
 * Schema cập nhật hồ sơ công khai của Nhà cung cấp (UC18).
 * Khớp với bảng provider_profiles:
 * - business_name: NOT NULL, tối đa 200 ký tự
 * - city: NOT NULL, tối đa 150 ký tự
 * - bio, address, logo_url: TEXT (tùy chọn)
 * - is_visible: BOOLEAN
 * Không cho phép tự chỉnh sửa trạng thái xét duyệt hoặc ngân hàng qua form này.
 */
export const providerProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Tên đơn vị / cửa hàng phải có ít nhất 2 ký tự')
    .max(200, 'Tên đơn vị / cửa hàng tối đa 200 ký tự'),

  city: z
    .string()
    .trim()
    .min(2, 'Vui lòng nhập Tỉnh / Thành phố hoạt động')
    .max(150, 'Tên Tỉnh / Thành phố tối đa 150 ký tự'),

  address: z
    .string()
    .trim()
    .max(500, 'Địa chỉ chi tiết tối đa 500 ký tự')
    .optional()
    .or(z.literal('')),

  bio: z
    .string()
    .trim()
    .max(2000, 'Giới thiệu năng lực tối đa 2000 ký tự')
    .optional()
    .or(z.literal('')),

  logoUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^https?:\/\/.+/i.test(val),
      'Đường dẫn ảnh đại diện phải bắt đầu bằng http:// hoặc https://'
    ),

  isVisible: z.boolean().default(true),
})

/**
 * Schema tạo/cập nhật khoảng lịch rảnh của Nhà cung cấp (UC20).
 * Khớp với bảng provider_availability:
 * - Khoảng thời gian nửa mở [startsAt, endsAt): endsAt phải lớn hơn startsAt ít nhất 30 phút.
 * - state: AVAILABLE | BLOCKED.
 */
export const providerAvailabilitySchema = z
  .object({
    date: z.string().min(1, 'Vui lòng chọn ngày áp dụng'),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Giờ bắt đầu không hợp lệ (HH:mm)'),
    endTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Giờ kết thúc không hợp lệ (HH:mm)'
      ),
    state: z.enum([AVAILABILITY_STATE.AVAILABLE, AVAILABILITY_STATE.BLOCKED], {
      message: 'Trạng thái lịch không hợp lệ',
    }),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return false
      const [sh, sm] = data.startTime.split(':').map(Number)
      const [eh, em] = data.endTime.split(':').map(Number)
      return eh * 60 + em - (sh * 60 + sm) >= 30
    },
    {
      message:
        'Giờ kết thúc phải sau giờ bắt đầu ít nhất 30 phút theo quy ước khoảng [bắt đầu, kết thúc)',
      path: ['endTime'],
    }
  )
