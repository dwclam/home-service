import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Clock,
  KeyRound,
  Briefcase,
} from 'lucide-react'

import {
  loginSchema,
  firstPasswordChangeSchema,
} from '../../features/auth/schemas'
import {
  loginProvider,
  changeProviderFirstPassword,
} from '../../features/auth/api'
import { useAuthStore } from '../../features/auth/authStore'
import { clearCsrfToken } from '../../lib/http'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FormField } from '../../components/ui/FormField'
import { BrandLogo } from '../../components/ui/BrandLogo'

const resolvePostLoginRedirect = (fromState) => {
  if (typeof fromState === 'string' && fromState.startsWith('/provider')) {
    return fromState
  }
  if (fromState?.pathname?.startsWith('/provider')) {
    return `${fromState.pathname}${fromState.search || ''}`
  }
  return '/provider'
}

const ProviderCredentialForm = ({
  rateLimitSeconds,
  onRateLimit,
  onRequireFirstPasswordChange,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (values) => {
    if (rateLimitSeconds > 0) return

    try {
      const data = await loginProvider({
        email: values.email,
        password: values.password,
      })

      // Nhánh A: Tài khoản mới được duyệt, bắt buộc đổi mật khẩu lần đầu
      if (data?.mustChangePassword && data?.passwordChangeToken) {
        clearAuth()
        clearCsrfToken()
        onRequireFirstPasswordChange({
          passwordChangeToken: data.passwordChangeToken,
          email: values.email.trim(),
          currentPassword: values.password,
        })
        toast('Tài khoản cần đổi mật khẩu lần đầu trước khi sử dụng.')
        return
      }

      // Nhánh B: Đăng nhập thành công và nhận accessToken
      if (data?.accessToken) {
        setAuth({
          account: data.account,
          accessToken: data.accessToken,
        })
        clearCsrfToken()
        toast.success('Đăng nhập Đối tác thành công!')
        navigate(resolvePostLoginRedirect(location.state?.from), {
          replace: true,
        })
        return
      }

      toast.error('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.')
    } catch (error) {
      const errorData = error.response?.data
      const status = error.response?.status
      const code = errorData?.code

      if (status === 429 || code === 'LOGIN_RATE_LIMITED') {
        const retryHeader =
          error.response?.headers?.['retry-after'] ||
          error.response?.headers?.['Retry-After']
        const seconds = parseInt(retryHeader, 10) || 60
        onRateLimit(seconds)
        toast.error(
          `Bạn đã thử quá số lần quy định. Vui lòng thử lại sau ${seconds} giây.`
        )
        return
      }

      if (status === 401 || code === 'INVALID_CREDENTIALS') {
        toast.error(
          errorData?.message || 'Địa chỉ email hoặc mật khẩu không chính xác.'
        )
        return
      }

      if (code === 'ACCOUNT_SUSPENDED') {
        toast.error(
          errorData?.message || 'Tài khoản Nhà cung cấp hiện đang bị tạm khóa.'
        )
        return
      }

      if (code === 'EMAIL_NOT_VERIFIED') {
        toast.error(
          errorData?.message || 'Tài khoản hoặc email chưa được xác thực.'
        )
        return
      }

      if (status === 409 || code === 'DATA_CONFLICT') {
        toast.error(
          errorData?.message ||
            'Thông tin hồ sơ đối tác chưa đồng bộ. Vui lòng liên hệ quản trị viên.'
        )
        return
      }

      toast.error(
        errorData?.message ||
          'Không thể đăng nhập lúc này. Vui lòng kiểm tra lại kết nối.'
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full" noValidate>
      <FormField
        label="Email đối tác"
        htmlFor="provider-email"
        required
        error={errors.email?.message}
      >
        <Input
          {...register('email')}
          id="provider-email"
          type="email"
          placeholder="provider@example.com"
          autoComplete="email"
          disabled={rateLimitSeconds > 0}
          leftIcon={<Mail className="w-4 h-4" />}
        />
      </FormField>

      <FormField
        label="Mật khẩu"
        htmlFor="provider-password"
        required
        error={errors.password?.message}
      >
        <Input
          {...register('password')}
          id="provider-password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          disabled={rateLimitSeconds > 0}
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="focus:outline-none hover:text-neutral-600 transition-colors cursor-pointer"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
        />
      </FormField>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          disabled={rateLimitSeconds > 0}
          leftIcon={
            rateLimitSeconds > 0 ? (
              <Clock className="w-4 h-4" />
            ) : (
              <Briefcase className="w-4 h-4" />
            )
          }
        >
          {rateLimitSeconds > 0
            ? `Thử lại sau (${rateLimitSeconds}s)`
            : 'Đăng nhập Đối tác'}
        </Button>
      </div>

      <div className="pt-3 border-t border-neutral-100 flex flex-col items-center gap-2 text-xs text-neutral-500 font-sans">
        <p>
          Chưa là đối tác?{' '}
          <Link
            to="/provider/apply"
            className="text-primary-600 hover:text-primary-700 font-semibold underline-offset-4 hover:underline"
          >
            Nộp hồ sơ đăng ký
          </Link>
        </p>
        <Link
          to="/login"
          className="hover:text-primary-600 transition-colors font-medium"
        >
          Đăng nhập Khách hàng
        </Link>
      </div>
    </form>
  )
}

const FirstPasswordChangeForm = ({
  session,
  rateLimitSeconds,
  onRateLimit,
  onBackToLogin,
  onSuccessComplete,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(firstPasswordChangeSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (values) => {
    if (rateLimitSeconds > 0) return

    if (values.newPassword === session.currentPassword) {
      setError('newPassword', {
        type: 'manual',
        message: 'Mật khẩu mới phải khác mật khẩu tạm hiện tại.',
      })
      return
    }

    try {
      const data = await changeProviderFirstPassword({
        currentPassword: session.currentPassword,
        newPassword: values.newPassword,
        passwordChangeToken: session.passwordChangeToken,
      })

      setAuth({
        account: data.account,
        accessToken: data.accessToken,
      })
      clearCsrfToken()
      onSuccessComplete()
      toast.success('Đổi mật khẩu thành công!')
      navigate(resolvePostLoginRedirect(location.state?.from), {
        replace: true,
      })
    } catch (error) {
      const errorData = error.response?.data
      const status = error.response?.status
      const code = errorData?.code

      if (status === 429 || code === 'LOGIN_RATE_LIMITED') {
        const retryHeader =
          error.response?.headers?.['retry-after'] ||
          error.response?.headers?.['Retry-After']
        const seconds = parseInt(retryHeader, 10) || 60
        onRateLimit(seconds)
        toast.error(
          `Bạn đã thử quá số lần quy định. Vui lòng thử lại sau ${seconds} giây.`
        )
        return
      }

      if (code === 'PASSWORD_UNCHANGED') {
        const message =
          errorData?.message || 'Mật khẩu mới phải khác mật khẩu tạm hiện tại.'
        setError('newPassword', { type: 'server', message })
        toast.error(message)
        return
      }

      if (code === 'PASSWORD_TOO_LONG') {
        const message =
          errorData?.message || 'Mật khẩu vượt quá giới hạn 72 byte UTF-8.'
        setError('newPassword', { type: 'server', message })
        toast.error(message)
        return
      }

      if (code === 'PASSWORD_CHANGE_TOKEN_INVALID') {
        toast.error('Phiên đổi mật khẩu đã hết hạn. Vui lòng đăng nhập lại.')
        onBackToLogin()
        return
      }

      if (code === 'INVALID_CREDENTIALS' || status === 401) {
        toast.error(
          'Mật khẩu tạm hiện tại không còn hiệu lực. Vui lòng đăng nhập lại bằng mật khẩu mới nhất.'
        )
        onBackToLogin()
        return
      }

      if (code === 'PASSWORD_CHANGE_NOT_REQUIRED') {
        toast.error(
          errorData?.message ||
            'Tài khoản đã đổi mật khẩu trước đó. Vui lòng đăng nhập bằng mật khẩu mới.'
        )
        onBackToLogin()
        return
      }

      const fieldErrors = errorData?.fieldErrors
      if (fieldErrors && typeof fieldErrors === 'object') {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          if (field && msg) {
            setError(field, { type: 'server', message: msg })
          }
        })
      }

      toast.error(
        errorData?.message ||
          'Không thể đổi mật khẩu lúc này. Vui lòng kiểm tra lại thông tin.'
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full" noValidate>
      <FormField
        label="Mật khẩu mới"
        htmlFor="newPassword"
        required
        error={errors.newPassword?.message}
      >
        <Input
          {...register('newPassword')}
          id="newPassword"
          type={showNew ? 'text' : 'password'}
          placeholder="Nhập mật khẩu mới"
          autoComplete="new-password"
          disabled={rateLimitSeconds > 0}
          leftIcon={<KeyRound className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="focus:outline-none hover:text-neutral-600 transition-colors cursor-pointer"
              aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showNew ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
        />
      </FormField>

      <FormField
        label="Xác nhận mật khẩu mới"
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword?.message}
      >
        <Input
          {...register('confirmPassword')}
          id="confirmPassword"
          type={showConfirm ? 'text' : 'password'}
          placeholder="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          disabled={rateLimitSeconds > 0}
          leftIcon={<KeyRound className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="focus:outline-none hover:text-neutral-600 transition-colors cursor-pointer"
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
        />
      </FormField>

      <div className="pt-2 space-y-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          disabled={rateLimitSeconds > 0}
        >
          {rateLimitSeconds > 0
            ? `Thử lại sau (${rateLimitSeconds}s)`
            : 'Xác nhận đổi mật khẩu'}
        </Button>

        <div className="text-center pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-neutral-500 hover:text-primary-600 transition-colors cursor-pointer"
          >
            ← Quay lại Đăng nhập Đối tác
          </button>
        </div>
      </div>
    </form>
  )
}

export const ProviderLoginPage = () => {
  const location = useLocation()
  const { isAuthenticated, isInitialized, account } = useAuthStore()

  // Token đổi mật khẩu lần đầu và mật khẩu tạm chỉ giữ trong React state (RAM)
  const [firstChangeSession, setFirstChangeSession] = useState(null)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)

  // Đếm ngược giới hạn tần suất (429)
  useEffect(() => {
    if (rateLimitSeconds <= 0) return

    const timer = setInterval(() => {
      setRateLimitSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [rateLimitSeconds])

  const handleEnterFirstPasswordChange = (session) => {
    setFirstChangeSession(session)
  }

  const handleBackToLogin = () => {
    setFirstChangeSession(null)
  }

  // Nếu đã đăng nhập tài khoản PROVIDER hợp lệ -> chuyển hướng sang /provider
  if (
    isInitialized &&
    isAuthenticated &&
    account?.accountType === 'PROVIDER' &&
    !firstChangeSession
  ) {
    return (
      <Navigate
        to={resolvePostLoginRedirect(location.state?.from)}
        replace
      />
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <BrandLogo size="lg" className="mb-4" />

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink text-center tracking-tight">
          {firstChangeSession ? 'Đổi mật khẩu lần đầu' : 'Đăng nhập Đối tác'}
        </h1>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-neutral-200 rounded-md">
          {!firstChangeSession ? (
            <ProviderCredentialForm
              rateLimitSeconds={rateLimitSeconds}
              onRateLimit={setRateLimitSeconds}
              onRequireFirstPasswordChange={handleEnterFirstPasswordChange}
            />
          ) : (
            <FirstPasswordChangeForm
              session={firstChangeSession}
              rateLimitSeconds={rateLimitSeconds}
              onRateLimit={setRateLimitSeconds}
              onBackToLogin={handleBackToLogin}
              onSuccessComplete={handleBackToLogin}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ProviderLoginPage
