import { useLocation, Link } from 'react-router-dom'
import { BrandLogo } from '../../components/ui/BrandLogo'
import { VerifyOtpForm } from '../../features/auth/components/VerifyOtpForm'
import { Button } from '../../components/ui/Button'

export const VerifyOtpPage = () => {
  const location = useLocation()

  let initialData = location.state
  if (!initialData?.registrationToken) {
    try {
      const saved = sessionStorage.getItem('nestify_pending_registration')
      if (saved) {
        initialData = JSON.parse(saved)
      }
    } catch (e) {
      console.warn('Cannot read from sessionStorage:', e)
      initialData = null
    }
  }

  const hasValidSession = Boolean(initialData?.registrationToken && initialData?.email)

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <BrandLogo size="lg" className="mb-4" />

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink text-center tracking-tight">
          Xác thực tài khoản
        </h1>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-neutral-200 rounded-lg">
          {hasValidSession ? (
            <VerifyOtpForm initialData={initialData} />
          ) : (
            <div className="text-center py-4 font-sans space-y-4">
              <p className="text-sm text-neutral-600">
                Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại để nhận mã xác thực.
              </p>
              <Link to="/register">
                <Button variant="primary" size="md" fullWidth>
                  Đi đến trang Đăng ký
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyOtpPage
