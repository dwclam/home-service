import axios from 'axios'
import { useAuthStore } from '../features/auth/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Bộ nhớ đệm CSRF trong RAM
let csrfTokenData = null
let csrfPromise = null

/**
 * Xóa cache CSRF token trong RAM.
 * Gọi sau khi login hoặc logout vì server đã làm mới / xóa cookie CSRF cũ.
 */
export const clearCsrfToken = () => {
  csrfTokenData = null
  csrfPromise = null
}

/**
 * Lấy CSRF token: Nếu chưa có trong RAM thì gọi GET /api/auth/csrf để lấy { headerName, token }.
 * Sử dụng csrfPromise để giải quyết bài toán concurrency (nhiều request đồng thời khi chưa có token).
 */
export const getCsrfToken = async () => {
  if (csrfTokenData?.token) {
    return csrfTokenData
  }

  if (csrfPromise) {
    return csrfPromise
  }

  csrfPromise = axios
    .get(`${API_BASE_URL}/auth/csrf`, {
      withCredentials: true,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
    .then((response) => {
      csrfTokenData = {
        headerName: response.data?.headerName || 'X-CSRF-TOKEN',
        token: response.data?.token || '',
      }
      return csrfTokenData
    })
    .catch((error) => {
      csrfTokenData = null
      throw error
    })
    .finally(() => {
      csrfPromise = null
    })

  return csrfPromise
}

// Khởi tạo Axios instance dùng chung
export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Quản lý Silent Refresh Queue chống race-condition
let isRefreshing = false
let failedQueue = []

/**
 * Giải phóng hàng đợi các request bị tạm giữ trong lúc làm mới token.
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token)
    }
  })
  failedQueue = []
}

// Request Interceptor: Tự động gắn CSRF token cho POST/PUT/DELETE/PATCH và Authorization Bearer nếu có token
http.interceptors.request.use(
  async (config) => {
    const method = config.method ? config.method.toUpperCase() : ''
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

    if (isMutation && !config._skipCsrf) {
      try {
        const csrf = await getCsrfToken()
        if (csrf?.token) {
          const headerName = csrf.headerName || 'X-XSRF-TOKEN'
          if (config.headers?.set) {
            config.headers.set(headerName, csrf.token)
          } else {
            config.headers = config.headers || {}
            config.headers[headerName] = csrf.token
          }
        }
      } catch (csrfError) {
        return Promise.reject(csrfError)
      }
    }

    const token = useAuthStore.getState().accessToken
    if (token) {
      if (config.headers?.set) {
        if (!config.headers.get?.('Authorization')) {
          config.headers.set('Authorization', `Bearer ${token}`)
        }
      } else {
        config.headers = config.headers || {}
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Xử lý 403 CSRF_INVALID (auto-retry) và 401 Silent Refresh Queue
http.interceptors.response.use(
  (response) => {
    // Sau khi mutation thành công, reset cache CSRF để request sau luôn lấy token mới nhất
    const method = response.config?.method ? response.config.method.toUpperCase() : ''
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      clearCsrfToken()
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const errorCode = error.response?.data?.code

    // Tự động khôi phục nếu CSRF token bị hết hạn hoặc sai lệch (403 CSRF_INVALID)
    if (status === 403 && errorCode === 'CSRF_INVALID' && !originalRequest._retryCsrf) {
      originalRequest._retryCsrf = true
      clearCsrfToken()
      try {
        const freshCsrf = await getCsrfToken()
        const headerName = freshCsrf.headerName || 'X-XSRF-TOKEN'
        if (originalRequest.headers?.set) {
          originalRequest.headers.set(headerName, freshCsrf.token)
        } else {
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers[headerName] = freshCsrf.token
        }
        return http(originalRequest)
      } catch (csrfRetryErr) {
        return Promise.reject(csrfRetryErr)
      }
    }
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/csrf')

    // Nếu lỗi 401, chưa từng retry, không phải request refresh và không phải endpoint đăng nhập/làm mới
    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest._skipRefresh &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true

      // Nếu cờ isRefreshing đang bật, đẩy request vào failedQueue chờ token mới
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            if (originalRequest.headers?.set) {
              originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
            } else {
              originalRequest.headers = originalRequest.headers || {}
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return http(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      // Request đầu tiên phát hiện 401: bật cờ isRefreshing = true và gọi refresh
      isRefreshing = true

      return new Promise((resolve, reject) => {
        http
          .post('/auth/refresh', null, { _skipRefresh: true })
          .then(({ data }) => {
            const newAccessToken = data?.accessToken

            // Cập nhật accessToken mới (và thông tin account nếu có) vào Zustand store
            if (data?.account) {
              useAuthStore.getState().setAuth({
                account: data.account,
                accessToken: newAccessToken,
              })
            } else {
              useAuthStore.getState().setAccessToken(newAccessToken)
            }

            // Giải phóng các request đang chờ trong failedQueue
            processQueue(null, newAccessToken)

            // Gắn token mới và retry request gốc
            if (originalRequest.headers?.set) {
              originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
            } else {
              originalRequest.headers = originalRequest.headers || {}
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            }

            resolve(http(originalRequest))
          })
          .catch((refreshError) => {
            // Thất bại: Xóa sạch failedQueue, xóa auth state, trả về lỗi
            processQueue(refreshError, null)
            useAuthStore.getState().clearAuth()
            reject(refreshError)
          })
          .finally(() => {
            isRefreshing = false
          })
      })
    }

    return Promise.reject(error)
  }
)

export default http
