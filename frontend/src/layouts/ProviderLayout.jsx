import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  Globe,
  Menu,
  X,
  Briefcase,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../features/auth/authStore'
import { logout } from '../features/auth/api'
import { clearCsrfToken } from '../lib/http'
import { BrandLogo } from '../components/ui/BrandLogo'

export const ProviderLayout = () => {
  const navigate = useNavigate()
  const { account, clearAuth } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
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
  ]

  const initialLetter = (account?.displayName || account?.email || 'P')
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-neutral-100 flex font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-neutral-200 shrink-0">
        {/* Brand & Role Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200">
          <BrandLogo size="sm" to="/provider" />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-primary-50 text-primary-700 border border-primary-200">
            <Briefcase className="w-3 h-3" />
            Đối tác
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Kênh Nhà cung cấp
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-ink'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </NavLink>
            )
          })}
        </nav>

        {/* Footer Account & Quick Actions */}
        <div className="p-4 border-t border-neutral-200 space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-neutral-50 border border-neutral-100">
            <div className="w-7 h-7 rounded-full bg-primary-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {initialLetter}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink truncate">
                {account?.displayName || 'Nhà cung cấp'}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {account?.email}
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-neutral-600 hover:text-ink hover:bg-neutral-50 rounded-md transition-colors"
          >
            <Globe className="w-4 h-4 text-neutral-400" />
            <span>Về trang khách hàng</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              aria-label="Mở menu đối tác"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-display font-bold text-lg text-ink">
              Cổng Đối Tác
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
              {initialLetter}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-neutral-200 px-4 py-3 space-y-2 font-sans">
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
            <div className="pt-2 border-t border-neutral-100 flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 rounded-md"
              >
                <Globe className="w-4 h-4" />
                <span>Về trang khách hàng</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ProviderLayout
