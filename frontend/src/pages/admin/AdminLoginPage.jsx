import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Clock } from 'lucide-react'

import { loginSchema } from '../../features/auth/schemas'
import { loginAdmin } from '../../features/auth/api'
import { useAuthStore } from '../../features/auth/authStore'
import { clearCsrfToken } from '../../lib/http'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FormField } from '../../components/ui/FormField'
import { BrandLogo } from '../../components/ui/BrandLogo'

const resolveAdminRedirect = (fromState) => {
  if (typeof fromState === 'string' && fromState.startsWith('/admin')) {
    return fromState
  }
  if (fromState?.pathname?.startsWith('/admin')) {
    return `${fromState.pathname}${fromState.search || ''}`
  }
  return '/admin/categories'
}

export const AdminLoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isInitialized, account, setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)

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

  // Đếm ngược Rate Limit (429) nếu quá tần suất đăng nhập
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

  if (isInitialized && isAuthenticated && account?.accountType === 'ADMIN') {
    return <Navigate to={resolveAdminRedirect(location.state?.from)} replace />
  }

  const onSubmit = async (values) => {
    if (rateLimitSeconds > 0) return

    try {
      const data = await loginAdmin({
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

      toast.success('Đăng nhập Quản trị viên thành công!')
      navigate(resolveAdminRedirect(location.state?.from), { replace: true })
    } catch (error) {
      const errorData = error.response?.data
      const status = error.response?.status
      const code = errorData?.code

      // Xử lý Rate Limit (429)
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

      // Xử lý sai thông tin tài khoản hoặc mật khẩu (401)
      if (status === 401 || code === 'INVALID_CREDENTIALS') {
        const message =
          errorData?.message ||
          'Email hoặc mật khẩu không chính xác, hoặc tài khoản không có quyền Quản trị viên.'
        toast.error(message)
        return
      }

      // Xử lý tài khoản bị tạm khóa (403)
      if (code === 'ACCOUNT_SUSPENDED') {
        toast.error('Tài khoản Quản trị viên này đã bị tạm khóa.')
        return
      }

      // Xử lý yêu cầu đổi mật khẩu (403)
      if (code === 'PASSWORD_CHANGE_REQUIRED') {
        toast.error('Tài khoản yêu cầu đổi mật khẩu trước khi đăng nhập quản trị.')
        return
      }

      // Lỗi chung khác
      const message =
        errorData?.message ||
        'Không thể đăng nhập quản trị lúc này. Vui lòng kiểm tra lại kết nối.'
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand & Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <BrandLogo size="lg" className="mb-4" />

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink text-center tracking-tight">
          Đăng nhập Quản trị viên
        </h1>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-neutral-200 rounded-md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full" noValidate>
            {/* Email */}
            <FormField
              label="Email quản trị"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <Input
                {...register('email')}
                type="email"
                placeholder="admin@example.com"
                autoComplete="email"
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
                placeholder="Nhập mật khẩu quản trị"
                autoComplete="current-password"
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

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isSubmitting}
                disabled={rateLimitSeconds > 0}
                leftIcon={
                  rateLimitSeconds > 0 ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )
                }
              >
                {rateLimitSeconds > 0
                  ? `Chờ thử lại (${rateLimitSeconds}s)`
                  : 'Đăng nhập Quản trị'}
              </Button>
            </div>

            {/* Back link */}
            <div className="text-center pt-3 border-t border-neutral-100">
              <Link
                to="/login"
                className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
              >
                ← Quay lại trang Đăng nhập Khách hàng
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminLoginPage
