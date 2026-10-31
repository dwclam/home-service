import { useEffect, useState } from 'react'
import {
  Plus,
  CalendarClock,
  Edit3,
  Trash2,
  ShieldCheck,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getMyAvailabilityList,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
} from '../../features/provider/api'
import {
  AVAILABILITY_STATE,
  AVAILABILITY_STATE_CONFIG,
} from '../../constants/status'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { AvailabilityFormModal } from '../../features/provider/components/AvailabilityFormModal'

const STATE_FILTERS = [
  { key: 'ALL', label: 'Tất cả khung lịch' },
  { key: AVAILABILITY_STATE.AVAILABLE, label: 'Mở nhận việc (AVAILABLE)' },
  { key: AVAILABILITY_STATE.BLOCKED, label: 'Khóa lịch (BLOCKED)' },
]

const formatDateVi = (isoStr) => {
  if (!isoStr) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoStr))
}

const formatTimeVi = (isoStr) => {
  if (!isoStr) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoStr))
}

const calcDurationMinutes = (startsAt, endsAt) => {
  const diffMs = new Date(endsAt).getTime() - new Date(startsAt).getTime()
  return Math.max(0, Math.round(diffMs / 60000))
}

export const ProviderAvailabilityPage = () => {
  const [slots, setSlots] = useState([])
  const [stateFilter, setStateFilter] = useState('ALL')
  const [reloadTick, setReloadTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMockMode, setIsMockMode] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)

  useEffect(() => {
    let isMounted = true

    const fetchAvailability = async () => {
      try {
        const res = await getMyAvailabilityList({ state: stateFilter })
        if (!isMounted) return
        setSlots(res.items || [])
        setIsMockMode(Boolean(res.isMock))
        setError('')
      } catch (err) {
        if (!isMounted) return
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách lịch rảnh.'
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchAvailability()

    return () => {
      isMounted = false
    }
  }, [stateFilter, reloadTick])

  const triggerReload = () => {
    setIsLoading(true)
    setError('')
    setReloadTick((prev) => prev + 1)
  }

  const handleStateTabChange = (nextState) => {
    setIsLoading(true)
    setStateFilter(nextState)
  }

  const handleOpenCreate = () => {
    setEditingSlot(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (slot) => {
    setEditingSlot(slot)
    setModalOpen(true)
  }

  const handleSaveSlot = async (payload) => {
    try {
      if (editingSlot?.id) {
        await updateAvailabilitySlot(editingSlot.id, payload)
        toast.success('Đã cập nhật khung lịch thành công.')
      } else {
        await createAvailabilitySlot(payload)
        toast.success('Đã thêm khung lịch mới.')
      }
      setModalOpen(false)
      setEditingSlot(null)
      triggerReload()
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể lưu khung lịch.'
      )
    }
  }

  const handleDeleteSlot = async (slot) => {
    try {
      await deleteAvailabilitySlot(slot.id)
      toast.success('Đã xóa khung lịch.')
      triggerReload()
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể xóa khung lịch đang có đơn chiếm chỗ.'
      )
    }
  }

  const columns = [
    {
      key: 'date',
      title: 'Ngày áp dụng',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <CalendarClock className="w-4 h-4 text-primary-600 shrink-0" />
          <span className="font-semibold text-ink">
            {formatDateVi(row.startsAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'interval',
      title: 'Khoảng thời gian [bắt đầu, kết thúc)',
      render: (row) => (
        <span className="font-medium text-ink">
          {formatTimeVi(row.startsAt)} – {formatTimeVi(row.endsAt)}
        </span>
      ),
    },
    {
      key: 'duration',
      title: 'Tổng thời lượng',
      align: 'center',
      render: (row) => {
        const mins = calcDurationMinutes(row.startsAt, row.endsAt)
        const hours = (mins / 60).toFixed(1).replace(/\.0$/, '')
        return (
          <span className="text-xs font-medium text-neutral-600">
            {mins} phút ({hours} giờ)
          </span>
        )
      },
    },
    {
      key: 'state',
      title: 'Trạng thái',
      render: (row) => (
        <StatusBadge
          status={row.state}
          configMap={AVAILABILITY_STATE_CONFIG}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Sửa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteSlot(row)}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">
            Quản lý lịch rảnh & Khóa lịch
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            UC20 — Khai báo khoảng thời gian AVAILABLE hoặc BLOCKED theo quy ước nửa mở [bắt đầu, kết thúc).
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Thêm khung lịch
        </Button>
      </div>

      {/* Ghi chú quy tắc nghiệp vụ UC20 */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-600 leading-relaxed">
            <span className="font-semibold text-ink">
              Quy tắc bảo vệ chỗ đặt (UC20 & UC38):
            </span>{' '}
            Một đơn kết thúc lúc 10:00 không xung đột với đơn bắt đầu lúc 10:00. Hệ thống không cho phép sửa hoặc khóa lịch làm mất chỗ của đơn đang giữ cọc (PENDING_DEPOSIT), đã xác nhận (CONFIRMED) hoặc đang thực hiện (IN_PROGRESS).
          </div>
        </div>

        {isMockMode && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700 shrink-0">
            <Info className="w-3.5 h-3.5 text-primary-600" />
            <span>Dữ liệu mẫu hợp đồng API (BE UC20 - Thuỷ)</span>
          </div>
        )}
      </div>

      {/* Bộ lọc trạng thái */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATE_FILTERS.map((tab) => {
          const active = stateFilter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStateTabChange(tab.key)}
              className={`h-9 px-4 rounded-full text-xs font-semibold transition-colors duration-150 shrink-0 cursor-pointer ${
                active
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Bảng hiển thị */}
      <DataTable
        columns={columns}
        data={slots}
        isLoading={isLoading}
        error={error}
        onRetry={triggerReload}
        emptyTitle="Chưa có khung lịch nào"
        emptyDescription="Thêm khoảng thời gian mở nhận việc (AVAILABLE) để khách hàng có thể chọn giờ hẹn khi đặt dịch vụ."
        emptyAction={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Khai báo lịch rảnh đầu tiên
          </Button>
        }
      />

      {/* Modal thêm / sửa */}
      <AvailabilityFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingSlot(null)
        }}
        onSubmitSlot={handleSaveSlot}
        initialSlot={editingSlot}
      />
    </div>
  )
}

export default ProviderAvailabilityPage
