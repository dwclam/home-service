import { create } from 'zustand'

/**
 * Auth store quản lý thông tin tài khoản và Access Token hoàn toàn trong RAM (memory-only).
 * Tuyệt đối tuân thủ quy tắc bảo mật: CẤM lưu accessToken hay thông tin phiên vào localStorage / sessionStorage.
 */
export const useAuthStore = create((set) => ({
  // State
  account: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  // Actions
  /**
   * Thiết lập thông tin xác thực sau khi đăng nhập thành công hoặc khôi phục phiên từ refresh token.
   * @param {{ account: object | null, accessToken: string }} payload
   */
  setAuth: ({ account, accessToken }) =>
    set({
      account: account ?? null,
      accessToken: accessToken ?? null,
      isAuthenticated: Boolean(accessToken),
      isInitialized: true,
    }),

  /**
   * Cập nhật riêng access token (ví dụ sau khi silent refresh thành công).
   * @param {string | null} token
   */
  setAccessToken: (token) =>
    set({
      accessToken: token ?? null,
      isAuthenticated: Boolean(token),
    }),

  /**
   * Đánh dấu ứng dụng đã hoàn tất bước khởi tạo kiểm tra refresh token ban đầu.
   * @param {boolean} initialized
   */
  setInitialized: (initialized) =>
    set({
      isInitialized: Boolean(initialized),
    }),

  /**
   * Xóa sạch trạng thái xác thực trong RAM khi đăng xuất hoặc token refresh thất bại.
   */
  clearAuth: () =>
    set({
      account: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: true,
    }),
}))

export const authStore = useAuthStore
export default useAuthStore
