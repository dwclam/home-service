import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../features/auth/authStore'

export const AdminRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, isInitialized, account } = useAuthStore()
  const warnedRef = useRef(false)

  const isNotAdmin = isAuthenticated && account && account.accountType !== 'ADMIN'

  useEffect(() => {
    if (isNotAdmin && !warnedRef.current) {
      warnedRef.current = true
      toast.error('Bạn không có quyền truy cập khu vực Quản trị viên.')
    }
  }, [isNotAdmin])

  // Trong lúc ứng dụng đang bootstrap khôi phục token từ refresh cookie
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 font-sans">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-500">
          Đang kiểm tra quyền quản trị...
        </p>
      </div>
    )
  }

  // Chưa đăng nhập thì chuyển hướng sang trang Admin Login
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  // Đã đăng nhập nhưng không phải tài khoản ADMIN
  if (isNotAdmin) {
    return <Navigate to="/" replace />
  }

  return children || <Outlet />
}

export default AdminRoute
