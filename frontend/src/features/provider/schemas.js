import { z } from 'zod'
import { AVAILABILITY_STATE } from '../../constants/status'

/**
 * Schema cập nhật hồ sơ công khai của Nhà cung cấp (UC18).
 * Khớp chính xác UpdateProviderProfileRequest.java của Cường:
 * - businessName: @NotBlank, @Size(max = 200)
 * - city: @NotBlank, @Size(max = 150)
 * - bio, address, logoUrl: tùy chọn
 * Không bao gồm trường ngân hàng hay isVisible/visible trong request sửa.
 */
export const providerProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, 'Tên cơ sở không được để trống')
    .max(200, 'Tên cơ sở tối đa 200 ký tự'),

  city: z
    .string()
    .trim()
    .min(1, 'Thành phố không được để trống')
    .max(150, 'Thành phố tối đa 150 ký tự'),

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
})

/**
 * Schema tạo/cập nhật khoảng lịch rảnh của Nhà cung cấp (UC20).
 * Khớp với CreateAvailabilitySlotRequest.java & UpdateAvailabilitySlotRequest.java:
 * - Khoảng thời gian nửa mở [startsAt, endsAt): startsAt < endsAt và endsAt ở tương lai.
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
        'Giờ kết thúc phải lớn hơn giờ bắt đầu ít nhất 30 phút theo quy ước khoảng [bắt đầu, kết thúc)',
      path: ['endTime'],
    }
  )
