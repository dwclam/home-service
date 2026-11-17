import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { router } from './app/router'
import { useAuthStore } from './features/auth/authStore'
import { http } from './lib/http'
import './App.css'

// Singleton promise ở cấp module tránh bắn 2 request /auth/refresh song song dưới <StrictMode>
let bootstrapAuthPromise = null

function App() {
  const { setAuth, setInitialized, clearAuth } = useAuthStore()

  useEffect(() => {
    let isMounted = true

    if (!bootstrapAuthPromise) {
      bootstrapAuthPromise = http
        .post('/auth/refresh', null, {
          _skipRefresh: true, // Tránh retry loop nếu cookie không hợp lệ
        })
        .finally(() => {
          bootstrapAuthPromise = null
        })
    }

    const bootstrapAuth = async () => {
      try {
        const response = await bootstrapAuthPromise

        if (isMounted && response?.data?.accessToken) {
          setAuth({
            account: response.data.account,
            accessToken: response.data.accessToken,
          })
        } else if (isMounted) {
          clearAuth()
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
