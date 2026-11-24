import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  CalendarClock,
  Store,
  Globe,
  Menu,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../features/auth/authStore'
import { logout } from '../features/auth/api'
import { clearCsrfToken } from '../lib/http'
import { BrandLogo } from '../components/ui/BrandLogo'
import { AccountMenu } from '../components/layout/AccountMenu'

export const ProviderLayout = () => {
  const navigate = useNavigate()
  const { account, clearAuth } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    try {
      await logout()
    } catch (err) {
      console.warn('Logout network error, clearing session anyway:', err)
    } finally {
      clearCsrfToken()
      clearAuth()
      toast.success('Đã đăng xuất tài khoản đối tác.')
      navigate('/provider/login')
    }
  }

  const navItems = [
    {
      to: '/provider',
      label: 'Tổng quan',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/provider/bookings',
      label: 'Đơn đặt lịch',
      icon: ClipboardList,
    },
    {
      to: '/provider/services',
      label: 'Gói dịch vụ',
      icon: Wrench,
    },
    {
      to: '/provider/availability',
      label: 'Lịch làm việc',
      icon: CalendarClock,
    },
    {
      to: '/provider/profile',
      label: 'Hồ sơ cơ sở',
      icon: Store,
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 flex font-sans">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-neutral-200 shrink-0">
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200">
          <BrandLogo size="sm" to="/provider" />
          <span className="text-xs font-medium text-neutral-500">
            Đối tác
          </span>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-ink'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
              aria-label="Mở menu đối tác"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-display font-bold text-lg text-ink">
              Cổng Đối Tác
            </span>
          </div>

          <AccountMenu
            account={account}
            fallbackName="Nhà cung cấp"
            menuLinks={[
              { label: 'Về trang khách hàng', to: '/', icon: Globe },
            ]}
            onLogout={handleLogout}
          />
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-neutral-200 px-4 py-3 space-y-1 font-sans">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 font-semibold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ProviderLayout
