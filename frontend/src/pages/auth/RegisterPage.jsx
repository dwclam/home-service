import { BrandLogo } from '../../components/ui/BrandLogo'
import { RegisterForm } from '../../features/auth/components/RegisterForm'

export const RegisterPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <BrandLogo size="lg" className="mb-4" />

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink text-center tracking-tight">
          Đăng ký tài khoản
        </h1>
        <p className="mt-2 text-sm text-neutral-500 font-sans text-center max-w-sm">
          Tham gia Nestify để trải nghiệm dịch vụ chăm sóc gia đình chuyên nghiệp và tiện lợi.
        </p>
      </div>

      {/* Register Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-neutral-200 rounded-md">
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
