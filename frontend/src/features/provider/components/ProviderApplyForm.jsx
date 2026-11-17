import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  Link2,
  Send,
  ArrowLeft,
} from 'lucide-react'

import { providerApplicationSchema } from '../schemas'
import { submitProviderApplication } from '../api'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { FormField } from '../../../components/ui/FormField'

export const ProviderApplyForm = () => {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(providerApplicationSchema),
    defaultValues: {
      applicantName: '',
      phone: '',
      email: '',
      businessName: '',
      city: '',
      documentUrl: '',
      description: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (values) => {
    try {
      const response = await submitProviderApplication(values)

      const pendingState = {
        email: response.email,
        registrationToken: response.registrationToken,
        expiresAt: response.expiresAt,
        resendAvailableAt: response.resendAvailableAt,
        businessName: values.businessName.trim(),
      }

      // Lưu dự phòng vào sessionStorage để bảo toàn phiên khi người dùng reload trang /provider/verify-otp
      try {
        sessionStorage.setItem(
          'nestify_pending_provider_app',
          JSON.stringify(pendingState)
        )
      } catch (storageError) {
        console.warn('Cannot write to sessionStorage:', storageError)
      }

      toast.success('Đã gửi mã OTP xác thực hồ sơ về email của bạn!')
      navigate('/provider/verify-otp', { state: pendingState })
    } catch (error) {
      const errorData = error.response?.data
      const status = error.response?.status
      const code = errorData?.code

      // Xử lý xung đột hồ sơ / email đã tồn tại (409 Conflict)
      if (
        status === 409 ||
        code === 'EMAIL_ALREADY_USED' ||
        code === 'APPLICATION_ALREADY_EXISTS'
      ) {
        const message =
          errorData?.message ||
          (code === 'APPLICATION_ALREADY_EXISTS'
            ? 'Hồ sơ với email này đang chờ xét duyệt hoặc đã được phê duyệt.'
            : 'Email này đã được sử dụng trong hệ thống.')
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
              const targetField =
                field === 'documentUrlValid' ? 'documentUrl' : field
              setError(targetField, { type: 'manual', message })
            }
          })
          toast.error('Vui lòng kiểm tra lại thông tin hồ sơ.')
          return
        }
      }

      // Lỗi chung khác
      const message =
        errorData?.message ||
        'Không thể gửi hồ sơ đăng ký lúc này. Vui lòng kiểm tra lại kết nối.'
      toast.error(message)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 w-full"
      noValidate
    >
      {/* Nhóm thông tin người đại diện: 2 cột trên sm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Người đại diện */}
        <FormField
          label="Họ và tên người đại diện"
          htmlFor="applicantName"
          required
          error={errors.applicantName?.message}
        >
          <Input
            {...register('applicantName')}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            leftIcon={<User className="w-4 h-4" />}
          />
        </FormField>

        {/* Số điện thoại (Tuân thủ Law 4: Không placeholder, Không hint) */}
        <FormField
          label="Số điện thoại"
          htmlFor="phone"
          required
          error={errors.phone?.message}
        >
          <Input
            {...register('phone')}
            type="tel"
            autoComplete="tel"
            leftIcon={<Phone className="w-4 h-4" />}
          />
        </FormField>
      </div>

      {/* Email liên hệ (1 cột full-width) */}
      <FormField
        label="Email liên hệ"
        htmlFor="email"
        required
        error={errors.email?.message}
      >
        <Input
          {...register('email')}
          type="email"
          placeholder="provider@example.com"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
        />
      </FormField>

      {/* Nhóm thông tin cơ sở kinh doanh: 2 cột trên sm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tên cơ sở kinh doanh */}
        <FormField
          label="Tên cơ sở kinh doanh"
          htmlFor="businessName"
          required
          error={errors.businessName?.message}
        >
          <Input
            {...register('businessName')}
            placeholder="Điện Lạnh Bách Khoa"
            leftIcon={<Building2 className="w-4 h-4" />}
          />
        </FormField>

        {/* Khu vực hoạt động */}
        <FormField
          label="Khu vực hoạt động"
          htmlFor="city"
          required
          error={errors.city?.message}
        >
          <Input
            {...register('city')}
            placeholder="Hà Nội, Đà Nẵng, TP.HCM..."
            leftIcon={<MapPin className="w-4 h-4" />}
          />
        </FormField>
      </div>

      {/* Link tài liệu năng lực Google Drive / Docs (1 cột full-width) */}
      <FormField
        label="Link tài liệu năng lực (Google Drive / Docs)"
        htmlFor="documentUrl"
        required
        error={errors.documentUrl?.message}
      >
        <Input
          {...register('documentUrl')}
          type="url"
          placeholder="https://drive.google.com/drive/folders/..."
          leftIcon={<Link2 className="w-4 h-4" />}
        />
      </FormField>

      {/* Mô tả năng lực & dịch vụ (1 cột full-width) */}
      <FormField
        label="Mô tả dịch vụ & năng lực chuyên môn"
        htmlFor="description"
        required
        error={errors.description?.message}
      >
        <textarea
          {...register('description')}
          id="description"
          rows={4}
          placeholder="Mô tả chi tiết về kinh nghiệm, các dịch vụ cung cấp, đội ngũ kỹ thuật viên, trang thiết bị..."
          className={`w-full rounded-md border px-3.5 py-2.5 text-sm font-sans text-ink outline-none transition-colors duration-150 placeholder:text-neutral-400 ${
            errors.description
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
          }`}
        />
      </FormField>

      {/* Nút nộp hồ sơ */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          rightIcon={<Send className="w-4 h-4" />}
        >
          Nộp hồ sơ đăng ký
        </Button>
      </div>

      {/* Liên kết điều hướng */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-sans">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-medium text-neutral-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </Link>
        <Link
          to="/provider/login"
          className="font-medium text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline"
        >
          Đã được duyệt hồ sơ? Đăng nhập Đối tác
        </Link>
      </div>
    </form>
  )
}

export default ProviderApplyForm
