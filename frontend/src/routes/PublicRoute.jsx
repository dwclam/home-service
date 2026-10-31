import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../features/auth/authStore'

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuthStore()

  // Chờ bootstrap kiểm tra refresh cookie hoàn tất
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 font-sans">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-500">Đang tải...</p>
      </div>
    )
  }

  // Đã đăng nhập thì không cho vào lại các trang Login, Register, Verify OTP
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children || <Outlet />
}

export default PublicRoute
