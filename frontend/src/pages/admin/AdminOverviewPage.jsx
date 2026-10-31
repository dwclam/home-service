import { ClipboardList, Wallet, ShieldCheck, Activity } from 'lucide-react'
import { BOOKING_STATUS } from '../../constants/status'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'

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
      title: 'Gói dịch vụ',
      render: (row) => (
        <div>
          <p className="font-medium text-ink line-clamp-1">
            {row.serviceTitle}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            NCC: {row.providerName}
          </p>
        </div>
      ),
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
      title: 'Trạng thái đơn',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          Khung Quản trị Vận hành (Admin)
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Khung giao diện Dashboard Admin vận hành của Minh (Tuần 1) — Đối chiếu chuẩn StatusBadge và DataTable dùng chung.
        </p>
      </div>

      {/* Thẻ chỉ số khung */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Đơn đang theo dõi
            </span>
            <ClipboardList className="w-4 h-4 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-ink">06</p>
          <p className="text-xs text-neutral-500 mt-1">Dữ liệu mẫu khung P0</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Trạng thái thực hiện
            </span>
            <Activity className="w-4 h-4 text-primary-600" />
          </div>
          <div className="mt-1">
            <StatusBadge status={BOOKING_STATUS.IN_PROGRESS} />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Chuẩn badge không nền/viền
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Tỷ lệ cọc / Hoa hồng
            </span>
            <Wallet className="w-4 h-4 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-ink">30% / 20%</p>
          <p className="text-xs text-neutral-500 mt-1">
            Làm tròn ROUND_HALF_UP
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Phân quyền Route
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-ink">RBAC</p>
          <p className="text-xs text-neutral-500 mt-1">
            Kiểm tra vai trò ADMIN
          </p>
        </div>
      </div>

      {/* Bảng đối chiếu 6 trạng thái đơn trong FE-guideline-lite */}
      <div className="space-y-3">
        <h3 className="text-[17px] font-semibold text-ink">
          Bảng dữ liệu mẫu vận hành đơn & Hệ thống Badge trạng thái
        </h3>
        <DataTable columns={columns} data={SAMPLE_OPERATIONAL_BOOKINGS} />
      </div>
    </div>
  )
}

export default AdminOverviewPage
