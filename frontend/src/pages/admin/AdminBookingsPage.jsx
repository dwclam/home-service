import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  RefreshCw,
  TimerOff,
  Eye,
  CheckCircle2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getAdminBookings,
  triggerAdminExpireOverdueBookings,
} from '../../features/booking/api'
import {
  BOOKING_STATUS,
  BOOKING_STATUS_CONFIG,
  SETTLEMENT_STATUS,
  SETTLEMENT_STATUS_CONFIG,
} from '../../constants/status'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: BOOKING_STATUS.PENDING_PROVIDER, label: 'Chờ xác nhận' },
  { key: BOOKING_STATUS.PENDING_DEPOSIT, label: 'Chờ đặt cọc' },
  { key: BOOKING_STATUS.CONFIRMED, label: 'Đã xác nhận' },
  { key: BOOKING_STATUS.IN_PROGRESS, label: 'Đang thực hiện' },
  { key: BOOKING_STATUS.COMPLETED, label: 'Hoàn thành' },
  { key: BOOKING_STATUS.CANCELLED, label: 'Đã hủy' },
  { key: BOOKING_STATUS.REJECTED, label: 'Từ chối' },
  { key: BOOKING_STATUS.EXPIRED, label: 'Hết hạn' },
]

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' đ'

const formatDateTimeVi = (isoStr) => {
  if (!isoStr) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoStr))
}

