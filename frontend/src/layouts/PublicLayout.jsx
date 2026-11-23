import { useState, useRef, useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../features/auth/authStore'
import { logout } from '../features/auth/api'
import { clearCsrfToken } from '../lib/http'
import { Button } from '../components/ui/Button'
import { BrandLogo } from '../components/ui/BrandLogo'
import { ScrollToTop } from '../components/ui/ScrollToTop'

const navLinks = [
  { label: 'Dịch vụ', to: '/services' },
  { label: 'Danh mục', to: '/#categories' },
  { label: 'Cách hoạt động', to: '/#how-it-works' },
  { label: 'Về chúng tôi', to: '/#footer' },
]

const footerGroups = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Dịch vụ', to: '/services' },
      { label: 'Nhà cung cấp', to: '/#providers' },
      { label: 'Bảng giá', to: '/services' },
      { label: 'Khuyến mãi', to: '/services' },
    ],
  },
  {
    title: 'Công ty',
    links: [
      { label: 'Về chúng tôi', to: '/#footer' },
      { label: 'Tuyển dụng', to: '/#provider' },
      { label: 'Blog', to: '/#footer' },
      { label: 'Liên hệ', to: '/#footer' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Trung tâm trợ giúp', to: '/#footer' },
      { label: 'Điều khoản', to: '/#footer' },
      { label: 'Bảo mật', to: '/#footer' },
      { label: 'Hoàn tiền', to: '/#footer' },
    ],
  },
]

function Header() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const { isAuthenticated, account, clearAuth } = useAuthStore()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setUserDropdownOpen(false)
    setMenuOpen(false)
    try {
      await logout()
    } catch (err) {
      console.warn('Logout network error, clearing local session anyway:', err)
    } finally {
      clearCsrfToken()
      clearAuth()
      toast.success('Đã đăng xuất.')
      navigate('/')
    }
  }

  const initialLetter = (account?.displayName || account?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <header id="top" className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-10">
            <BrandLogo size="md" />
            <nav aria-label="Điều hướng chính" className="hidden items-center gap-7 lg:flex">
              {navLinks.map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="text-sm font-medium font-sans text-neutral-700 transition-colors hover:text-primary-600"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-2.5 sm:flex font-sans">
            <Link to="/#provider">
              <Button variant="secondary" size="sm">
                Trở thành nhà cung cấp
              </Button>
            </Link>

            {!isAuthenticated ? (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Đăng nhập
                  </Button>
                </Link>

                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Đăng ký
                  </Button>
                </Link>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="inline-flex items-center gap-2 h-9 px-2.5 rounded-md bg-white hover:bg-neutral-50 border border-neutral-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-500 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    {initialLetter}
                  </div>
                  <span className="text-xs font-medium text-ink max-w-[140px] truncate">
                    {account?.displayName || 'Tài khoản'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 rounded-md bg-white border border-neutral-200 shadow-md py-1 z-50">
                    <div className="px-3.5 py-2 border-b border-neutral-100">
                      <p className="text-sm font-semibold text-ink truncate">
                        {account?.displayName || 'Khách hàng'}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{account?.email}</p>
                    </div>

                    <div className="py-1">
                      {(!account?.accountType ||
                        account?.accountType === 'CUSTOMER') && (
                        <>
                          <Link
                            to="/customer/bookings/new"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                          >
                            <span>Đặt lịch dịch vụ</span>
                          </Link>
                          <Link
                            to="/customer/bookings"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                          >
                            <span>Đơn đặt của tôi</span>
                          </Link>
                        </>
                      )}

                      {account?.accountType === 'PROVIDER' && (
                        <Link
                          to="/provider/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                        >
                          <span>Khu vực Nhà cung cấp</span>
                        </Link>
                      )}

                      {account?.accountType === 'ADMIN' && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                        >
                          <span>Quản trị hệ thống</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 lg:hidden cursor-pointer"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <nav aria-label="Điều hướng di động" className="flex flex-col gap-1 border-t border-neutral-200 py-3 lg:hidden font-sans">
            {navLinks.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {label}
              </Link>
            ))}

            <Link
              to="/#provider"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-primary-600 hover:bg-neutral-50"
            >
              Trở thành nhà cung cấp
            </Link>

            <div className="pt-2 mt-2 border-t border-neutral-200 flex flex-col gap-2">
              {!isAuthenticated ? (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)}>
                    <Button variant="secondary" size="md" fullWidth>
                      Đăng nhập
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}>
                    <Button variant="primary" size="md" fullWidth>
                      Đăng ký
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="px-3 py-2 bg-neutral-50 rounded-md flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary-500 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                      {initialLetter}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-ink truncate">
                        {account?.displayName}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{account?.email}</p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={handleLogout}
                    leftIcon={<LogOut className="w-4 h-4" />}
                  >
                    Đăng xuất
                  </Button>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer id="footer" className="border-t border-neutral-200 bg-neutral-50 font-sans">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2">
            <BrandLogo size="md" />
            <p className="mb-5 mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Nền tảng kết nối khách hàng với nhà cung cấp dịch vụ gia đình uy tín.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-sm font-semibold text-ink">{group.title}</h3>
              <ul className="space-y-3">
                {group.links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 sm:flex-row">
          <p className="text-sm text-neutral-500">© 2026 Nestify.</p>
          <div className="flex items-center gap-6">
            {['Điều khoản', 'Bảo mật', 'Cookie'].map((label) => (
              <Link
                key={label}
                to="/#footer"
                className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ScrollToTop />
      <Header />
      <main className="flex-1">{children || <Outlet />}</main>
      <Footer />
    </div>
  )
}

export default PublicLayout
