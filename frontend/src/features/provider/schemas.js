import { z } from 'zod'
import { AVAILABILITY_STATE } from '../../constants/status'

/**
 * Kiểm tra tính hợp lệ của đường dẫn tài liệu Google Drive / Google Docs (UC16).
 */
const isValidGoogleDocsOrDriveUrl = (val) => {
  if (!val) return false
  try {
    const url = new URL(val)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    if (host !== 'drive.google.com' && host !== 'docs.google.com') return false
    if (url.username || url.password) return false
    if (url.port && url.port !== '443') return false
    if (!url.pathname || url.pathname === '/' || url.pathname.trim() === '') return false
    return true
  } catch {
    return false
  }
}

/**
 * Schema xác thực form nộp hồ sơ đăng ký nhà cung cấp (UC16).
 */
export const providerApplicationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email không được để trống')
    .email('Địa chỉ email không đúng định dạng')
    .max(254, 'Email tối đa 254 ký tự'),

  applicantName: z
    .string()
    .trim()
    .min(1, 'Họ và tên người đại diện không được để trống')
    .max(150, 'Họ và tên tối đa 150 ký tự'),

  phone: z
    .string()
    .trim()
    .min(1, 'Số điện thoại không được để trống')
    .max(32, 'Số điện thoại tối đa 32 ký tự')
    .regex(
      /^(0|\+84)[3|5|7|8|9][0-9]{8}$/,
      'Số điện thoại không hợp lệ (ví dụ: 0912345678 hoặc +84912345678)'
    ),

  businessName: z
    .string()
    .trim()
    .min(1, 'Tên cơ sở kinh doanh không được để trống')
    .max(200, 'Tên cơ sở kinh doanh tối đa 200 ký tự'),

  city: z
    .string()
    .trim()
    .min(1, 'Khu vực hoạt động không được để trống')
    .max(150, 'Khu vực hoạt động tối đa 150 ký tự'),

  description: z
    .string()
    .trim()
    .min(1, 'Mô tả dịch vụ không được để trống')
    .max(5000, 'Mô tả dịch vụ tối đa 5000 ký tự'),

  documentUrl: z
    .string()
    .trim()
    .min(1, 'Link tài liệu năng lực không được để trống')
    .max(2048, 'Link tài liệu tối đa 2048 ký tự')
    .refine(
      isValidGoogleDocsOrDriveUrl,
      'Tài liệu phải là link HTTPS Google Drive hoặc Google Docs hợp lệ (có thư mục hoặc tệp cụ thể).'
    ),
})

/**
 * Schema xác thực mã OTP xác thực email hồ sơ NCC (UC36).
 */
export const providerVerifyOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập đủ 6 chữ số mã xác thực')
    .length(6, 'Mã xác thực phải gồm đúng 6 chữ số')
    .regex(/^\d{6}$/, 'Mã xác thực chỉ chứa các chữ số từ 0 đến 9'),
})

/**
 * Schema cập nhật hồ sơ công khai của Nhà cung cấp (UC18).
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
      message: 'Giờ kết thúc phải lớn hơn giờ bắt đầu ít nhất 30 phút',
      path: ['endTime'],
    }
  )