export const AdminBookingsPage = () => {
  const [pageData, setPageData] = useState({
    items: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
  })
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [settlementFilter, setSettlementFilter] = useState('ALL')
  const [bookingCodeInput, setBookingCodeInput] = useState('')
  const [appliedBookingCode, setAppliedBookingCode] = useState('')
  const [sortOption, setSortOption] = useState('createdAt:DESC')
  const [currentPage, setCurrentPage] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [isExpiring, setIsExpiring] = useState(false)
  const [expireResult, setExpireResult] = useState(null)

  const loadBookings = () => {
    setIsLoading(true)
    setErrorMessage('')
    setReloadTick((prev) => prev + 1)
  }

  useEffect(() => {
    let isMounted = true
    const fetchBookings = async () => {
      try {
        const [sortBy, sortDir] = sortOption.split(':')
        const res = await getAdminBookings({
          status: statusFilter,
          settlementStatus: settlementFilter,
          bookingCode: appliedBookingCode,
          page: currentPage,
          size: PAGE_SIZE,
          sortBy,
          sortDir,
        })
        if (!isMounted) return
        setPageData(res.pageData)
        setErrorMessage('')
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(
          error?.response?.data?.message ||
            'Không thể tải danh sách đơn đặt lịch.'
        )
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchBookings()
    return () => {
      isMounted = false
    }
  }, [
    statusFilter,
    settlementFilter,
    appliedBookingCode,
    currentPage,
    sortOption,
    reloadTick,
  ])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setCurrentPage(0)
    setAppliedBookingCode(bookingCodeInput.trim())
  }

  const handleTriggerExpire = async () => {
    setIsExpiring(true)
    try {
      const res = await triggerAdminExpireOverdueBookings()
      setExpireResult(res.data)
      toast.success(res.message || 'Đã hoàn tất quét đơn quá hạn.')
      await loadBookings()
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Không thể chạy tác vụ quét đơn quá hạn.'
      )
    } finally {
      setIsExpiring(false)
    }
  }

  const columns = [
    {
      key: 'bookingCode',
      title: 'Mã đơn',
      render: (row) => (
        <div>
          <Link
            to={`/admin/bookings/${row.id}`}
            className="font-semibold text-primary-600 hover:underline tabular-nums"
          >
            {row.bookingCode}
          </Link>
          <p className="text-xs text-neutral-500 mt-0.5 tabular-nums">
            {formatDateTimeVi(row.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      title: 'Khách hàng',
      render: (row) => (
        <div>
          <p className="font-medium text-ink">
            {row.customer?.displayName || '—'}
          </p>
          <p className="text-xs text-neutral-500 tabular-nums">
            {row.customer?.phone || row.customer?.email || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'provider',
      title: 'Nhà cung cấp',
      render: (row) => (
        <div>
          <p className="font-medium text-ink">
            {row.provider?.businessName || '—'}
          </p>
          <p className="text-xs text-neutral-500 tabular-nums">
            {row.provider?.phone || row.provider?.email || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'service',
      title: 'Dịch vụ & Lịch hẹn',
      render: (row) => (
        <div className="max-w-[240px]">
          <p className="font-medium text-ink truncate">
            {row.service?.serviceTitleSnapshot || '—'}
          </p>
          <p className="text-xs text-neutral-500 tabular-nums mt-0.5">
            {formatDateTimeVi(row.startsAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'totalAmountVnd',
      title: 'Tổng tiền',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-ink tabular-nums whitespace-nowrap">
          {formatVnd(row.totalAmountVnd)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => (
        <StatusBadge status={row.status} configMap={BOOKING_STATUS_CONFIG} />
      ),
    },
    {
      key: 'settlementStatus',
      title: 'Đối soát',
      render: (row) =>
        row.settlementStatus ? (
          <StatusBadge
            status={row.settlementStatus}
            configMap={SETTLEMENT_STATUS_CONFIG}
          />
        ) : (
          <span className="text-xs text-neutral-400">—</span>
        ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (row) => (
        <Link to={`/admin/bookings/${row.id}`}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Eye className="w-4 h-4" />}
          >
            Chi tiết
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-ink">
          Quản lý đơn hàng
        </h1>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={loadBookings}
            disabled={isLoading}
          >
            Làm mới
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<TimerOff className="w-4 h-4" />}
            isLoading={isExpiring}
            onClick={handleTriggerExpire}
          >
            Quét đơn quá hạn
          </Button>
        </div>
      </div>

      {expireResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="space-y-1">
              <p className="font-semibold">Kết quả quét đơn quá hạn</p>
              <p className="text-xs text-emerald-700 tabular-nums">
                Quá hạn phản hồi: {expireResult.providerExpiredCount ?? 0} · Quá
                hạn đặt cọc: {expireResult.depositExpiredCount ?? 0} · Tổng đóng:{' '}
                {expireResult.totalExpiredCount ?? 0} · Lỗi xử lý:{' '}
                {expireResult.totalErrors ?? 0}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpireResult(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
            aria-label="Đóng thông báo kết quả"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-md p-4 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key)
                  setCurrentPage(0)
                }}
                className={`h-9 px-3.5 rounded-md text-xs font-medium transition-colors duration-150 shrink-0 cursor-pointer ${
                  active
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          <div className="md:col-span-5">
            <Input
              value={bookingCodeInput}
              onChange={(e) => setBookingCodeInput(e.target.value)}
              placeholder="Tìm theo mã đơn hàng..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="md:col-span-3">
            <Select
              value={settlementFilter}
              onChange={(e) => {
                setSettlementFilter(e.target.value)
                setCurrentPage(0)
              }}
              aria-label="Lọc trạng thái đối soát"
            >
              <option value="ALL">Tất cả đối soát</option>
              <option value={SETTLEMENT_STATUS.DRAFT}>Chờ đối soát</option>
              <option value={SETTLEMENT_STATUS.ON_HOLD}>Tạm giữ đối soát</option>
              <option value={SETTLEMENT_STATUS.FINALIZED}>Đã chốt đối soát</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value)
                setCurrentPage(0)
              }}
              aria-label="Sắp xếp"
            >
              <option value="createdAt:DESC">Mới nhất</option>
              <option value="createdAt:ASC">Cũ nhất</option>
              <option value="startsAt:ASC">Giờ hẹn gần nhất</option>
              <option value="totalAmountVnd:DESC">Giá trị cao nhất</option>
            </Select>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" variant="secondary" size="md" fullWidth>
              Tìm kiếm
            </Button>
          </div>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={pageData.items}
        isLoading={isLoading}
        error={errorMessage}
        onRetry={loadBookings}
        emptyTitle="Chưa có đơn đặt lịch nào"
        emptyDescription="Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."
        pagination={pageData}
        onPageChange={(nextPage) => setCurrentPage(nextPage)}
      />
    </div>
  )
}

export default AdminBookingsPage
