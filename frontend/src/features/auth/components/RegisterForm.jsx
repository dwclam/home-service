import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'

import { registerSchema } from '../schemas'
import { registerCustomer } from '../api'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { FormField } from '../../../components/ui/FormField'

export const RegisterForm = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (values) => {
    try {
      const response = await registerCustomer({
        displayName: values.displayName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      })

      const pendingState = {
        email: response.email,
        registrationToken: response.registrationToken,
        resendAvailableAt: response.resendAvailableAt,
        expiresAt: response.expiresAt,
      }

      // Lưu dự phòng vào sessionStorage để tránh mất dữ liệu khi người dùng reload trang /verify-otp
      try {
        sessionStorage.setItem(
          'nestify_pending_registration',
          JSON.stringify(pendingState)
        )
      } catch (storageError) {
        console.warn('Cannot write to sessionStorage:', storageError)
      }

      toast.success('Đăng ký tài khoản thành công! Mã OTP đã được gửi về email.')
      navigate('/verify-otp', { state: pendingState })
    } catch (error) {
      const errorData = error.response?.data
      const status = error.response?.status
      const code = errorData?.code

      // Xử lý xung đột email đã tồn tại (409 Conflict)
      if (status === 409 || code === 'EMAIL_ALREADY_USED') {
        const message =
          errorData?.message ||
          'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.'
        setError('email', {
          type: 'manual',
          message,
        })
        toast.error(message)
        return
      }

      // Xử lý lỗi validation từ phía backend (400)
      const fieldErrors = errorData?.fieldErrors
      if (fieldErrors) {
        const entries = Array.isArray(fieldErrors)
          ? fieldErrors.map((err) => [err.field, err.message])
          : Object.entries(fieldErrors)

        if (entries.length > 0) {
          entries.forEach(([field, message]) => {
            if (field && message) {
              setError(field, { type: 'manual', message })
            }
          })
          toast.error('Vui lòng kiểm tra lại thông tin trên form.')
          return
        }
      }

      // Lỗi chung khác
      const message =
        errorData?.message ||
        'Không thể hoàn tất đăng ký lúc này. Vui lòng kiểm tra lại kết nối.'
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full" noValidate>
      {/* Họ và tên */}
      <FormField
        label="Họ và tên"
        htmlFor="displayName"
        required
        error={errors.displayName?.message}
      >
        <Input
          {...register('displayName')}
          placeholder="Ví dụ: Nguyễn Văn An"
          autoComplete="name"
          leftIcon={<User className="w-4 h-4" />}
        />
      </FormField>

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
          leftIcon={<Mail className="w-4 h-4" />}
        />
      </FormField>

      {/* Số điện thoại */}
      <FormField
        label="Số điện thoại"
        htmlFor="phone"
        error={errors.phone?.message}
      >
        <Input
          {...register('phone')}
          type="tel"
          autoComplete="tel"
          leftIcon={<Phone className="w-4 h-4" />}
        />
      </FormField>

      {/* Mật khẩu */}
      <FormField
        label="Mật khẩu"
        htmlFor="password"
        required
        error={errors.password?.message}
        hint="Độ dài từ 8 đến 72 ký tự"
      >
        <Input
          {...register('password')}
          type={showPassword ? 'text' : 'password'}
          placeholder="Nhập mật khẩu an toàn"
          autoComplete="new-password"
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

      {/* Xác nhận mật khẩu */}
      <FormField
        label="Xác nhận mật khẩu"
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword?.message}
      >
        <Input
          {...register('confirmPassword')}
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Nhập lại mật khẩu vừa đặt"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-neutral-400 hover:text-ink focus:outline-none cursor-pointer"
              aria-label={
                showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
              }
            >
              {showConfirmPassword ? (
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
        >
          Đăng ký tài khoản
        </Button>
      </div>

      <p className="text-center text-sm text-neutral-500 font-sans pt-2">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="text-primary-500 hover:text-primary-600 font-semibold underline-offset-4 hover:underline"
        >
          Đăng nhập ngay
        </Link>
      </p>
    </form>
  )
}

export default RegisterForm
