import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../features/auth/authStore'

export const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, isInitialized } = useAuthStore()

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

  return children || <Outlet />
}

export default ProtectedRoute
