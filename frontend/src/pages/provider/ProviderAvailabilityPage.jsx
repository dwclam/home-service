import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  CalendarClock,
  CalendarRange,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getMyAvailabilityList,
  createAvailabilitySlot,
  createBatchAvailabilitySlots,
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
  { key: 'ALL', label: 'Tất cả' },
  { key: AVAILABILITY_STATE.AVAILABLE, label: 'Mở nhận việc' },
  { key: AVAILABILITY_STATE.BLOCKED, label: 'Khóa lịch' },
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

const formatDurationLabel = (startsAt, endsAt) => {
  const diffMs = new Date(endsAt).getTime() - new Date(startsAt).getTime()
  const mins = Math.max(0, Math.round(diffMs / 60000))
  if (mins >= 60 && mins % 60 === 0) {
    return `${mins / 60} giờ`
  }
  return `${mins} phút`
}

export const ProviderAvailabilityPage = () => {
  const [slots, setSlots] = useState([])
  const [stateFilter, setStateFilter] = useState('ALL')
  const [reloadTick, setReloadTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isBatchCreating, setIsBatchCreating] = useState(false)
  const [error, setError] = useState('')
  const [conflictAlert, setConflictAlert] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)

  useEffect(() => {
    let isMounted = true

    const fetchAvailability = async () => {
      try {
        const res = await getMyAvailabilityList({ state: stateFilter })
        if (!isMounted) return
        setSlots(res.items || [])
        setError('')
      } catch (err) {
        if (!isMounted) return
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách lịch làm việc.'
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
    setConflictAlert('')
    setEditingSlot(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (slot) => {
    setConflictAlert('')
    setEditingSlot(slot)
    setModalOpen(true)
  }

  const handleSaveSlot = async (payload) => {
    try {
      setConflictAlert('')
      if (editingSlot?.id) {
        await updateAvailabilitySlot(editingSlot.id, payload)
        toast.success('Đã cập nhật khung lịch.')
      } else {
        await createAvailabilitySlot(payload)
        toast.success('Đã thêm khung lịch mới.')
      }
      setModalOpen(false)
      setEditingSlot(null)
      triggerReload()
    } catch (err) {
      const code = err?.response?.data?.code || err?.code
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể lưu khung lịch.'

      if (code === 'DATA_CONFLICT' || err?.response?.status === 409) {
        setConflictAlert(msg)
      }
      toast.error(msg)
    }
  }

  const handleQuickBatchNext3Days = async () => {
    setIsBatchCreating(true)
    setConflictAlert('')
    try {
      const batchSlots = []
      for (let d = 1; d <= 3; d++) {
        const base = new Date(Date.now() + d * 24 * 3600 * 1000)
        const morningStart = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          8,
          0,
          0,
          0
        )
        const morningEnd = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          12,
          0,
          0,
          0
        )
        const afternoonStart = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          13,
          0,
          0,
          0
        )
        const afternoonEnd = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          17,
          0,
          0,
          0
        )

        batchSlots.push({
          startsAt: morningStart.toISOString(),
          endsAt: morningEnd.toISOString(),
          state: AVAILABILITY_STATE.AVAILABLE,
        })
        batchSlots.push({
          startsAt: afternoonStart.toISOString(),
          endsAt: afternoonEnd.toISOString(),
          state: AVAILABILITY_STATE.AVAILABLE,
        })
      }

      await createBatchAvailabilitySlots(batchSlots)
      toast.success('Đã mở lịch cho 3 ngày tới.')
      triggerReload()
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể mở lịch nhanh.'
      setConflictAlert(msg)
      toast.error(msg)
    } finally {
      setIsBatchCreating(false)
    }
  }

  const handleDeleteSlot = async (slot) => {
    try {
      setConflictAlert('')
      await deleteAvailabilitySlot(slot.id)
      toast.success('Đã xóa khung lịch.')
      triggerReload()
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể xóa khung lịch đang có đơn đặt.'
      setConflictAlert(msg)
      toast.error(msg)
    }
  }

  const columns = [
    {
      key: 'date',
      title: 'Ngày',
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
      title: 'Khung giờ',
      render: (row) => (
        <span className="font-medium text-ink">
          {formatTimeVi(row.startsAt)} – {formatTimeVi(row.endsAt)}
        </span>
      ),
    },
    {
      key: 'duration',
      title: 'Thời lượng',
      align: 'center',
      render: (row) => (
        <span className="text-xs font-medium text-neutral-600">
          {formatDurationLabel(row.startsAt, row.endsAt)}
        </span>
      ),
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
        <div className="inline-flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            aria-label="Sửa"
            className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer bg-transparent border-0 rounded-none outline-none"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteSlot(row)}
            aria-label="Xóa"
            className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer bg-transparent border-0 rounded-none outline-none"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          Lịch làm việc
        </h2>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            isLoading={isBatchCreating}
            onClick={handleQuickBatchNext3Days}
            leftIcon={<CalendarRange className="w-4 h-4" />}
          >
            Mở nhanh 3 ngày tới
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm khung lịch
          </Button>
        </div>
      </div>

      {conflictAlert && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-red-700 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p>{conflictAlert}</p>
          </div>
          <Link to="/provider/bookings" className="shrink-0">
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Xem đơn đặt
            </Button>
          </Link>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATE_FILTERS.map((tab) => {
          const active = stateFilter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStateTabChange(tab.key)}
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

      <DataTable
        columns={columns}
        data={slots}
        isLoading={isLoading}
        error={error}
        onRetry={triggerReload}
        emptyTitle="Chưa có khung lịch nào"
        emptyAction={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm khung lịch
          </Button>
        }
      />

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
