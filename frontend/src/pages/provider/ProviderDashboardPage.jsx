import { useState, useEffect } from 'react'
import { Mail, Phone, ShieldCheck, CalendarCheck, User } from 'lucide-react'

import { useAuthStore } from '../../features/auth/authStore'
import { getMe } from '../../features/auth/api'

const ACCOUNT_STATUS_LABELS = {
  ACTIVE: {
    label: 'Đang hoạt động',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  SUSPENDED: {
    label: 'Tạm khóa',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  PENDING_VERIFICATION: {
    label: 'Chờ xác thực',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
}

const formatDateTime = (isoStr) => {
  if (!isoStr) return '—'
  try {
    return new Date(isoStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
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
  const statusInfo = ACCOUNT_STATUS_LABELS[currentAccount?.status] || {
    label: 'Đang cập nhật',
    className: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-display font-bold text-ink">
          Tổng quan Đối tác
        </h1>
      </div>

      {/* Thông tin tài khoản đối tác */}
      <div className="bg-white rounded-md border border-neutral-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary-500 text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
              {(currentAccount?.displayName || currentAccount?.email || 'P')
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-ink">
                {currentAccount?.displayName || 'Tài khoản Đối tác'}
              </h2>
              <p className="text-xs text-neutral-500">{currentAccount?.email}</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border self-start sm:self-center ${statusInfo.className}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-100 space-y-1">
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span>Tên hiển thị</span>
            </p>
            <p className="font-semibold text-ink">
              {currentAccount?.displayName || '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-100 space-y-1">
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-neutral-400" />
              <span>Email đăng nhập</span>
            </p>
            <p className="font-semibold text-ink truncate">
              {currentAccount?.email || '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-100 space-y-1">
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              <span>Số điện thoại</span>
            </p>
            <p className="font-semibold text-ink">
              {currentAccount?.phone || 'Chưa cập nhật'}
            </p>
          </div>
        </div>

        {currentAccount?.emailVerifiedAt && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 pt-1">
            <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Đã xác thực email lúc:{' '}
              <strong className="text-ink">
                {formatDateTime(currentAccount.emailVerifiedAt)}
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProviderDashboardPage
