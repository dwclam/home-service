import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  LogOut,
  Shield,
  Briefcase,
  ClipboardList,
  LifeBuoy,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../features/auth/authStore'
import { logout } from '../features/auth/api'
import { clearCsrfToken } from '../lib/http'
import { Button } from '../components/ui/Button'
import { BrandLogo } from '../components/ui/BrandLogo'
import { AccountMenu } from '../components/layout/AccountMenu'
import { ScrollToTop } from '../components/ui/ScrollToTop'

const navLinks = [
  { label: 'Dịch vụ', to: '/services' },
  { label: 'Danh mục', href: '/#categories' },
  { label: 'Cách hoạt động', href: '/#how-it-works' },
  { label: 'Về chúng tôi', href: '/#footer' },
]

const footerGroups = [
  {
    title: 'Dịch vụ',
    links: [
      { label: 'Khám phá dịch vụ', to: '/services' },
      { label: 'Danh mục', href: '/#categories' },
      { label: 'Cách hoạt động', href: '/#how-it-works' },
    ],
  },
  {
    title: 'Đối tác',
    links: [
      { label: 'Đăng ký làm Đối tác', to: '/provider/apply' },
      { label: 'Đăng nhập Đối tác', to: '/provider/login' },
    ],
  },
]

function Header() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const { isAuthenticated, account, clearAuth } = useAuthStore()

  const handleLogout = async () => {
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

  const initialLetter = (account?.displayName || account?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase()

  const accountMenuLinks = []
  if (account?.accountType === 'ADMIN') {
    accountMenuLinks.push({
      label: 'Quản trị hệ thống',
      to: '/admin/bookings',
      icon: Shield,
    })
  } else if (account?.accountType === 'PROVIDER') {
    accountMenuLinks.push({
      label: 'Kênh Nhà cung cấp',
      to: '/provider',
      icon: Briefcase,
    })
  } else if (isAuthenticated) {
    accountMenuLinks.push(
      {
        label: 'Đơn đặt của tôi',
        to: '/customer/bookings',
        icon: ClipboardList,
      },
      {
        label: 'Hỗ trợ & Khiếu nại',
        to: '/customer/complaints',
        icon: LifeBuoy,
      }
    )
  }

  return (
    <header id="top" className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-10">
            <BrandLogo size="md" />
            <nav aria-label="Điều hướng chính" className="hidden items-center gap-7 lg:flex">
              {navLinks.map(({ label, href, to }) =>
                to ? (
                  <Link
                    key={label}
                    to={to}
                    className="text-sm font-medium font-sans text-neutral-700 transition-colors hover:text-primary-600"
                  >
                    {label}
                  </Link>
                ) : (
                  <a
                    key={label}
                    href={href}
                    className="text-sm font-medium font-sans text-neutral-700 transition-colors hover:text-primary-600"
                  >
                    {label}
                  </a>
                )
              )}
            </nav>
          </div>

          <div className="hidden items-center gap-3 sm:flex font-sans">
            <Link
              to="/provider/apply"
              className="inline-flex h-9 items-center rounded-md bg-primary-50 px-3.5 text-xs font-medium text-ink hover:bg-primary-100 transition-colors"
            >
              Trở thành nhà cung cấp
            </Link>

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
              <AccountMenu
                account={account}
                fallbackName="Khách hàng"
                menuLinks={accountMenuLinks}
                onLogout={handleLogout}
              />
            )}
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 lg:hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <nav
            aria-label="Điều hướng di động"
            className="flex flex-col gap-1 border-t border-neutral-200 py-3 lg:hidden font-sans"
          >
            {navLinks.map(({ label, href, to }) =>
              to ? (
                <Link
                  key={label}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {label}
                </a>
              )
            )}

            <Link
              to="/provider/apply"
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
                      Đăng ký tài khoản
                    </Button>
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

                  {accountMenuLinks.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-md bg-neutral-100 text-neutral-800 text-sm font-medium hover:bg-neutral-200 transition-colors"
                      >
                        {Icon && <Icon className="w-4 h-4 text-primary-600" />}
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}

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
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
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
                {group.links.map(({ label, href, to }) => (
                  <li key={label}>
                    {to ? (
                      <Link
                        to={to}
                        className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
                      >
                        {label}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
                      >
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-neutral-200 pt-8">
          <p className="text-sm text-neutral-500">© 2026 Nestify. Bảo lưu mọi quyền.</p>
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
