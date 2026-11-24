import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, MessageSquare, RefreshCw, AlertCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getMyComplaints,
  createCustomerComplaint,
} from '../../features/support/api'
import {
  COMPLAINT_STATUS,
  COMPLAINT_STATUS_CONFIG,
  COMPLAINT_CATEGORY,
  COMPLAINT_CATEGORY_LABELS,
} from '../../constants/status'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { CreateComplaintModal } from '../../features/support/components/CreateComplaintModal'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: COMPLAINT_STATUS.OPEN, label: 'Mới tiếp nhận' },
  { key: COMPLAINT_STATUS.IN_REVIEW, label: 'Đang xử lý' },
  { key: COMPLAINT_STATUS.RESOLVED, label: 'Đã giải quyết' },
  { key: COMPLAINT_STATUS.REJECTED, label: 'Đã từ chối' },
]

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

export const CustomerComplaintsPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const bookingIdFromQuery = searchParams.get('bookingId') || ''

  const [pageData, setPageData] = useState({
    items: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
  })
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(
    Boolean(bookingIdFromQuery)
  )

  const loadComplaints = () => {
    setIsLoading(true)
    setErrorMessage('')
    setReloadTick((prev) => prev + 1)
  }

  useEffect(() => {
    let isMounted = true
    const fetchComplaints = async () => {
      try {
        const res = await getMyComplaints({
          status: statusFilter,
          category: categoryFilter,
          page: currentPage,
          size: PAGE_SIZE,
        })
        if (!isMounted) return
        setPageData(res.pageData)
        setErrorMessage('')
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(
          error?.response?.data?.message ||
            'Không thể tải danh sách yêu cầu hỗ trợ.'
        )
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchComplaints()
    return () => {
      isMounted = false
    }
  }, [statusFilter, categoryFilter, currentPage, reloadTick])

  const handleCreateComplaint = async (values) => {
    try {
      const res = await createCustomerComplaint(values)
      toast.success(res.message)
      setCreateModalOpen(false)
      if (bookingIdFromQuery) {
        setSearchParams({}, { replace: true })
      }
      if (res.data?.id) {
        navigate(`/customer/complaints/${res.data.id}`)
      } else {
        await loadComplaints()
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Không thể gửi yêu cầu hỗ trợ.'
      )
    }
  }

  const complaints = pageData.items || []

  return (
    <div className="bg-neutral-50 min-h-[calc(100vh-64px)] py-8 sm:py-10 font-sans">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Hỗ trợ & Khiếu nại
          </h1>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={loadComplaints}
              disabled={isLoading}
            >
              Làm mới
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setCreateModalOpen(true)}
            >
              Tạo yêu cầu
            </Button>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
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

          <div className="w-full md:w-56 shrink-0">
            <Select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setCurrentPage(0)
              }}
              aria-label="Lọc danh mục hỗ trợ"
            >
              <option value="ALL">Tất cả danh mục</option>
              {Object.values(COMPLAINT_CATEGORY).map((cat) => (
                <option key={cat} value={cat}>
                  {COMPLAINT_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {errorMessage ? (
          <div className="bg-white border border-neutral-200 rounded-md p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm text-neutral-700">{errorMessage}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadComplaints}
            >
              Thử lại
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 bg-white border border-neutral-200 rounded-md animate-pulse"
              />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-md">
            <EmptyState
              title="Chưa có yêu cầu hỗ trợ nào"
              description="Khi cần hỗ trợ về đơn đặt lịch hoặc thanh toán, bạn có thể tạo yêu cầu tại đây."
              action={
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setCreateModalOpen(true)}
                >
                  Tạo yêu cầu hỗ trợ
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((item) => (
              <Link
                key={item.id}
                to={`/customer/complaints/${item.id}`}
                className="block bg-white border border-neutral-200 rounded-md p-5 hover:border-primary-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-medium text-neutral-500">
                        {COMPLAINT_CATEGORY_LABELS[item.category] ||
                          item.category}
                      </span>
                      {item.bookingCode && (
                        <span className="text-xs text-primary-600 font-medium tabular-nums">
                          · Đơn {item.bookingCode}
                        </span>
                      )}
                      <StatusBadge
                        status={item.status}
                        configMap={COMPLAINT_STATUS_CONFIG}
                      />
                    </div>
                    <h2 className="text-base font-semibold text-ink truncate">
                      {item.subject}
                    </h2>
                    {item.lastMessagePreview && (
                      <p className="text-xs text-neutral-600 truncate flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{item.lastMessagePreview}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-neutral-500 shrink-0 sm:text-right space-y-1">
                    <p className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      <span>
                        {formatDateTimeVi(item.lastMessageAt || item.createdAt)}
                      </span>
                    </p>
                    {item.assignedAdminName && (
                      <p className="text-neutral-600">
                        Phụ trách: {item.assignedAdminName}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
              <Pagination
                page={pageData.page}
                size={pageData.size}
                totalElements={pageData.totalElements}
                totalPages={pageData.totalPages}
                onPageChange={(nextPage) => setCurrentPage(nextPage)}
              />
            </div>
          </div>
        )}
      </div>

      <CreateComplaintModal
        isOpen={createModalOpen}
        defaultBookingId={bookingIdFromQuery}
        onClose={() => {
          setCreateModalOpen(false)
          if (bookingIdFromQuery) {
            setSearchParams({}, { replace: true })
          }
        }}
        onSubmitComplaint={handleCreateComplaint}
      />
    </div>
  )
}

export default CustomerComplaintsPage
