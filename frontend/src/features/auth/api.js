import { http } from '../../lib/http'

/**
 * Đăng nhập khách hàng bằng email và mật khẩu.
 * Phản hồi 200: { account, accessToken, tokenType, expiresAt } và cookie HttpOnly NESTIFY_REFRESH.
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ account: object, accessToken: string, tokenType: string, expiresAt: string }>}
 */
export const login = async ({ email, password }) => {
  const body = {
    email: email.trim(),
    password,
  }

  const response = await http.post('/auth/login', body)
  return response.data
}

/**
 * Đăng xuất khỏi hệ thống: Thu hồi chuỗi refresh token hiện tại và xóa cookie.
 * Phản hồi 204: No Content.
 * @returns {Promise<void>}
 */
export const logout = async () => {
  await http.post('/auth/logout')
}

/**
 * Lấy thông tin tài khoản đang đăng nhập (principal).
 * Yêu cầu Authorization Bearer access JWT.
 * @returns {Promise<{ id: number, email: string, displayName: string, status: string, accountType: string }>}
 */
export const getMe = async () => {
  const response = await http.get('/auth/me')
  return response.data
}

/**
 * Đăng ký tài khoản khách hàng mới.
 * @param {{ email: string, password: string, displayName: string, phone?: string }} payload
 * @returns {Promise<{ email: string, registrationToken: string, expiresAt: string, resendAvailableAt: string }>}
 */
export const registerCustomer = async ({ email, password, displayName, phone }) => {
  const body = {
    email: email.trim(),
    password,
    displayName: displayName.trim(),
    phone: phone?.trim() ? phone.trim() : undefined,
  }

  const response = await http.post('/auth/register/customer', body)
  return response.data
}

/**
 * Xác thực email bằng mã OTP 6 số và registrationToken.
 * @param {{ email: string, code: string, registrationToken: string }} payload
 * @returns {Promise<{ id: number, email: string, displayName: string, status: string, accountType: string }>}
 */
export const verifyEmail = async ({ email, code, registrationToken }) => {
  const body = {
    email: email.trim(),
    code: code.trim(),
    registrationToken,
  }

  const response = await http.post('/auth/verify-email', body)
  return response.data
}

/**
 * Gửi lại mã OTP xác thực email.
 * @param {{ email: string, registrationToken: string }} payload
 * @returns {Promise<{ email: string, registrationToken: string, expiresAt: string, resendAvailableAt: string }>}
 */
export const resendVerification = async ({ email, registrationToken }) => {
  const body = {
    email: email.trim(),
    registrationToken,
  }

  const response = await http.post('/auth/resend-verification', body)
  return response.data
}
