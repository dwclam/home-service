import { Navigate, Outlet, useLocation, Link } from 'react-router-dom'
import { Loader2, ShieldAlert, ArrowLeft, UserCheck } from 'lucide-react'
import { useAuthStore } from '../features/auth/authStore'
import { ROLE_LABELS } from '../constants/roles'
import { Button } from '../components/ui/Button'

export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const location = useLocation()
  const { isAuthenticated, isInitialized, account, setAuth } = useAuthStore()

  // Trong lúc ứng dụng đang bootstrap khôi phục token từ refresh cookie
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 font-sans">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-500">
          Đang khởi tạo phiên làm việc...
        </p>
      </div>
    )
  }

  // Chưa đăng nhập thì chuyển hướng sang trang Login, lưu lại pathname để sau khi login xong quay lại
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Kiểm tra phân quyền theo vai trò nếu route có quy định allowedRoles
  const userRole = account?.accountType || account?.role
  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole)
  ) {
    const requiredRole = allowedRoles[0]
    const requiredRoleLabel = ROLE_LABELS[requiredRole] || requiredRole

    const handleSwitchDevRole = () => {
      setAuth({
        account: {
          id: requiredRole === 'ADMIN' ? 9001 : 2001,
          email:
            requiredRole === 'ADMIN'
              ? 'admin.seed@nestify.vn'
              : 'provider.seed@nestify.vn',
          displayName:
            requiredRole === 'ADMIN'
              ? 'Admin Vận Hành (Seed)'
              : 'Điện Lạnh Bách Khoa 247',
          accountType: requiredRole,
          status: 'ACTIVE',
          mustChangePassword: false,
        },
        accessToken: 'dev-seed-access-token',
      })
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 font-sans">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-lg shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-[17px] font-semibold text-ink mb-2">
            Giới hạn quyền truy cập (403)
          </h1>
          <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
            Khu vực này yêu cầu vai trò{' '}
            <span className="font-semibold text-ink">{requiredRoleLabel}</span>.
            Tài khoản hiện tại của bạn đang có vai trò{' '}
            <span className="font-semibold text-ink">
              {ROLE_LABELS[userRole] || userRole || 'Khách hàng'}
            </span>
            .
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link to="/" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Về trang chủ
              </Button>
            </Link>

            {import.meta.env.DEV && (
              <Button
                variant="primary"
                size="md"
                onClick={handleSwitchDevRole}
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                Dùng tài khoản {requiredRoleLabel} mẫu (Dev)
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return children || <Outlet />
}

export default ProtectedRoute
