import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  UserCircle,
  Briefcase,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Home,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../features/auth/authStore'
import { logout } from '../features/auth/api'
import { clearCsrfToken } from '../lib/http'
import { BrandLogo } from '../components/ui/BrandLogo'
import { Button } from '../components/ui/Button'
import { ScrollToTop } from '../components/ui/ScrollToTop'
import { ROLES } from '../constants/roles'

const PROVIDER_NAV_ITEMS = [
  {
    label: 'Hồ sơ nhà cung cấp',
    to: '/provider/profile',
    icon: UserCircle,
  },
  {
    label: 'Gói dịch vụ',
    to: '/provider/services',
    icon: Briefcase,
  },
  {
    label: 'Lịch làm việc',
    to: '/provider/availability',
    icon: CalendarClock,
  },
  {
    label: 'Đơn đặt dịch vụ',
    to: '/provider/bookings',
    icon: ClipboardList,
  },
]

const ADMIN_NAV_ITEMS = [
  {
    label: 'Tổng quan',
    to: '/admin',
    end: true,
    icon: LayoutDashboard,
  },
]

export const DashboardLayout = ({ role = ROLES.PROVIDER, children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { account, clearAuth } = useAuthStore()

  const activeRole =
    role ||
    (location.pathname.startsWith('/admin') ? ROLES.ADMIN : ROLES.PROVIDER)

  const navItems =
    activeRole === ROLES.ADMIN ? ADMIN_NAV_ITEMS : PROVIDER_NAV_ITEMS

  const areaTitle =
    activeRole === ROLES.ADMIN ? 'Quản trị hệ thống' : 'Khu vực Nhà cung cấp'

  const handleLogout = async () => {
    setDrawerOpen(false)
    try {
      await logout()
    } catch (err) {
      console.warn('Logout network error, clearing local session anyway:', err)
    } finally {
      clearCsrfToken()
      clearAuth()
      toast.success('Đã đăng xuất.')
      navigate('/login')
    }
  }

  const initialLetter = (account?.displayName || account?.email || 'N')
    .trim()
    .charAt(0)
    .toUpperCase()

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200 font-sans select-none">
      <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-200 shrink-0">
        <BrandLogo size="sm" to="/" />
        {isMobile && (
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-100 cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav
        aria-label={areaTitle}
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
      >
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => isMobile && setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-ink'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3 border-t border-neutral-200">
        <Link
          to="/"
          onClick={() => isMobile && setDrawerOpen(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-ink transition-colors duration-150"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Trang chủ</span>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-neutral-50 font-sans text-neutral-700">
      <ScrollToTop />
      <aside className="hidden lg:block w-[240px] shrink-0 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-ink/40 transition-opacity duration-200"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[240px] max-w-[80vw] h-full bg-white shadow-lg transition-transform duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-[17px] font-semibold text-ink truncate">
              {areaTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-2.5 h-9 rounded-md border border-neutral-200 bg-neutral-50">
              <div className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {initialLetter}
              </div>
              <span className="text-xs font-medium text-ink max-w-[160px] truncate">
                {account?.displayName || account?.email || 'Tài khoản'}
              </span>
            </div>

            {account ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
