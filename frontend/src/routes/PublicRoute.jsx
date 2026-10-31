import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../features/auth/authStore'
import { ROLE_DEFAULT_ROUTES } from '../constants/roles'

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isInitialized, account } = useAuthStore()

  // Chờ bootstrap kiểm tra refresh cookie hoàn tất
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 font-sans">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-500">Đang tải...</p>
      </div>
    )
  }

  // Đã đăng nhập thì điều hướng về trang mặc định theo vai trò
  if (isAuthenticated) {
    const defaultTarget =
      ROLE_DEFAULT_ROUTES[account?.accountType || account?.role] || '/'
    return <Navigate to={defaultTarget} replace />
  }

  return children || <Outlet />
}

export default PublicRoute
