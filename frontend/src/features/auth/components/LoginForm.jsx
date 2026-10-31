import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

import { loginSchema } from '../schemas'
import { login } from '../api'
import { useAuthStore } from '../authStore'
import { clearCsrfToken } from '../../../lib/http'
import { ROLE_DEFAULT_ROUTES, ROLES } from '../../../constants/roles'
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

      // Điều hướng về trang được yêu cầu trước đó hoặc trang mặc định theo vai trò
      const defaultTarget =
        ROLE_DEFAULT_ROUTES[data.account?.accountType || data.account?.role] ||
        '/'
      const redirectPath = location.state?.from?.pathname || defaultTarget
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
      {/* Thông báo chào mừng sau khi kích hoạt email thành công */}
      {verifiedEmail && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 text-sm flex items-center gap-2 font-sans">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Tài khoản của bạn đã được kích hoạt. Hãy đăng nhập ngay!</span>
        </div>
      )}

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

      {import.meta.env.DEV && (
        <div className="pt-4 mt-4 border-t border-neutral-200 space-y-2">
          <p className="text-xs font-medium text-neutral-500 text-center">
            Tài khoản phát triển (Dev Seed — Khách / NCC / Admin):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setAuth({
                  account: {
                    id: 1001,
                    email: 'customer.seed@nestify.vn',
                    displayName: 'Nguyễn Văn Khách',
                    accountType: ROLES.CUSTOMER,
                    status: 'ACTIVE',
                    mustChangePassword: false,
                  },
                  accessToken: 'dev-seed-customer-token',
                })
                toast.success('Đã vào phiên Khách hàng (Seed) để kiểm thử UC08/UC11.')
                navigate('/customer/bookings', { replace: true })
              }}
            >
              Khách (UC08/11)
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setAuth({
                  account: {
                    id: 2001,
                    email: 'provider.seed@nestify.vn',
                    displayName: 'Điện Lạnh Bách Khoa 247',
                    accountType: ROLES.PROVIDER,
                    status: 'ACTIVE',
                    mustChangePassword: false,
                  },
                  accessToken: 'dev-seed-provider-token',
                })
                toast.success('Đã vào phiên phát triển Nhà cung cấp (Seed).')
                navigate('/provider/profile', { replace: true })
              }}
            >
              Khu vực NCC
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setAuth({
                  account: {
                    id: 9001,
                    email: 'admin.seed@nestify.vn',
                    displayName: 'Admin Vận Hành (Seed)',
                    accountType: ROLES.ADMIN,
                    status: 'ACTIVE',
                    mustChangePassword: false,
                  },
                  accessToken: 'dev-seed-admin-token',
                })
                toast.success('Đã vào phiên phát triển Admin (Seed).')
                navigate('/admin', { replace: true })
              }}
            >
              Khu vực Admin
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

export default LoginForm
