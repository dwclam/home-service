import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { RotateCw, ArrowLeft, Mail, CheckCircle2, Building, ShieldCheck, Clock } from 'lucide-react'

import { verifyProviderEmail, resendProviderVerification } from '../api'
import { Button } from '../../../components/ui/Button'

/**
 * Tính số giây còn lại từ thời điểm ISO resendAvailableAt đến hiện tại.
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

export const ProviderVerifyOtpForm = ({ initialData }) => {
  // State dữ liệu phiên nộp hồ sơ
  const [email] = useState(initialData?.email || '')
  const [businessName] = useState(initialData?.businessName || '')
  const [registrationToken, setRegistrationToken] = useState(
    initialData?.registrationToken || ''
  )

  // State nhập liệu OTP 6 ô vuông
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  // State trạng thái mạng và tiến trình
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isOtpError, setIsOtpError] = useState(false)
  const [isPendingReview, setIsPendingReview] = useState(false)

  // Đếm ngược gửi lại mã OTP
  const [countdown, setCountdown] = useState(() =>
    calculateRemainingSeconds(initialData?.resendAvailableAt)
  )

  // Tự động focus vào ô đầu tiên khi render
  useEffect(() => {
    if (!isPendingReview && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [isPendingReview])

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

    // Di chuyển con trỏ tới vị trí ô số phù hợp
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
      toast.error('Thiếu mã phiên đăng ký. Vui lòng nộp lại hồ sơ.')
      return
    }

    setIsVerifying(true)
    try {
      const response = await verifyProviderEmail({
        email,
        code: fullCode,
        registrationToken,
      })

      // Xóa thông tin pending trong sessionStorage sau khi xác thực thành công
      try {
        sessionStorage.removeItem('nestify_pending_provider_app')
      } catch (err) {
        console.warn('Cannot clear sessionStorage:', err)
      }

      toast.success(
        'Xác thực email thành công! Hồ sơ của bạn đã được chuyển tới bộ phận xét duyệt.'
      )

      if (response?.status === 'PENDING_REVIEW' || !response?.status) {
        setIsPendingReview(true)
      }
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
        message =
          'Phiên nộp hồ sơ không còn hợp lệ hoặc đã quá hạn 24 giờ. Vui lòng nộp lại hồ sơ.'
      } else {
        message =
          errorData?.message ||
          'Không thể xác thực mã OTP lúc này. Vui lòng thử lại.'
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
      const response = await resendProviderVerification({
        email,
        registrationToken,
      })

      if (response?.registrationToken) {
        setRegistrationToken(response.registrationToken)
      }

      // Cập nhật lại thời gian đếm ngược
      const newRemaining = calculateRemainingSeconds(response?.resendAvailableAt)
      setCountdown(newRemaining > 0 ? newRemaining : 60)

      // Cập nhật sessionStorage
      try {
        const saved = sessionStorage.getItem('nestify_pending_provider_app')
        if (saved) {
          const parsed = JSON.parse(saved)
          sessionStorage.setItem(
            'nestify_pending_provider_app',
            JSON.stringify({
              ...parsed,
              registrationToken: response?.registrationToken || registrationToken,
              resendAvailableAt: response?.resendAvailableAt,
              expiresAt: response?.expiresAt,
            })
          )
        }
      } catch (storageError) {
        console.warn('Cannot update sessionStorage:', storageError)
      }

      // Reset các ô nhập OTP và focus ô đầu tiên
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()

      toast.success('Đã gửi lại mã OTP mới về email của bạn.')
    } catch (error) {
      const errorData = error.response?.data
      const code = errorData?.code
      let message

      if (code === 'OTP_RESEND_TOO_SOON') {
        message = 'Vui lòng chờ hết thời gian đếm ngược trước khi gửi lại mã.'
      } else if (code === 'OTP_ATTEMPTS_EXCEEDED') {
        message = 'Bạn đã yêu cầu gửi mã quá số lần quy định trong ngày.'
      } else if (code === 'REGISTRATION_INVALID') {
        message =
          'Phiên nộp hồ sơ không còn hợp lệ hoặc đã quá hạn. Vui lòng nộp lại hồ sơ.'
      } else {
        message =
          errorData?.message ||
          'Không thể gửi lại mã OTP lúc này. Vui lòng thử lại sau.'
      }

      toast.error(message)
    } finally {
      setIsResending(false)
    }
  }

  // Màn hình thông báo hồ sơ đang chờ duyệt trang trọng khi xác thực email thành công
  if (isPendingReview) {
    return (
      <div className="flex flex-col items-center text-center space-y-6 font-sans">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Clock className="w-3.5 h-3.5" />
            Chờ Quản trị viên xét duyệt
          </span>
          <h2 className="text-2xl font-display font-bold text-ink">
            Xác thực email thành công!
          </h2>
          <p className="text-sm text-neutral-600 max-w-md">
            Hồ sơ đăng ký đối tác của bạn đã được tiếp nhận và đang chờ Quản trị viên xét duyệt. Kết quả và thông tin kích hoạt tài khoản sẽ được gửi về email{' '}
            <strong className="text-ink">{email}</strong>.
          </p>
        </div>

        {/* Bảng tóm tắt thông tin hồ sơ */}
        <div className="w-full bg-neutral-50 rounded-md border border-neutral-200 p-4 text-left space-y-2.5 text-sm">
          {businessName && (
            <div className="flex items-center gap-2 text-neutral-700">
              <Building className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="text-neutral-500">Cơ sở kinh doanh:</span>
              <span className="font-semibold text-ink truncate">{businessName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-neutral-700">
            <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="text-neutral-500">Email liên hệ:</span>
            <span className="font-semibold text-ink truncate">{email}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-700">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-neutral-500">Trạng thái:</span>
            <span className="font-semibold text-emerald-600">Chờ Quản trị viên xét duyệt</span>
          </div>
        </div>

        {/* Nút quay về trang chủ */}
        <div className="w-full pt-2">
          <Link to="/" className="w-full block">
            <Button variant="primary" size="lg" fullWidth>
              Quay về Trang chủ
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleVerify} className="space-y-6 w-full font-sans" noValidate>
      {/* Thông tin email nhận mã */}
      <div className="text-center">
        <p className="text-sm text-neutral-600">
          Mã xác thực gồm 6 chữ số đã được gửi đến email:
        </p>
        <p className="font-semibold text-ink text-base mt-1 flex items-center justify-center gap-1.5">
          <Mail className="w-4 h-4 text-primary-500" />
          <span>{email || 'Chưa xác định'}</span>
        </p>
      </div>

      {/* 6 ô nhập mã OTP */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => {
              e.preventDefault()
              handlePaste(e)
            }}
            aria-label={`Số thứ ${index + 1}`}
            className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-md border outline-none transition-all duration-150 ${
              isOtpError
                ? 'border-red-500 bg-red-50/30 text-red-600 focus:ring-2 focus:ring-red-500/20'
                : 'border-neutral-200 bg-white text-ink focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
            }`}
          />
        ))}
      </div>

      {/* Nút Xác thực */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isVerifying}
        disabled={otp.join('').length !== 6}
      >
        Xác thực hồ sơ
      </Button>

      {/* Cơ chế gửi lại mã OTP */}
      <div className="flex flex-col items-center justify-center gap-2 pt-2 text-sm">
        <p className="text-neutral-500">Bạn chưa nhận được mã?</p>

        {countdown > 0 ? (
          <p className="text-xs text-neutral-400 font-medium">
            Có thể yêu cầu gửi lại sau{' '}
            <span className="text-ink font-semibold">{countdown}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RotateCw
              className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`}
            />
            <span>Gửi lại mã xác thực</span>
          </button>
        )}
      </div>

      {/* Quay lại nộp hồ sơ khác */}
      <div className="text-center pt-2">
        <Link
          to="/provider/apply"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Nộp lại hồ sơ khác</span>
        </Link>
      </div>
    </form>
  )
}

export default ProviderVerifyOtpForm
