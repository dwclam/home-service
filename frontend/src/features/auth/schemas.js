import { z } from 'zod'

/**
 * Schema xác thực form đăng nhập tài khoản.
 * Yêu cầu email đúng định dạng và mật khẩu không để trống.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email không được để trống')
    .email('Địa chỉ email không đúng định dạng')
    .max(254, 'Email tối đa 254 ký tự'),

  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống'),
})

/**
 * Schema xác thực form đăng ký tài khoản khách hàng.
 * Tuân thủ hợp đồng backend: email chuẩn, password 8-72 ký tự, displayName tối đa 150 ký tự.
 */
export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Họ và tên không được để trống')
      .max(150, 'Họ và tên tối đa 150 ký tự'),

    email: z
      .string()
      .trim()
      .min(1, 'Email không được để trống')
      .email('Địa chỉ email không đúng định dạng')
      .max(254, 'Email tối đa 254 ký tự'),

    phone: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) =>
          !val ||
          /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(val.replace(/[\s.-]/g, '')),
        'Số điện thoại không hợp lệ (ví dụ: 0901234567)'
      ),

    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(72, 'Mật khẩu không được vượt quá 72 ký tự'),

    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận lại mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

/**
 * Schema xác thực mã OTP gửi về email khách hàng.
 * Mã gồm đúng 6 chữ số theo định dạng do server sinh ra.
 */
export const verifyOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập đủ 6 chữ số mã xác thực')
    .length(6, 'Mã xác thực phải gồm đúng 6 chữ số')
    .regex(/^\d{6}$/, 'Mã xác thực chỉ chứa các chữ số từ 0 đến 9'),
})
