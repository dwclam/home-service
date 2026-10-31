import { useState, useRef, useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../features/auth/authStore'
import { logout } from '../features/auth/api'
import { clearCsrfToken } from '../lib/http'
import { Button } from '../components/ui/Button'
import { BrandLogo } from '../components/ui/BrandLogo'

const navLinks = [
  { label: 'Đặt dịch vụ', href: '#featured' },
  { label: 'Danh mục', href: '#categories' },
  { label: 'Cách hoạt động', href: '#how-it-works' },
  { label: 'Về chúng tôi', href: '#footer' },
]

const footerGroups = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Dịch vụ', href: '#featured' },
      { label: 'Nhà cung cấp', href: '#providers' },
      { label: 'Bảng giá', href: '#featured' },
      { label: 'Khuyến mãi', href: '#featured' },
    ],
  },
  {
    title: 'Công ty',
    links: [
      { label: 'Về chúng tôi', href: '#footer' },
      { label: 'Tuyển dụng', href: '#provider' },
      { label: 'Blog', href: '#footer' },
      { label: 'Liên hệ', href: '#footer' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Trung tâm trợ giúp', href: '#footer' },
      { label: 'Điều khoản', href: '#footer' },
      { label: 'Bảo mật', href: '#footer' },
      { label: 'Hoàn tiền', href: '#footer' },
    ],
  },
]

function Header() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const { isAuthenticated, account, clearAuth } = useAuthStore()

  // Đóng dropdown khi click ra ngoài
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
      toast.success('Đã đăng xuất tài khoản.')
      navigate('/')
    }
  }

  // Lấy chữ cái đầu cho Avatar
  const initialLetter = (account?.displayName || account?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <header id="top" className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Logo & Navigation chính */}
          <div className="flex items-center gap-10">
            <BrandLogo size="md" />
            <nav aria-label="Điều hướng chính" className="hidden items-center gap-7 lg:flex">
              {navLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-sm font-medium font-sans text-neutral-700 transition-colors hover:text-primary-600"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          {/* Cụm điều hướng Auth bên phải (Desktop) */}
          <div className="hidden items-center gap-3 sm:flex font-sans">
            <a
              href="#provider"
              className="inline-flex h-9 items-center rounded-full bg-primary-50 px-4 text-xs font-medium text-ink hover:bg-primary-100 transition-colors"
            >
              Trở thành nhà cung cấp
            </a>

            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="inline-flex h-10 items-center px-3.5 text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  Đăng nhập
                </Link>

                <Link to="/register">
                  <Button variant="primary" size="md">
                    Đăng ký
                  </Button>
                </Link>
              </>
            ) : (
              /* User Profile & Dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-500 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    {initialLetter}
                  </div>
                  <span className="text-sm font-medium text-ink max-w-[140px] truncate">
                    {account?.displayName || 'Tài khoản'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 mr-1" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md bg-white border border-neutral-200 shadow-md py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="text-sm font-semibold text-ink truncate">
                        {account?.displayName || 'Khách hàng'}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{account?.email}</p>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
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

          {/* Nút Hamburger menu Mobile */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 lg:hidden cursor-pointer"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <nav aria-label="Điều hướng di động" className="flex flex-col gap-1 border-t border-neutral-200 py-3 lg:hidden font-sans">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {label}
              </a>
            ))}

            <a
              href="#provider"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-primary-600 hover:bg-neutral-50"
            >
              Trở thành nhà cung cấp
            </a>

            <div className="pt-2 mt-2 border-t border-neutral-200 flex flex-col gap-2">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center h-10 rounded-md border border-neutral-200 text-sm font-medium text-ink hover:bg-neutral-50"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center h-10 rounded-md bg-primary-500 text-sm font-medium text-white hover:bg-primary-600"
                  >
                    Đăng ký tài khoản
                  </Link>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="px-3 py-2 bg-neutral-50 rounded-md flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary-500 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                      {initialLetter}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-ink truncate">
                        {account?.displayName}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{account?.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-md bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
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
              Nền tảng kết nối khách hàng với nhà cung cấp dịch vụ gia đình uy tín hàng đầu Việt Nam.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-sm font-semibold text-ink">{group.title}</h3>
              <ul className="space-y-3">
                {group.links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 sm:flex-row">
          <p className="text-sm text-neutral-500">© 2026 Nestify. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-6">
            {['Điều khoản', 'Bảo mật', 'Cookie'].map((label) => (
              <a
                key={label}
                href="#footer"
                className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
              >
                {label}
              </a>
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
      <Header />
      <main className="flex-1">{children || <Outlet />}</main>
      <Footer />
    </div>
  )
}

export default PublicLayout
