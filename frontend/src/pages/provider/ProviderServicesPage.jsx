import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Edit3,
  Archive,
  Send,
  Clock,
  Image as ImageIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getActiveCategories,
  getMyServicesPage,
  createProviderService,
  updateProviderService,
  publishProviderService,
  archiveProviderService,
} from '../../features/catalog/api'
import { SERVICE_STATUS, SERVICE_STATUS_CONFIG } from '../../constants/status'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ServiceFormModal } from '../../features/catalog/components/ServiceFormModal'

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
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
        await updateProviderService(
          editingService.id,
          formValues,
          editingService.status
        )
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
      if (nextStatus === SERVICE_STATUS.PUBLISHED) {
        await publishProviderService(service.id)
      } else if (nextStatus === SERVICE_STATUS.ARCHIVED) {
        await archiveProviderService(service.id)
      }
      toast.success(
        nextStatus === SERVICE_STATUS.PUBLISHED
          ? 'Đã đăng công khai gói dịch vụ.'
          : 'Đã lưu trữ gói dịch vụ.'
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
          <div className="flex items-center gap-3 max-w-md">
            {coverImg ? (
              <img
                src={coverImg}
                alt={row.title}
                className="w-11 h-11 rounded-md object-cover border border-neutral-200 shrink-0 bg-neutral-100"
              />
            ) : (
              <div className="w-11 h-11 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-ink line-clamp-1">{row.title}</p>
              <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                {row.categoryName || 'Danh mục dịch vụ'}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'basePriceVnd',
      title: 'Giá niêm yết',
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          Gói dịch vụ
        </h2>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Thêm gói dịch vụ
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusTabChange(tab.key)}
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

        <div className="w-full md:w-72">
          <Input
            placeholder="Tìm theo tên gói hoặc danh mục..."
            value={keyword}
            onChange={handleKeywordChange}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pageData.items}
        isLoading={isLoading}
        error={error}
        onRetry={() => triggerReload(currentPage)}
        emptyTitle="Chưa có gói dịch vụ nào"
        emptyAction={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo gói dịch vụ
          </Button>
        }
        pagination={pageData}
        onPageChange={(nextPage) => triggerReload(nextPage)}
      />

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
