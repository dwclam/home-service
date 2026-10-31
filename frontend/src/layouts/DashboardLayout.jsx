import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  UserCircle,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Wallet,
  MessageSquare,
  LayoutDashboard,
  ShieldAlert,
  FileBarChart2,
  Menu,
  X,
  LogOut,
  Home,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../features/auth/authStore'
import { logout } from '../features/auth/api'
import { clearCsrfToken } from '../lib/http'
import { BrandLogo } from '../components/ui/BrandLogo'
import { ROLES, ROLE_LABELS } from '../constants/roles'

const PROVIDER_NAV_ITEMS = [
  {
    label: 'Hồ sơ nhà cung cấp',
    to: '/provider/profile',
    icon: UserCircle,
    badge: 'UC18',
  },
  {
    label: 'Gói dịch vụ & Ảnh',
    to: '/provider/services',
    icon: Briefcase,
    badge: 'UC19',
  },
  {
    label: 'Quản lý lịch rảnh',
    to: '/provider/availability',
    icon: CalendarClock,
    badge: 'UC20',
  },
  {
    label: 'Đơn đặt dịch vụ',
    to: '/provider/bookings',
    icon: ClipboardList,
    disabled: true,
    hint: 'Tuần 2–3',
  },
  {
    label: 'Thu nhập & Ngân hàng',
    to: '/provider/finance',
    icon: Wallet,
    disabled: true,
    hint: 'P1/P2',
  },
  {
    label: 'Tin nhắn khách hàng',
    to: '/provider/chat',
    icon: MessageSquare,
    disabled: true,
    hint: 'P2',
  },
]

const ADMIN_NAV_ITEMS = [
  {
    label: 'Tổng quan vận hành',
    to: '/admin',
    end: true,
    icon: LayoutDashboard,
  },
  {
    label: 'Vận hành đơn hàng',
    to: '/admin/bookings',
    icon: ClipboardList,
    disabled: true,
    hint: 'P1',
  },
  {
    label: 'Giao dịch & Đối soát',
    to: '/admin/finance',
    icon: Wallet,
    disabled: true,
    hint: 'P1',
  },
  {
    label: 'Khiếu nại & Đánh giá',
    to: '/admin/complaints',
    icon: ShieldAlert,
    disabled: true,
    hint: 'P1/P2',
  },
  {
    label: 'Báo cáo thống kê',
    to: '/admin/reports',
    icon: FileBarChart2,
    disabled: true,
    hint: 'P2',
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
    activeRole === ROLES.ADMIN
      ? 'Quản trị vận hành'
      : 'Khu vực Nhà cung cấp'

  const handleLogout = async () => {
    setDrawerOpen(false)
    try {
      await logout()
    } catch (err) {
      console.warn('Logout network error, clearing local session anyway:', err)
    } finally {
      clearCsrfToken()
      clearAuth()
      toast.success('Đã đăng xuất tài khoản.')
      navigate('/login')
    }
  }

  const initialLetter = (account?.displayName || account?.email || 'N')
    .trim()
    .charAt(0)
    .toUpperCase()

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200 font-sans select-none">
      {/* Brand header cao 64px */}
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

      {/* Nhãn phân khu */}
      <div className="px-4 pt-5 pb-2">
        <p className="px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {areaTitle}
        </p>
      </div>

      {/* Danh sách điều hướng */}
      <nav
        aria-label={areaTitle}
        className="flex-1 px-3 py-2 space-y-1 overflow-y-auto"
      >
        {navItems.map((item) => {
          const Icon = item.icon

          if (item.disabled) {
            return (
              <div
                key={item.to}
                title={`Dự kiến triển khai ở ${item.hint}`}
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-neutral-400 cursor-not-allowed"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 text-neutral-400" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.hint && (
                  <span className="text-[11px] font-medium text-neutral-400 shrink-0">
                    {item.hint}
                  </span>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => isMobile && setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-ink'
                }`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[11px] font-semibold text-primary-600 shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Chuyển nhanh khu vực & Về trang chủ */}
      <div className="p-3 border-t border-neutral-200 space-y-1">
        <Link
          to="/"
          onClick={() => isMobile && setDrawerOpen(false)}
          className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-ink transition-colors duration-150"
        >
          <span className="inline-flex items-center gap-2">
            <Home className="w-3.5 h-3.5" />
            Về trang chủ khách hàng
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-neutral-50 font-sans text-neutral-700">
      {/* Sidebar cố định 240px trên Desktop (lg trở lên) */}
      <aside className="hidden lg:block w-[240px] shrink-0 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer */}
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

      {/* Cột phải: Topbar 64px + Nội dung padding 24px */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              aria-label="Mở menu điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="truncate">
              <h1 className="text-[17px] font-semibold text-ink truncate">
                {areaTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full border border-neutral-200 bg-neutral-50">
              <div className="w-7 h-7 rounded-full bg-primary-500 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {initialLetter}
              </div>
              <div className="text-left leading-tight max-w-[160px]">
                <p className="text-xs font-semibold text-ink truncate">
                  {account?.displayName || 'Tài khoản phát triển'}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">
                  {ROLE_LABELS[account?.accountType] || ROLE_LABELS[activeRole]}
                </p>
              </div>
            </div>

            {account ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors duration-150 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center h-9 px-3 rounded-md bg-primary-500 text-xs font-medium text-white hover:bg-primary-600 transition-colors duration-150"
              >
                Đăng nhập
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
