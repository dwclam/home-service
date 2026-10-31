import { z } from 'zod'

/**
 * Schema xác thực dữ liệu tạo đơn đặt lịch của khách hàng (UC08).
 * Khớp với CreateBookingRequest.java và quy tắc nghiệp vụ MD01:
 * - startsAt phải cách hiện tại ít nhất 60 phút.
 * - Nếu chọn từ sổ địa chỉ (addressMode === 'SAVED'): bắt buộc addressId.
 * - Nếu nhập địa chỉ trực tiếp (addressMode === 'MANUAL'): bắt buộc recipientName, recipientPhone, addressLine, city.
 */
export const createBookingSchema = z
  .object({
    serviceId: z.coerce
      .number({ invalid_type_error: 'Vui lòng chọn gói dịch vụ' })
      .int()
      .positive('Vui lòng chọn gói dịch vụ hợp lệ'),

    providerId: z.coerce
      .number({ invalid_type_error: 'Thiếu thông tin nhà cung cấp' })
      .int()
      .positive('Nhà cung cấp không hợp lệ'),

    appointmentDate: z
      .string()
      .min(1, 'Vui lòng chọn ngày hẹn thực hiện dịch vụ'),

    appointmentTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Giờ hẹn không hợp lệ (định dạng HH:mm)'
      ),

    addressMode: z.enum(['SAVED', 'MANUAL']).default('SAVED'),

    addressId: z.coerce.number().optional(),

    recipientName: z
      .string()
      .trim()
      .max(150, 'Tên người liên hệ tối đa 150 ký tự')
      .optional()
      .or(z.literal('')),

    recipientPhone: z
      .string()
      .trim()
      .max(32, 'Số điện thoại tối đa 32 ký tự')
      .optional()
      .or(z.literal('')),

    addressLine: z
      .string()
      .trim()
      .max(300, 'Địa chỉ chi tiết tối đa 300 ký tự')
      .optional()
      .or(z.literal('')),

    ward: z
      .string()
      .trim()
      .max(150, 'Phường/Xã tối đa 150 ký tự')
      .optional()
      .or(z.literal('')),

    city: z
      .string()
      .trim()
      .max(150, 'Tỉnh/Thành phố tối đa 150 ký tự')
      .optional()
      .or(z.literal('')),

    addressInstructions: z
      .string()
      .trim()
      .max(500, 'Hướng dẫn đường đi tối đa 500 ký tự')
      .optional()
      .or(z.literal('')),

    customerNote: z
      .string()
      .trim()
      .max(1000, 'Ghi chú cho thợ tối đa 1000 ký tự')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // 1. Kiểm tra quy tắc Lead-time MD01: startsAt >= now + 60 phút
    if (data.appointmentDate && data.appointmentTime) {
      const selectedDate = new Date(
        `${data.appointmentDate}T${data.appointmentTime}:00`
      )
      if (Number.isNaN(selectedDate.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['appointmentTime'],
          message: 'Thời điểm hẹn không hợp lệ',
        })
      } else {
        const minAllowedTime = Date.now() + 60 * 60 * 1000 // +60 phút
        if (selectedDate.getTime() < minAllowedTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['appointmentTime'],
            message:
              'Thời gian đặt lịch phải cách thời điểm hiện tại ít nhất 60 phút (Quy tắc MD01)',
          })
        }
      }
    }

    // 2. Kiểm tra điều kiện địa chỉ
    if (data.addressMode === 'SAVED') {
      if (!data.addressId || Number(data.addressId) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['addressId'],
          message: 'Vui lòng chọn một địa chỉ từ sổ địa chỉ hoặc chuyển sang nhập mới',
        })
      }
    } else {
      if (!data.recipientName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientName'],
          message: 'Tên người nhận dịch vụ không được để trống',
        })
      }
      if (!data.recipientPhone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientPhone'],
          message: 'Số điện thoại người liên hệ không được để trống',
        })
      } else if (
        !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(
          data.recipientPhone.replace(/[\s.-]/g, '')
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientPhone'],
          message: 'Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0901234567)',
        })
      }
      if (!data.addressLine?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['addressLine'],
          message: 'Số nhà, ngõ, tên đường không được để trống',
        })
      }
      if (!data.city?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['city'],
          message: 'Tỉnh / Thành phố không được để trống',
        })
      }
    }
  })

/**
 * Schema xác thực yêu cầu hủy đơn đặt lịch của khách hàng (UC11).
 * Khớp với CancelBookingRequest.java:
 * - version: @NotNull Long
 * - reason: @Size(max = 500) String (tùy chọn)
 */
export const cancelBookingSchema = z.object({
  version: z.coerce.number().int().min(0, 'Phiên bản bản ghi (version) không hợp lệ'),
  reason: z
    .string()
    .trim()
    .max(500, 'Lý do hủy tối đa 500 ký tự')
    .optional()
    .or(z.literal('')),
})
