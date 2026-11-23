import { useState } from 'react'
import { TimerOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { BOOKING_STATUS } from '../../constants/status'
import { triggerAdminExpireOverdueBookings } from '../../features/booking/api'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'

const SAMPLE_OPERATIONAL_BOOKINGS = [
  {
    id: 8001,
    code: 'BK-2026-081',
    serviceTitle: 'Vệ sinh điều hòa treo tường trọn gói',
    customerName: 'Trần Minh Quân',
    providerName: 'Điện Lạnh Bách Khoa 247',
    totalAmountVnd: 250000,
    status: BOOKING_STATUS.PENDING_PROVIDER,
  },
  {
    id: 8002,
    code: 'BK-2026-082',
    serviceTitle: 'Tháo lồng vệ sinh máy giặt cửa ngang',
    customerName: 'Lê Thu Hà',
    providerName: 'Điện Lạnh Bách Khoa 247',
    totalAmountVnd: 450000,
    status: BOOKING_STATUS.CONFIRMED,
  },
  {
    id: 8003,
    code: 'BK-2026-083',
    serviceTitle: 'Sửa chữa rò rỉ đường ống nước âm tường',
    customerName: 'Phạm Hoàng Nam',
    providerName: 'Điện Nước Thành Công',
    totalAmountVnd: 600000,
    status: BOOKING_STATUS.IN_PROGRESS,
  },
  {
    id: 8004,
    code: 'BK-2026-084',
    serviceTitle: 'Bảo trì bình nóng lạnh & súc xả cặn',
    customerName: 'Nguyễn Mai Anh',
    providerName: 'Điện Lạnh Bách Khoa 247',
    totalAmountVnd: 200000,
    status: BOOKING_STATUS.COMPLETED,
  },
  {
    id: 8005,
    code: 'BK-2026-085',
    serviceTitle: 'Vệ sinh tổng quát căn hộ 2 phòng ngủ',
    customerName: 'Vũ Đức Thịnh',
    providerName: 'Tâm An Home Care',
    totalAmountVnd: 550000,
    status: BOOKING_STATUS.CANCELLED,
  },
  {
    id: 8006,
    code: 'BK-2026-086',
    serviceTitle: 'Nạp bổ sung gas R32 điều hòa Inverter',
    customerName: 'Đỗ Thanh Tùng',
    providerName: 'Điện Lạnh Bách Khoa 247',
    totalAmountVnd: 350000,
    status: BOOKING_STATUS.REJECTED,
  },
]

const formatVnd = (val) =>
  new Intl.NumberFormat('vi-VN').format(Number(val || 0)) + ' đ'

export const AdminOverviewPage = () => {
  const [isExpiringOverdue, setIsExpiringOverdue] = useState(false)
  const [lastExpirationReport, setLastExpirationReport] = useState(null)

  const handleTriggerExpireOverdue = async () => {
    setIsExpiringOverdue(true)
    try {
      const res = await triggerAdminExpireOverdueBookings()
      setLastExpirationReport({
        ...res.data,
        executedAt: new Date().toISOString(),
      })
      toast.success(res.message || 'Đã quét đơn quá hạn.')
    } catch (error) {
      const apiErr = error?.response?.data
      toast.error(
        apiErr?.message ||
          error?.message ||
          'Không thể quét đơn quá hạn.'
      )
    } finally {
      setIsExpiringOverdue(false)
    }
  }

  const columns = [
    {
      key: 'code',
      title: 'Mã đơn',
      render: (row) => (
        <span className="font-semibold text-ink">{row.code}</span>
      ),
    },
    {
      key: 'serviceTitle',
      title: 'Dịch vụ',
      render: (row) => (
        <span className="font-medium text-ink line-clamp-1">
          {row.serviceTitle}
        </span>
      ),
    },
    {
      key: 'providerName',
      title: 'Nhà cung cấp',
    },
    {
      key: 'customerName',
      title: 'Khách hàng',
    },
    {
      key: 'totalAmountVnd',
      title: 'Giá trị đơn',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-ink">
          {formatVnd(row.totalAmountVnd)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          Tổng quan vận hành
        </h2>

        <Button
          type="button"
          variant="secondary"
          size="md"
          isLoading={isExpiringOverdue}
          onClick={handleTriggerExpireOverdue}
          leftIcon={<TimerOff className="w-4 h-4" />}
        >
          Quét đơn quá hạn
        </Button>
      </div>

      {lastExpirationReport && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-emerald-700 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Kết quả lần quét gần nhất
            </span>
            <span className="text-neutral-500">
              {new Intl.DateTimeFormat('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              }).format(new Date(lastExpirationReport.executedAt))}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-md bg-neutral-50 border border-neutral-200">
              <p className="text-neutral-500">Quá hạn phản hồi</p>
              <p className="text-lg font-bold text-ink mt-0.5">
                {lastExpirationReport.providerExpiredCount ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-md bg-neutral-50 border border-neutral-200">
              <p className="text-neutral-500">Quá hạn đặt cọc</p>
              <p className="text-lg font-bold text-ink mt-0.5">
                {lastExpirationReport.depositExpiredCount ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-md bg-neutral-50 border border-neutral-200">
              <p className="text-neutral-500">Tổng đơn đã đóng</p>
              <p className="text-lg font-bold text-primary-600 mt-0.5">
                {lastExpirationReport.totalExpiredCount ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={SAMPLE_OPERATIONAL_BOOKINGS} />
    </div>
  )
}

export default AdminOverviewPage
