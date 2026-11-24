import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardList,
  Wrench,
  CalendarClock,
  Store,
  ArrowRight,
} from 'lucide-react'

import { useAuthStore } from '../../features/auth/authStore'
import { getMe } from '../../features/auth/api'
import { StatusText } from '../../components/ui/StatusText'

const ACCOUNT_STATUS_META = {
  ACTIVE: {
    label: 'Đang hoạt động',
    tone: 'success',
    icon: CheckCircle2,
  },
  SUSPENDED: {
    label: 'Tạm khóa',
    tone: 'danger',
    icon: XCircle,
  },
  PENDING_VERIFICATION: {
    label: 'Chờ xác thực',
    tone: 'warning',
    icon: Clock,
  },
}

const formatDateTime = (isoStr) => {
  if (!isoStr) return '-'
  try {
    return new Date(isoStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export const ProviderDashboardPage = () => {
  const { account } = useAuthStore()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let isMounted = true

    getMe()
      .then((me) => {
        if (isMounted && me) {
          setProfile(me)
        }
      })
      .catch((error) => {
        console.warn('Không thể làm mới thông tin đối tác:', error)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const currentAccount = profile || account
  const statusInfo = ACCOUNT_STATUS_META[currentAccount?.status] || {
    label: 'Đang cập nhật',
    tone: 'neutral',
    icon: Clock,
  }

  return (
    <div className="space-y-6 font-sans">
      <h1 className="text-2xl font-display font-bold text-ink">
        Tổng quan Đối tác
      </h1>

      {/* Thông tin tài khoản đối tác */}
      <div className="bg-white rounded-md border border-neutral-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <h2 className="text-base font-display font-bold text-ink">
            Thông tin tài khoản
          </h2>
          <StatusText
            icon={statusInfo.icon}
            label={statusInfo.label}
            tone={statusInfo.tone}
          />
        </div>

        <dl className="divide-y divide-neutral-100 text-sm">
          <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
            <dt className="text-neutral-500">Tên hiển thị</dt>
            <dd className="font-medium text-ink">
              {currentAccount?.displayName || '-'}
            </dd>
          </div>

          <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
            <dt className="text-neutral-500">Email đăng nhập</dt>
            <dd className="font-medium text-ink break-all">
              {currentAccount?.email || '-'}
            </dd>
          </div>

          <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
            <dt className="text-neutral-500">Số điện thoại</dt>
            <dd className="font-medium text-ink tabular-nums">
              {currentAccount?.phone || 'Chưa cập nhật'}
            </dd>
          </div>

          <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
            <dt className="text-neutral-500">Ngày xác thực email</dt>
            <dd className="font-medium text-ink tabular-nums">
              {currentAccount?.emailVerifiedAt
                ? formatDateTime(currentAccount.emailVerifiedAt)
                : 'Chưa xác thực'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
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
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-md border border-neutral-200 p-4 flex items-center justify-between hover:border-primary-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-md bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-ink">{label}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default ProviderDashboardPage
