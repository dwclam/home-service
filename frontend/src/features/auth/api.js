import { http } from '../../lib/http'

/**
 * Đăng nhập khách hàng bằng email và mật khẩu.
 * Endpoint: POST /api/auth/login
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
 * Đăng nhập quản trị viên bằng email và mật khẩu.
 * Endpoint: POST /api/auth/login/admin
 */
export const loginAdmin = async ({ email, password }) => {
  const body = {
    email: email.trim(),
    password,
  }

  const response = await http.post('/auth/login/admin', body)
  return response.data
}

/**
 * Đăng nhập nhà cung cấp bằng email và mật khẩu.
 * Endpoint: POST /api/auth/login/provider
 */
export const loginProvider = async ({ email, password }) => {
  const body = {
    email: email.trim(),
    password,
  }

  const response = await http.post('/auth/login/provider', body)
  return response.data
}

/**
 * Đổi mật khẩu lần đầu cho tài khoản nhà cung cấp bằng passwordChangeToken tạm thời.
 * Endpoint: POST /api/auth/provider/first-password
 */
export const changeProviderFirstPassword = async ({
  currentPassword,
  newPassword,
  passwordChangeToken,
}) => {
  const body = {
    currentPassword,
    newPassword,
  }

  const response = await http.post('/auth/provider/first-password', body, {
    _skipRefresh: true,
    headers: {
      Authorization: `Bearer ${passwordChangeToken}`,
    },
  })
  return response.data
}

/**
 * Đăng xuất khỏi hệ thống: Thu hồi chuỗi refresh token hiện tại và xóa cookie.
 */
export const logout = async () => {
  await http.post('/auth/logout')
}

/**
 * Lấy thông tin tài khoản đang đăng nhập (principal).
 */
export const getMe = async () => {
  const response = await http.get('/auth/me')
  return response.data
}

/**
 * Đăng ký tài khoản khách hàng mới.
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
 */
export const resendVerification = async ({ email, registrationToken }) => {
  const body = {
    email: email.trim(),
    registrationToken,
  }

  const response = await http.post('/auth/resend-verification', body)
  return response.data
}
