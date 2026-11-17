import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  RotateCw,
  Eye,
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MailWarning,
  RefreshCw,
  Loader2,
} from 'lucide-react'

import {
  getProviderApplications,
  getProviderApplicationDetail,
  approveProviderApplication,
  rejectProviderApplication,
  reissueProviderCredentials,
} from '../../features/admin/providerApplicationApi'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { key: 'PENDING_REVIEW', label: 'Chờ xét duyệt' },
  { key: 'PENDING_EMAIL', label: 'Chờ xác thực email' },
  { key: 'APPROVED', label: 'Đã phê duyệt' },
  { key: 'REJECTED', label: 'Đã từ chối' },
]

const APPLICATION_STATUS_BADGE = {
  PENDING_REVIEW: {
    label: 'Chờ xét duyệt',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  PENDING_EMAIL: {
    label: 'Chờ xác thực email',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Đã từ chối',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
}

const CREDENTIAL_EMAIL_STATUS_BADGE = {
  SENT: {
    label: 'Đã gửi',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  FAILED: {
    label: 'Gửi thất bại',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  UNCONFIRMED: {
    label: 'Chưa xác nhận',
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

const getSafeHttpUrl = (url) => {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : ''
  } catch {
    return ''
  }
}

export const AdminProviderApplicationsPage = () => {
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW')
  const [page, setPage] = useState(0)
  const [items, setItems] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Modal Chi Tiết
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Hành động duyệt & cấp lại mật khẩu tạm
  const [isApproving, setIsApproving] = useState(false)
  const [isReissuing, setIsReissuing] = useState(false)

  // Modal Từ Chối
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Tải danh sách theo (statusFilter, page)
  useEffect(() => {
    let isMounted = true

    getProviderApplications({ status: statusFilter, page, size: PAGE_SIZE })
      .then((res) => {
        if (!isMounted) return
        setItems(res?.items || [])
        setTotalElements(res?.totalElements ?? 0)
        setTotalPages(res?.totalPages ?? 0)
      })
      .catch((error) => {
        if (!isMounted) return
        toast.error(
          error.response?.data?.message ||
            'Không thể tải danh sách hồ sơ nhà cung cấp.'
        )
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [statusFilter, page])

  const reloadApplications = async (
    targetStatus = statusFilter,
    targetPage = page
  ) => {
    setIsLoading(true)
    try {
      const res = await getProviderApplications({
        status: targetStatus,
        page: targetPage,
        size: PAGE_SIZE,
      })
      setItems(res?.items || [])
      setTotalElements(res?.totalElements ?? 0)
      setTotalPages(res?.totalPages ?? 0)
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Không thể tải danh sách hồ sơ nhà cung cấp.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectTab = (tabKey) => {
    if (tabKey === statusFilter) {
      reloadApplications(tabKey, 0)
      return
    }
    setIsLoading(true)
    setPage(0)
    setStatusFilter(tabKey)
  }

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages || isLoading) return
    setIsLoading(true)
    setPage(nextPage)
  }

  const loadDetailById = async (id) => {
    setIsDetailLoading(true)
    try {
      const detail = await getProviderApplicationDetail(id)
      setSelectedDetail(detail)
      return detail
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Không thể tải chi tiết hồ sơ.'
      )
      return null
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleOpenDetail = async (id) => {
    setSelectedDetail(null)
    setDetailModalOpen(true)
    const detail = await loadDetailById(id)
    if (!detail) {
      setDetailModalOpen(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedDetail || isApproving || isReissuing) return
    setIsApproving(true)
    try {
      const result = await approveProviderApplication(selectedDetail.id)

      if (result?.credentialsEmailStatus === 'SENT') {
        toast.success(
          'Đã phê duyệt hồ sơ và gửi email mật khẩu tạm cho đối tác.'
        )
      } else if (result?.credentialsEmailStatus === 'FAILED') {
        toast.error(
          'Hồ sơ đã được duyệt nhưng gửi email mật khẩu tạm thất bại. Vui lòng bấm "Cấp lại mật khẩu tạm".'
        )
      } else {
        toast(
          'Hồ sơ đã được duyệt nhưng trạng thái gửi email chưa được xác nhận. Vui lòng kiểm tra lại nếu cần cấp lại mật khẩu.'
        )
      }

      await Promise.all([
        loadDetailById(selectedDetail.id),
        reloadApplications(statusFilter, page),
      ])
    } catch (error) {
      const errorData = error.response?.data
      toast.error(
        errorData?.message || 'Không thể phê duyệt hồ sơ. Vui lòng thử lại.'
      )
      if (errorData?.code === 'APPLICATION_NOT_REVIEWABLE') {
        await Promise.all([
          loadDetailById(selectedDetail.id),
          reloadApplications(statusFilter, page),
        ])
      }
    } finally {
      setIsApproving(false)
    }
  }

  const handleReissueCredentials = async () => {
    if (!selectedDetail || isReissuing || isApproving) return
    setIsReissuing(true)
    try {
      const result = await reissueProviderCredentials(selectedDetail.id)

      if (result?.credentialsEmailStatus === 'SENT') {
        toast.success('Đã cấp lại và gửi email mật khẩu tạm thành công.')
      } else if (result?.credentialsEmailStatus === 'FAILED') {
        toast.error(
          'Đã tạo mật khẩu tạm mới nhưng gửi email thất bại. Vui lòng thử lại.'
        )
      } else {
        toast(
          'Chưa xác nhận được kết quả gửi email. Vui lòng tải lại chi tiết để kiểm tra.'
        )
      }

      await Promise.all([
        loadDetailById(selectedDetail.id),
        reloadApplications(statusFilter, page),
      ])
    } catch (error) {
      const errorData = error.response?.data
      toast.error(
        errorData?.message ||
          'Không thể cấp lại mật khẩu tạm lúc này. Vui lòng thử lại.'
      )
      await Promise.all([
        loadDetailById(selectedDetail.id),
        reloadApplications(statusFilter, page),
      ])
    } finally {
      setIsReissuing(false)
    }
  }

  const handleOpenRejectModal = () => {
    setRejectReason('')
    setRejectError('')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = async (e) => {
    e.preventDefault()
    if (!selectedDetail || isRejecting) return

    const trimmed = rejectReason.trim()
    if (!trimmed) {
      setRejectError('Vui lòng nhập lý do từ chối hồ sơ.')
      return
    }
    if (trimmed.length > 2000) {
      setRejectError('Lý do từ chối không được vượt quá 2.000 ký tự.')
      return
    }

    setRejectError('')
    setIsRejecting(true)
    try {
      await rejectProviderApplication(selectedDetail.id, trimmed)
      toast.success('Đã từ chối hồ sơ và gửi email thông báo cho đối tác.')
      setRejectModalOpen(false)
      await Promise.all([
        loadDetailById(selectedDetail.id),
        reloadApplications(statusFilter, page),
      ])
    } catch (error) {
      const status = error.response?.status
      const errorData = error.response?.data
      const code = errorData?.code

      // Lỗi SMTP 503: backend rollback quyết định, giữ nguyên Modal để Admin thử lại
      if (status === 503 || code === 'EMAIL_DELIVERY_FAILED') {
        toast.error(
          errorData?.message ||
            'Gửi email thông báo từ chối thất bại. Quyết định chưa được lưu, vui lòng thử lại.'
        )
        return
      }

      if (status === 400 && errorData?.fieldErrors?.reason) {
        setRejectError(errorData.fieldErrors.reason)
      }

      toast.error(
        errorData?.message || 'Không thể từ chối hồ sơ. Vui lòng thử lại.'
      )

      if (code === 'APPLICATION_NOT_REVIEWABLE') {
        setRejectModalOpen(false)
        await Promise.all([
          loadDetailById(selectedDetail.id),
          reloadApplications(statusFilter, page),
        ])
      }
    } finally {
      setIsRejecting(false)
    }
  }

  const canApproveOrReject = selectedDetail?.status === 'PENDING_REVIEW'
  const canReissueCredentials =
    selectedDetail?.status === 'APPROVED' &&
    (selectedDetail?.credentialsEmailStatus === 'FAILED' ||
      selectedDetail?.credentialsEmailStatus === 'UNCONFIRMED')

  const safeDocUrl = getSafeHttpUrl(selectedDetail?.documentUrl)
  const detailStatusBadge = selectedDetail
    ? APPLICATION_STATUS_BADGE[selectedDetail.status]
    : null
  const detailEmailBadge = selectedDetail?.credentialsEmailStatus
    ? CREDENTIAL_EMAIL_STATUS_BADGE[selectedDetail.credentialsEmailStatus]
    : null

  return (
    <>
      <div className="space-y-6 font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-display font-bold text-ink">
            Duyệt Hồ Sơ Nhà Cung Cấp
          </h1>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => reloadApplications(statusFilter, page)}
            isLoading={isLoading}
            leftIcon={<RotateCw className="w-4 h-4" />}
          >
            Làm mới
          </Button>
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-white p-4 rounded-md border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSelectTab(tab.key)}
                className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-neutral-500">
            Tổng: <strong className="text-ink">{totalElements}</strong> hồ sơ
          </span>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-md border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">STT</th>
                  <th className="py-3 px-4">Cơ sở kinh doanh</th>
                  <th className="py-3 px-4">Email liên hệ</th>
                  <th className="py-3 px-4">Khu vực</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  {statusFilter === 'APPROVED' && (
                    <th className="py-3 px-4 text-center">Gửi mật khẩu</th>
                  )}
                  <th className="py-3 px-4">Thời gian nộp</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={statusFilter === 'APPROVED' ? 8 : 7}
                      className="py-12 text-center text-neutral-400"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                        <span>Đang tải danh sách hồ sơ...</span>
                      </span>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={statusFilter === 'APPROVED' ? 8 : 7}
                      className="py-10 text-center text-neutral-400"
                    >
                      Không có hồ sơ nào trong mục này.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const statusBadge = APPLICATION_STATUS_BADGE[item.status] || {
                      label: 'Đang cập nhật',
                      className: 'bg-neutral-100 text-neutral-600 border-neutral-200',
                    }
                    const emailBadge = item.credentialsEmailStatus
                      ? CREDENTIAL_EMAIL_STATUS_BADGE[item.credentialsEmailStatus]
                      : null

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-neutral-50/60 transition-colors"
                      >
                        <td className="py-3 px-4 text-center font-mono text-xs text-neutral-400">
                          {page * PAGE_SIZE + index + 1}
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-semibold text-ink">
                            {item.businessName}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {item.applicantName}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-neutral-700 text-xs">
                          {item.email}
                        </td>

                        <td className="py-3 px-4 text-neutral-600 text-xs">
                          {item.city || '—'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>

                        {statusFilter === 'APPROVED' && (
                          <td className="py-3 px-4 text-center">
                            {emailBadge ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${emailBadge.className}`}
                              >
                                {emailBadge.label}
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-400">—</span>
                            )}
                          </td>
                        )}

                        <td className="py-3 px-4 text-xs text-neutral-600">
                          <p>{formatDateTime(item.createdAt)}</p>
                          {item.emailVerifiedAt && (
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              Xác thực: {formatDateTime(item.emailVerifiedAt)}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenDetail(item.id)}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Xem chi tiết
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between text-xs text-neutral-600">
              <span>
                Trang <strong className="text-ink">{page + 1}</strong> /{' '}
                <strong className="text-ink">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 0 || isLoading}
                  onClick={() => handlePageChange(page - 1)}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page + 1 >= totalPages || isLoading}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Chi Tiết Hồ Sơ (đặt ngoài space-y-6) */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-md shadow-xl border border-neutral-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="font-display font-bold text-lg text-ink truncate">
                  {selectedDetail?.businessName || 'Chi tiết hồ sơ nhà cung cấp'}
                </h2>
                {detailStatusBadge && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${detailStatusBadge.className}`}
                  >
                    {detailStatusBadge.label}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isApproving || isReissuing || isRejecting) return
                  setDetailModalOpen(false)
                }}
                className="text-neutral-400 hover:text-ink cursor-pointer ml-3"
                aria-label="Đóng chi tiết"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {isDetailLoading && !selectedDetail ? (
                <div className="py-12 flex items-center justify-center text-neutral-500 gap-2 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  <span>Đang tải chi tiết hồ sơ...</span>
                </div>
              ) : selectedDetail ? (
                <>
                  {/* Thông tin cơ bản */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-neutral-50 p-4 rounded-md border border-neutral-200">
                    <div>
                      <p className="text-xs text-neutral-500">Người đại diện</p>
                      <p className="font-semibold text-ink mt-0.5">
                        {selectedDetail.applicantName || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Số điện thoại</p>
                      <p className="font-semibold text-ink mt-0.5">
                        {selectedDetail.phone || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Email liên hệ</p>
                      <p className="font-semibold text-ink mt-0.5 break-all">
                        {selectedDetail.email || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Khu vực hoạt động</p>
                      <p className="font-semibold text-ink mt-0.5">
                        {selectedDetail.city || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Thời gian nộp hồ sơ</p>
                      <p className="text-ink mt-0.5">
                        {formatDateTime(selectedDetail.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Xác thực email</p>
                      <p className="text-ink mt-0.5">
                        {selectedDetail.emailVerifiedAt
                          ? formatDateTime(selectedDetail.emailVerifiedAt)
                          : 'Chưa xác thực'}
                      </p>
                    </div>
                    {selectedDetail.decidedAt && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-neutral-500">Thời điểm xét duyệt</p>
                        <p className="text-ink mt-0.5">
                          {formatDateTime(selectedDetail.decidedAt)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Link tài liệu năng lực */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Tài liệu năng lực
                    </p>
                    {safeDocUrl ? (
                      <a
                        href={safeDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline break-all"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <span>{safeDocUrl}</span>
                      </a>
                    ) : (
                      <p className="text-sm text-neutral-500">
                        {selectedDetail.documentUrl || 'Không có đường dẫn tài liệu'}
                      </p>
                    )}
                  </div>

                  {/* Mô tả dịch vụ & năng lực */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Mô tả dịch vụ & năng lực chuyên môn
                    </p>
                    <div className="p-3.5 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 whitespace-pre-line leading-relaxed">
                      {selectedDetail.description || '—'}
                    </div>
                  </div>

                  {/* Lý do từ chối nếu REJECTED */}
                  {selectedDetail.status === 'REJECTED' &&
                    selectedDetail.rejectionReason && (
                      <div className="p-4 rounded-md border border-red-200 bg-red-50 space-y-1">
                        <p className="text-xs font-semibold text-red-700">
                          Lý do từ chối
                        </p>
                        <p className="text-sm text-red-900 whitespace-pre-line">
                          {selectedDetail.rejectionReason}
                        </p>
                      </div>
                    )}

                  {/* Trạng thái gửi email mật khẩu tạm nếu APPROVED */}
                  {selectedDetail.status === 'APPROVED' && (
                    <div className="p-4 rounded-md border border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-neutral-600">
                          Trạng thái gửi email mật khẩu tạm
                        </p>
                        <div className="flex items-center gap-2">
                          {detailEmailBadge ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${detailEmailBadge.className}`}
                            >
                              {selectedDetail.credentialsEmailStatus !== 'SENT' && (
                                <MailWarning className="w-3.5 h-3.5" />
                              )}
                              {detailEmailBadge.label}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-500">
                              Chưa có thông tin gửi thư
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => loadDetailById(selectedDetail.id)}
                        disabled={isDetailLoading}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-ink cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isDetailLoading ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Tải lại trạng thái</span>
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer Actions */}
            {selectedDetail && (
              <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/70 flex flex-wrap items-center justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isApproving || isReissuing || isRejecting}
                  onClick={() => setDetailModalOpen(false)}
                >
                  Đóng
                </Button>

                {canApproveOrReject && (
                  <>
                    <Button
                      type="button"
                      variant="danger"
                      size="md"
                      disabled={isApproving || isRejecting}
                      onClick={handleOpenRejectModal}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      Từ chối
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      isLoading={isApproving}
                      disabled={isApproving || isRejecting}
                      onClick={handleApprove}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Phê duyệt hồ sơ
                    </Button>
                  </>
                )}

                {canReissueCredentials && (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    isLoading={isReissuing}
                    disabled={isReissuing || isDetailLoading}
                    onClick={handleReissueCredentials}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Cấp lại mật khẩu tạm
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nhập Lý Do Từ Chối (đặt ngoài space-y-6) */}
      {rejectModalOpen && selectedDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-md shadow-xl border border-neutral-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <h3 className="font-display font-bold text-base text-ink">
                Từ chối hồ sơ nhà cung cấp
              </h3>
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => setRejectModalOpen(false)}
                className="text-neutral-400 hover:text-ink cursor-pointer disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4" noValidate>
              <p className="text-sm text-neutral-600">
                Từ chối hồ sơ của{' '}
                <strong className="text-ink">{selectedDetail.businessName}</strong> (
                {selectedDetail.email}).
              </p>

              <FormField
                label="Lý do từ chối"
                htmlFor="rejectReason"
                required
                error={rejectError}
              >
                <textarea
                  id="rejectReason"
                  rows={4}
                  value={rejectReason}
                  disabled={isRejecting}
                  onChange={(e) => {
                    setRejectReason(e.target.value)
                    if (rejectError) setRejectError('')
                  }}
                  placeholder="Nhập lý do từ chối để gửi thông báo qua email..."
                  className={`w-full rounded-md border px-3.5 py-2.5 text-sm font-sans text-ink outline-none transition-colors duration-150 ${
                    rejectError
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                  }`}
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isRejecting}
                  onClick={() => setRejectModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  isLoading={isRejecting}
                  disabled={isRejecting}
                >
                  Xác nhận từ chối
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminProviderApplicationsPage
