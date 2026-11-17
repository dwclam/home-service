import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Layers,
  UserCheck,
  LogOut,
  Globe,
  Menu,
  X,
  Shield,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../features/auth/authStore'
import { logout } from '../features/auth/api'
import { clearCsrfToken } from '../lib/http'
import { BrandLogo } from '../components/ui/BrandLogo'

export const AdminLayout = () => {
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
      toast.success('Đã đăng xuất tài khoản quản trị.')
      navigate('/')
    }
  }

  const navItems = [
    {
      to: '/admin/categories',
      label: 'Quản lý Danh mục',
      icon: Layers,
    },
    {
      to: '/admin/provider-applications',
      label: 'Duyệt hồ sơ NCC',
      icon: UserCheck,
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-100 flex font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-neutral-200 shrink-0">
        {/* Brand & Badge Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200">
          <BrandLogo size="sm" to="/admin/categories" />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-neutral-900 text-white">
            <Shield className="w-3 h-3 text-primary-400" />
            Admin
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Nghiệp vụ hệ thống
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
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
          {/* Admin Profile pill */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-neutral-50 border border-neutral-100">
            <div className="w-7 h-7 rounded-full bg-primary-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {(account?.displayName || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink truncate">
                {account?.displayName || 'Quản trị viên'}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {account?.email}
              </p>
            </div>
          </div>

          {/* Về trang khách hàng */}
          <Link
            to="/"
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-neutral-600 hover:text-ink hover:bg-neutral-50 rounded-md transition-colors"
          >
            <Globe className="w-4 h-4 text-neutral-400" />
            <span>Về trang khách hàng</span>
          </Link>

          {/* Đăng xuất */}
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
        {/* Top Header Mobile & Desktop */}
        <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger on mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              aria-label="Mở menu quản trị"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-display font-bold text-lg text-ink">
              Hệ Thống Quản Trị
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
              {(account?.displayName || 'A').charAt(0).toUpperCase()}
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

export default AdminLayout
