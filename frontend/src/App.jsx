import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { router } from './app/router'
import { useAuthStore } from './features/auth/authStore'
import { http } from './lib/http'
import './App.css'

function App() {
  const { setAuth, setInitialized, clearAuth } = useAuthStore()

  useEffect(() => {
    let isMounted = true

    const bootstrapAuth = async () => {
      try {
        // Gửi POST /api/auth/refresh để khôi phục phiên nếu cookie NESTIFY_REFRESH còn hạn
        const response = await http.post('/auth/refresh', null, {
          _skipRefresh: true, // Tránh retry loop nếu cookie không hợp lệ
        })

        if (isMounted && response.data) {
          setAuth({
            account: response.data.account,
            accessToken: response.data.accessToken,
          })
        }
      } catch {
        // Chưa đăng nhập hoặc cookie refresh hết hạn/thu hồi -> xóa sạch state auth
        if (isMounted) {
          clearAuth()
        }
      } finally {
        // Đánh dấu hoàn tất quá trình khởi tạo ứng dụng
        if (isMounted) {
          setInitialized(true)
        }
      }
    }

    bootstrapAuth()

    return () => {
      isMounted = false
    }
  }, [setAuth, setInitialized, clearAuth])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Be Vietnam Pro, system-ui, sans-serif',
            fontSize: '14px',
            borderRadius: '8px',
          },
        }}
      />
    </>
  )
}

export default App
