import { z } from 'zod'

/**
 * Schema xác thực dữ liệu tạo yêu cầu đặt lịch dịch vụ.
 */
export const createBookingSchema = z
  .object({
    serviceId: z.coerce.number().positive('Vui lòng chọn một dịch vụ'),
    providerId: z.coerce.number().positive('Nhà cung cấp không hợp lệ'),

    bookingDate: z
      .string()
      .trim()
      .min(1, 'Vui lòng chọn ngày thực hiện dịch vụ'),

    bookingTime: z
      .string()
      .trim()
      .min(1, 'Vui lòng chọn khung giờ hẹn'),

    recipientName: z
      .string()
      .trim()
      .min(1, 'Họ và tên người nhận không được để trống')
      .max(150, 'Họ và tên tối đa 150 ký tự'),

    recipientPhone: z
      .string()
      .trim()
      .min(1, 'Số điện thoại người nhận không được để trống')
      .regex(
        /^(0|\+84)[3|5|7|8|9][0-9]{8}$/,
        'Số điện thoại không hợp lệ (ví dụ: 0912345678)'
      ),

    addressLine: z
      .string()
      .trim()
      .min(1, 'Địa chỉ chi tiết (số nhà, ngõ, tên đường) không được để trống')
      .max(255, 'Địa chỉ chi tiết tối đa 255 ký tự'),

    ward: z
      .string()
      .trim()
      .max(150, 'Phường / Xã tối đa 150 ký tự')
      .optional()
      .or(z.literal('')),

    city: z
      .string()
      .trim()
      .min(1, 'Tỉnh / Thành phố không được để trống')
      .max(150, 'Tỉnh / Thành phố tối đa 150 ký tự'),

    addressInstructions: z
      .string()
      .trim()
      .max(500, 'Chỉ dẫn đường đi tối đa 500 ký tự')
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
    if (!data.bookingDate || !data.bookingTime) return
    const appointmentTime = new Date(`${data.bookingDate}T${data.bookingTime}:00`).getTime()
    if (Number.isNaN(appointmentTime)) {
      ctx.addIssue({
        code: 'custom',
        path: ['bookingTime'],
        message: 'Ngày hoặc giờ hẹn không hợp lệ.',
      })
      return
    }
    const now = Date.now()
    if (appointmentTime <= now) {
      ctx.addIssue({
        code: 'custom',
        path: ['bookingTime'],
        message: 'Thời gian hẹn không được nằm trong quá khứ. Vui lòng chọn khung giờ khác.',
      })
      return
    }
    if (appointmentTime < now + 60 * 60 * 1000) {
      ctx.addIssue({
        code: 'custom',
        path: ['bookingTime'],
        message: 'Thời gian hẹn phải cách thời điểm hiện tại ít nhất 60 phút.',
      })
    }
  })

/**
 * Schema xác thực lý do hủy đơn của khách hàng (UC11).
 */
export const cancelBookingSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'Lý do hủy đơn tối đa 500 ký tự')
    .optional()
    .or(z.literal('')),
})
