import { http } from '../../lib/http'

/**
 * Nộp hồ sơ đăng ký nhà cung cấp mới (UC16).
 * Endpoint: POST /api/provider-applications
 * Response 201: { email, status: "PENDING_EMAIL", registrationToken, expiresAt, resendAvailableAt }
 *
 * @param {{
 *   email: string,
 *   applicantName: string,
 *   phone: string,
 *   businessName: string,
 *   city: string,
 *   description: string,
 *   documentUrl: string
 * }} data
 * @returns {Promise<{
 *   email: string,
 *   status: string,
 *   registrationToken: string,
 *   expiresAt: string,
 *   resendAvailableAt: string
 * }>}
 */
export const submitProviderApplication = async (data) => {
  const body = {
    email: data.email.trim(),
    applicantName: data.applicantName.trim(),
    phone: data.phone.trim(),
    businessName: data.businessName.trim(),
    city: data.city.trim(),
    description: data.description.trim(),
    documentUrl: data.documentUrl.trim(),
  }

  const response = await http.post('/provider-applications', body)
  return response.data
}

/**
 * Xác thực email hồ sơ nhà cung cấp bằng OTP 6 số (UC36).
 * Endpoint: POST /api/provider-applications/verify-email
 * Response 200: { email, status: "PENDING_REVIEW" }
 *
 * @param {{ email: string, code: string, registrationToken: string }} payload
 * @returns {Promise<{ email: string, status: string }>}
 */
export const verifyProviderEmail = async ({ email, code, registrationToken }) => {
  const body = {
    email: email.trim(),
    code: code.trim(),
    registrationToken,
  }

  const response = await http.post('/provider-applications/verify-email', body)
  return response.data
}

/**
 * Gửi lại mã OTP xác thực email cho hồ sơ nhà cung cấp (UC36).
 * Endpoint: POST /api/provider-applications/resend-verification
 * Response 200: { email, status: "PENDING_EMAIL", registrationToken, expiresAt, resendAvailableAt }
 *
 * @param {{ email: string, registrationToken: string }} payload
 * @returns {Promise<{
 *   email: string,
 *   status: string,
 *   registrationToken: string,
 *   expiresAt: string,
 *   resendAvailableAt: string
 * }>}
 */
export const resendProviderVerification = async ({ email, registrationToken }) => {
  const body = {
    email: email.trim(),
    registrationToken,
  }

  const response = await http.post('/provider-applications/resend-verification', body)
  return response.data
}
