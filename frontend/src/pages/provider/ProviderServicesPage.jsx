import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Edit3,
  Archive,
  Send,
  Clock,
  Image as ImageIcon,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getActiveCategories,
  getMyServicesPage,
  createProviderService,
  updateProviderService,
} from '../../features/catalog/api'
import { SERVICE_STATUS, SERVICE_STATUS_CONFIG } from '../../constants/status'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ServiceFormModal } from '../../features/catalog/components/ServiceFormModal'

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả gói' },
  { key: SERVICE_STATUS.PUBLISHED, label: 'Đang công khai' },
  { key: SERVICE_STATUS.DRAFT, label: 'Bản nháp' },
  { key: SERVICE_STATUS.ARCHIVED, label: 'Đã lưu trữ' },
]

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' đ'

export const ProviderServicesPage = () => {
  const [categories, setCategories] = useState([])
  const [pageData, setPageData] = useState({
    items: [],
    page: 0,
    size: 6,
    totalElements: 0,
    totalPages: 1,
  })
  const [currentPage, setCurrentPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMockMode, setIsMockMode] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)

  useEffect(() => {
    let isMounted = true
    const fetchCategories = async () => {
      try {
        const res = await getActiveCategories()
        if (isMounted) {
          setCategories(res.items || [])
        }
      } catch (err) {
        console.warn('Could not load categories:', err)
      }
    }
    fetchCategories()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchServices = async () => {
      try {
        const res = await getMyServicesPage({
          page: currentPage,
          size: 6,
          status: statusFilter,
          keyword,
        })
        if (!isMounted) return
        setPageData(res.pageData)
        setIsMockMode(Boolean(res.isMock))
        setError('')
      } catch (err) {
        if (!isMounted) return
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách dịch vụ.'
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchServices()

    return () => {
      isMounted = false
    }
  }, [currentPage, statusFilter, keyword, reloadTick])

  const triggerReload = (nextPage = currentPage) => {
    setIsLoading(true)
    setError('')
    setCurrentPage(nextPage)
    setReloadTick((prev) => prev + 1)
  }

  const handleStatusTabChange = (nextStatus) => {
    setIsLoading(true)
    setStatusFilter(nextStatus)
    setCurrentPage(0)
  }

  const handleKeywordChange = (e) => {
    setIsLoading(true)
    setKeyword(e.target.value)
    setCurrentPage(0)
  }

  const handleOpenCreate = () => {
    setEditingService(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (service) => {
    setEditingService(service)
    setModalOpen(true)
  }

  const handleSaveService = async (formValues) => {
    try {
      if (editingService?.id) {
        await updateProviderService(editingService.id, formValues)
        toast.success('Đã cập nhật gói dịch vụ.')
      } else {
        await createProviderService(formValues)
        toast.success('Đã tạo gói dịch vụ mới.')
      }
      setModalOpen(false)
      setEditingService(null)
      triggerReload(currentPage)
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Lưu gói dịch vụ thất bại.'
      )
    }
  }

  const handleQuickStatusChange = async (service, nextStatus) => {
    try {
      await updateProviderService(service.id, {
        ...service,
        status: nextStatus,
      })
      toast.success(
        nextStatus === SERVICE_STATUS.PUBLISHED
          ? 'Đã đăng công khai gói dịch vụ.'
          : 'Đã chuyển gói dịch vụ vào lưu trữ.'
      )
      triggerReload(currentPage)
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể chuyển trạng thái gói dịch vụ.'
      )
    }
  }

  const columns = [
    {
      key: 'title',
      title: 'Gói dịch vụ',
      render: (row) => {
        const coverImg = row.images?.[0]?.imageUrl
        return (
          <div className="flex items-start gap-3 max-w-md">
            {coverImg ? (
              <img
                src={coverImg}
                alt={row.title}
                className="w-12 h-12 rounded-md object-cover border border-neutral-200 shrink-0 bg-neutral-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-ink line-clamp-1">{row.title}</p>
              <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                {row.categoryName || 'Danh mục dịch vụ'} •{' '}
                {row.images?.length || 0} ảnh
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'basePriceVnd',
      title: 'Giá cố định',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-ink">
          {formatVnd(row.basePriceVnd)}
        </span>
      ),
    },
    {
      key: 'durationMinutes',
      title: 'Thời lượng',
      align: 'center',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          {row.durationMinutes} phút
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => (
        <StatusBadge status={row.status} configMap={SERVICE_STATUS_CONFIG} />
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          {row.status !== SERVICE_STATUS.PUBLISHED && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                handleQuickStatusChange(row, SERVICE_STATUS.PUBLISHED)
              }
              leftIcon={<Send className="w-3.5 h-3.5 text-primary-600" />}
            >
              Công khai
            </Button>
          )}

          {row.status !== SERVICE_STATUS.ARCHIVED && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                handleQuickStatusChange(row, SERVICE_STATUS.ARCHIVED)
              }
              leftIcon={<Archive className="w-3.5 h-3.5 text-neutral-500" />}
            >
              Lưu trữ
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Sửa
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
            Quản lý gói dịch vụ & Hình ảnh
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            UC19 — Tạo nháp, đăng công khai hoặc lưu trữ gói dịch vụ giá cố định.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Thêm gói dịch vụ
        </Button>
      </div>

      {isMockMode && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">
          <Info className="w-4 h-4 shrink-0 text-primary-600" />
          <span>
            Đang dùng dữ liệu mẫu theo hợp đồng API (sẵn sàng nối BE UC19 & UC30 của Cường)
          </span>
        </div>
      )}

      {/* Bộ lọc tab trạng thái & Tìm kiếm */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusTabChange(tab.key)}
                className={`h-9 px-3.5 rounded-full text-xs font-semibold transition-colors duration-150 shrink-0 cursor-pointer ${
                  active
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="w-full md:w-72">
          <Input
            placeholder="Tìm theo tên gói hoặc danh mục..."
            value={keyword}
            onChange={handleKeywordChange}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Bảng dữ liệu dùng chung DataTable */}
      <DataTable
        columns={columns}
        data={pageData.items}
        isLoading={isLoading}
        error={error}
        onRetry={() => triggerReload(currentPage)}
        emptyTitle="Chưa có gói dịch vụ nào"
        emptyDescription="Tạo gói dịch vụ đầu tiên với mức giá và thời lượng rõ ràng để khách hàng đặt lịch."
        emptyAction={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo gói dịch vụ ngay
          </Button>
        }
        pagination={pageData}
        onPageChange={(nextPage) => triggerReload(nextPage)}
      />

      {/* Modal tạo / sửa */}
      <ServiceFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingService(null)
        }}
        onSubmitService={handleSaveService}
        initialData={editingService}
        categories={categories}
      />
    </div>
  )
}

export default ProviderServicesPage
