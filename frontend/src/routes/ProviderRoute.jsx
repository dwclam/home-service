import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../features/auth/authStore'

export const ProviderRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, isInitialized, account } = useAuthStore()
  const warnedRef = useRef(false)

  const isNotProvider = isAuthenticated && account && account.accountType !== 'PROVIDER'

  useEffect(() => {
    if (isNotProvider && !warnedRef.current) {
      warnedRef.current = true
      toast.error('Khu vực này chỉ dành cho tài khoản Nhà cung cấp.')
    }
  }, [isNotProvider])

  // Trong lúc ứng dụng đang bootstrap khôi phục token từ refresh cookie
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 font-sans">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-500">
          Đang kiểm tra phiên đối tác...
        </p>
      </div>
    )
  }

  // Chưa đăng nhập thì chuyển hướng sang trang đăng nhập Nhà cung cấp
  if (!isAuthenticated) {
    return <Navigate to="/provider/login" replace state={{ from: location }} />
  }

  // Đã đăng nhập nhưng không phải tài khoản PROVIDER
  if (isNotProvider) {
    return <Navigate to="/" replace />
  }

  return children || <Outlet />
}

export default ProviderRoute
