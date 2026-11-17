import { BrandLogo } from '../../components/ui/BrandLogo'
import { ProviderApplyForm } from '../../features/provider/components/ProviderApplyForm'

export const ProviderApplyPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl flex flex-col items-center">
        <BrandLogo size="lg" className="mb-4" />

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink text-center tracking-tight">
          Đăng ký trở thành Đối tác Nestify
        </h1>
      </div>

      {/* Form Container Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-neutral-200 rounded-md">
          <ProviderApplyForm />
        </div>
      </div>
    </div>
  )
}

export default ProviderApplyPage
