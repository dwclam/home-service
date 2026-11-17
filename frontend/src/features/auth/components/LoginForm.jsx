import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

import { loginSchema } from '../schemas'
import { login } from '../api'
import { useAuthStore } from '../authStore'
import { clearCsrfToken } from '../../../lib/http'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { FormField } from '../../../components/ui/FormField'

export const LoginForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((state) => state.setAuth)

  const verifiedEmail = location.state?.verifiedEmail || ''
  const [showPassword, setShowPassword] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: verifiedEmail,
      password: '',
    },
    mode: 'onTouched',
  })

  // Đếm ngược Rate Limit (429) nếu vượt quá tần suất đăng nhập
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

  const onSubmit = async (values) => {
    if (rateLimitSeconds > 0) return

    try {
      const data = await login({
        email: values.email,
        password: values.password,
      })

      // 1. Cập nhật state xác thực trong RAM
      setAuth({
        account: data.account,
        accessToken: data.accessToken,
      })

      // 2. Xóa token CSRF cũ trong RAM vì backend đã reset cookie CSRF sau login
      clearCsrfToken()

      toast.success('Đăng nhập thành công!')

      // Điều hướng về trang được yêu cầu trước đó (bao gồm query string) hoặc trang chủ
      const fromState = location.state?.from
      const redirectPath =
        typeof fromState === 'string'
          ? fromState
          : fromState?.pathname
            ? `${fromState.pathname}${fromState.search || ''}`
            : '/'
      navigate(redirectPath, { replace: true })
    } catch (error) {
      const errorData = error.response?.data
      const status = error.response?.status
      const code = errorData?.code

      // Xử lý Rate Limit (429 Too Many Requests)
      if (status === 429 || code === 'LOGIN_RATE_LIMITED') {
        const retryHeader =
          error.response?.headers?.['retry-after'] ||
          error.response?.headers?.['Retry-After']
        const seconds = parseInt(retryHeader, 10) || 60
        setRateLimitSeconds(seconds)
        const message = `Bạn đã nhập sai quá số lần quy định. Vui lòng thử lại sau ${seconds} giây.`
        toast.error(message)
        return
      }

      // Xử lý sai thông tin tài khoản hoặc mật khẩu (401 Unauthorized)
      if (status === 401 || code === 'INVALID_CREDENTIALS') {
        const message =
          errorData?.message || 'Địa chỉ email hoặc mật khẩu không chính xác.'
        toast.error(message)
        return
      }

      // Các lỗi khác
      const message =
        errorData?.message ||
        'Không thể đăng nhập vào lúc này. Vui lòng kiểm tra lại kết nối.'
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full" noValidate>
      {/* Email */}
      <FormField
        label="Địa chỉ email"
        htmlFor="email"
        required
        error={errors.email?.message}
      >
        <Input
          {...register('email')}
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          disabled={rateLimitSeconds > 0}
          leftIcon={<Mail className="w-4 h-4" />}
        />
      </FormField>

      {/* Mật khẩu */}
      <FormField
        label="Mật khẩu"
        htmlFor="password"
        required
        error={errors.password?.message}
      >
        <Input
          {...register('password')}
          type={showPassword ? 'text' : 'password'}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          disabled={rateLimitSeconds > 0}
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-neutral-400 hover:text-ink focus:outline-none cursor-pointer"
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
        >
          {rateLimitSeconds > 0
            ? `Thử lại sau (${rateLimitSeconds}s)`
            : 'Đăng nhập'}
        </Button>
      </div>

      <p className="text-center text-sm text-neutral-500 font-sans pt-2">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="text-primary-500 hover:text-primary-600 font-semibold underline-offset-4 hover:underline"
        >
          Đăng ký ngay
        </Link>
      </p>

      <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-neutral-500 font-sans">
        <Link
          to="/provider/login"
          className="hover:text-primary-600 transition-colors font-medium"
        >
          Đăng nhập Đối tác
        </Link>
        <span aria-hidden="true" className="text-neutral-300">
          •
        </span>
        <Link
          to="/admin/login"
          className="hover:text-primary-600 transition-colors font-medium"
        >
          Dành cho Quản trị viên
        </Link>
      </div>
    </form>
  )
}

export default LoginForm
