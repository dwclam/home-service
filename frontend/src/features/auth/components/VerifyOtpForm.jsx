import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { RotateCw, ArrowLeft, Mail } from 'lucide-react'

import { verifyEmail, resendVerification } from '../api'
import { Button } from '../../../components/ui/Button'

/**
 * Tính số giây còn lại tính từ thời điểm ISO resendAvailableAt đến hiện tại.
 */
const calculateRemainingSeconds = (targetIso) => {
  if (!targetIso) return 60
  try {
    const targetTime = new Date(targetIso).getTime()
    const now = Date.now()
    const diff = Math.ceil((targetTime - now) / 1000)
    return diff > 0 ? diff : 0
  } catch {
    return 60
  }
}

export const VerifyOtpForm = ({ initialData }) => {
  const navigate = useNavigate()

  // State thông tin phiên đăng ký
  const [email] = useState(initialData?.email || '')
  const [registrationToken, setRegistrationToken] = useState(
    initialData?.registrationToken || ''
  )

  // State nhập liệu OTP 6 ô vuông
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  // State trạng thái mạng và thông báo
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isOtpError, setIsOtpError] = useState(false)
  const [isExpiredSession, setIsExpiredSession] = useState(false)

  // Đếm ngược gửi lại mã OTP
  const [countdown, setCountdown] = useState(() =>
    calculateRemainingSeconds(initialData?.resendAvailableAt)
  )

  // Tự động focus vào ô đầu tiên khi render
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  // Bộ đếm lùi thời gian gửi lại mã
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  // Xử lý khi gõ từng ký tự vào ô
  const handleDigitChange = (index, value) => {
    setIsOtpError(false)
    const cleanDigit = value.replace(/\D/g, '')

    // Nếu người dùng paste chuỗi vào 1 ô lẻ
    if (cleanDigit.length > 1) {
      handlePaste(cleanDigit)
      return
    }

    const nextOtp = [...otp]
    nextOtp[index] = cleanDigit
    setOtp(nextOtp)

    // Tự động nhảy sang ô tiếp theo nếu đã nhập số
    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Xử lý phím Backspace và phím mũi tên
  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Hỗ trợ Paste mã 6 số từ Clipboard
  const handlePaste = (pastedData) => {
    setIsOtpError(false)
    const rawData =
      typeof pastedData === 'string'
        ? pastedData
        : pastedData.clipboardData.getData('text')

    const cleanNumbers = rawData.replace(/\D/g, '').slice(0, 6)
    if (!cleanNumbers) return

    const digits = cleanNumbers.split('')
    const nextOtp = ['', '', '', '', '', '']
    digits.forEach((digit, i) => {
      if (i < 6) nextOtp[i] = digit
    })
    setOtp(nextOtp)

    // Di chuyển con trỏ tới vị trí hợp lý
    const focusIndex = Math.min(digits.length, 5)
    inputRefs.current[focusIndex]?.focus()
  }

  // Gửi mã OTP lên backend xác thực
  const handleVerify = async (e) => {
    if (e) e.preventDefault()
    setIsOtpError(false)

    const fullCode = otp.join('')
    if (fullCode.length !== 6) {
      setIsOtpError(true)
      toast.error('Vui lòng nhập đủ 6 chữ số mã xác thực.')
      return
    }

    if (!registrationToken) {
      setIsOtpError(true)
      setIsExpiredSession(true)
      toast.error('Thiếu mã phiên đăng ký. Vui lòng đăng ký lại.')
      return
    }

    setIsVerifying(true)
    try {
      await verifyEmail({
        email,
        code: fullCode,
        registrationToken,
      })

      // Xóa thông tin pending trong sessionStorage sau khi xác thực thành công
      try {
        sessionStorage.removeItem('nestify_pending_registration')
      } catch (err) {
        console.warn('Cannot clear sessionStorage:', err)
      }

      toast.success('Xác thực tài khoản thành công! Vui lòng đăng nhập.')
      navigate('/login', {
        state: { verifiedEmail: email },
        replace: true,
      })
    } catch (error) {
      setIsOtpError(true)
      const errorData = error.response?.data
      const code = errorData?.code
      let message

      if (code === 'OTP_INVALID') {
        message = 'Mã xác thực không chính xác hoặc đã hết hạn.'
      } else if (code === 'OTP_ATTEMPTS_EXCEEDED') {
        message =
          'Bạn đã nhập sai quá 5 lần. Mã cũ đã bị vô hiệu hóa, vui lòng gửi lại mã mới.'
      } else if (code === 'REGISTRATION_INVALID') {
        message = 'Phiên đăng ký không còn hợp lệ. Vui lòng quay lại đăng ký từ đầu.'
        setIsExpiredSession(true)
      } else {
        message =
          errorData?.message || 'Không thể xác thực OTP lúc này. Vui lòng thử lại.'
      }

      toast.error(message)
    } finally {
      setIsVerifying(false)
    }
  }

  // Gửi lại mã OTP
  const handleResend = async () => {
    if (countdown > 0 || isResending) return
    setIsOtpError(false)
    setIsResending(true)

    try {
      const response = await resendVerification({
        email,
        registrationToken,
      })

      // Cập nhật lại registrationToken và resendAvailableAt nếu server cấp lại
      if (response.registrationToken) {
        setRegistrationToken(response.registrationToken)
      }
      if (response.resendAvailableAt) {
        setCountdown(calculateRemainingSeconds(response.resendAvailableAt))
      } else {
        setCountdown(60)
      }

      // Reset các ô nhập OTP
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()

      toast.success('Mã OTP mới đã được gửi vào hộp thư của bạn!')
    } catch (error) {
      const errorData = error.response?.data
      const code = errorData?.code

      if (code === 'OTP_RESEND_TOO_SOON') {
        toast.error('Vui lòng đợi thêm trước khi yêu cầu gửi lại mã.')
      } else if (code === 'REGISTRATION_INVALID') {
        const message = 'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.'
        toast.error(message)
        setIsExpiredSession(true)
      } else {
        toast.error(
          errorData?.message || 'Gửi lại mã thất bại. Vui lòng thử lại sau.'
        )
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Thông tin người nhận email */}
      <div className="w-full p-4 mb-6 bg-neutral-100 rounded-md border border-neutral-200 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
          <Mail className="w-4 h-4" />
        </div>
        <div className="text-sm font-sans">
          <p className="text-neutral-500">Mã xác nhận 6 số đã được gửi tới:</p>
          <p className="font-semibold text-ink break-all">{email || 'Địa chỉ email của bạn'}</p>
        </div>
      </div>

      {/* Form nhập 6 ô OTP */}
      <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
        <div
          className="flex justify-center gap-2 sm:gap-3 mb-6 w-full"
          onPaste={handlePaste}
        >
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isVerifying || isExpiredSession}
              aria-label={`Chữ số thứ ${index + 1}`}
              className={`
                w-11 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-sans text-ink
                bg-white border rounded-md outline-none transition-colors duration-150
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
                disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed
                ${digit ? 'border-primary-500' : 'border-neutral-200'}
                ${isOtpError ? 'border-red-400' : ''}
              `.trim().replace(/\s+/g, ' ')}
            />
          ))}
        </div>

        {/* Nút xác nhận */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isVerifying}
          disabled={otp.join('').length !== 6 || isExpiredSession}
          className="mb-4"
        >
          Xác thực tài khoản
        </Button>
      </form>

      {/* Phần gửi lại mã OTP */}
      <div className="flex items-center justify-between w-full pt-2 text-sm font-sans border-t border-neutral-200">
        <span className="text-neutral-500">Chưa nhận được mã?</span>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || isResending || isExpiredSession}
          className={`
            inline-flex items-center gap-1.5 font-semibold transition-colors duration-150 cursor-pointer
            ${
              countdown > 0 || isResending || isExpiredSession
                ? 'text-neutral-400 cursor-not-allowed'
                : 'text-primary-500 hover:text-primary-600 underline-offset-4 hover:underline'
            }
          `.trim()}
        >
          <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
          {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại mã ngay'}
        </button>
      </div>

      {/* Quay lại trang đăng ký */}
      <div className="pt-6">
        <Link
          to="/register"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-ink font-sans transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại form đăng ký
        </Link>
      </div>
    </div>
  )
}

export default VerifyOtpForm
