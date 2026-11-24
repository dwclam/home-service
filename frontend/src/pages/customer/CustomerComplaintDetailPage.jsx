import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Loader2,
  ClipboardList,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getMyComplaintDetail,
  getMyComplaintMessages,
  sendMyComplaintMessage,
} from '../../features/support/api'
import { sendSupportMessageSchema } from '../../features/support/schemas'
import {
  BOOKING_STATUS_CONFIG,
  COMPLAINT_STATUS_CONFIG,
  COMPLAINT_CATEGORY_LABELS,
} from '../../constants/status'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'

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

export const CustomerComplaintDetailPage = () => {
  const { complaintId } = useParams()

  const [complaint, setComplaint] = useState(null)
  const [messages, setMessages] = useState([])
  const [canSendMessage, setCanSendMessage] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextBeforeId, setNextBeforeId] = useState(null)
  const [lastMessageId, setLastMessageId] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [scrollTrigger, setScrollTrigger] = useState(0)
  const bottomRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(sendSupportMessageSchema),
    defaultValues: { body: '' },
  })

  const loadAll = () => {
    setIsLoading(true)
    setErrorMessage('')
    setReloadTick((prev) => prev + 1)
  }

  useEffect(() => {
    let isMounted = true
    const fetchAll = async () => {
      try {
        const [detailRes, msgRes] = await Promise.all([
          getMyComplaintDetail(complaintId),
          getMyComplaintMessages(complaintId, { limit: 30 }),
        ])
        if (!isMounted) return
        setComplaint(detailRes)
        setMessages(msgRes?.items || [])
        setCanSendMessage(Boolean(msgRes?.canSendMessage))
        setHasMore(Boolean(msgRes?.hasMore))
        setNextBeforeId(msgRes?.nextBeforeId || null)
        setLastMessageId(msgRes?.lastMessageId || null)
        setErrorMessage('')
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(
          error?.response?.data?.message ||
            'Không thể tải thông tin yêu cầu hỗ trợ.'
        )
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchAll()
    return () => {
      isMounted = false
    }
  }, [complaintId, reloadTick])

  useEffect(() => {
    if (scrollTrigger > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [scrollTrigger])

  // Polling tin nhắn mới mỗi 8 giây khi cuộc trò chuyện đang mở
  useEffect(() => {
    if (!canSendMessage || !complaintId) return
    const timer = setInterval(async () => {
      try {
        const res = await getMyComplaintMessages(complaintId, {
          afterId: lastMessageId || undefined,
          limit: 30,
        })
        if (Array.isArray(res?.items) && res.items.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const fresh = res.items.filter((m) => !existingIds.has(m.id))
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
          if (res.lastMessageId) {
            setLastMessageId(res.lastMessageId)
          }
        }
        setCanSendMessage(Boolean(res?.canSendMessage))
      } catch {
        // Bỏ qua lỗi mạng thoáng qua khi polling
      }
    }, 8000)

    return () => clearInterval(timer)
  }, [canSendMessage, complaintId, lastMessageId])

  const handleLoadOlderMessages = async () => {
    if (!hasMore || !nextBeforeId || isLoadingOlder) return
    setIsLoadingOlder(true)
    try {
      const res = await getMyComplaintMessages(complaintId, {
        beforeId: nextBeforeId,
        limit: 30,
      })
      const older = res?.items || []
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id))
        const uniqueOlder = older.filter((m) => !existingIds.has(m.id))
        return [...uniqueOlder, ...prev]
      })
      setHasMore(Boolean(res?.hasMore))
      setNextBeforeId(res?.nextBeforeId || null)
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Không thể tải tin nhắn cũ hơn.'
      )
    } finally {
      setIsLoadingOlder(false)
    }
  }

  const onSendMessage = async (values) => {
    try {
      const sent = await sendMyComplaintMessage(complaintId, {
        body: values.body,
        bookingId: complaint?.booking?.id,
      })
      setMessages((prev) =>
        prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]
      )
      if (sent?.id) {
        setLastMessageId(sent.id)
      }
      reset({ body: '' })
      setScrollTrigger((prev) => prev + 1)
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Không thể gửi tin nhắn lúc này.'
      )
    }
  }

  if (isLoading) {
    return (
      <div className="bg-neutral-50 min-h-[calc(100vh-64px)] py-8 font-sans">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="h-8 w-48 bg-neutral-200 rounded-md animate-pulse" />
          <div className="h-44 bg-white border border-neutral-200 rounded-md animate-pulse" />
          <div className="h-80 bg-white border border-neutral-200 rounded-md animate-pulse" />
        </div>
      </div>
    )
  }

  if (errorMessage || !complaint) {
    return (
      <div className="bg-neutral-50 min-h-[calc(100vh-64px)] py-10 font-sans">
        <div className="mx-auto max-w-2xl px-4 bg-white border border-neutral-200 rounded-md p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-neutral-700">
            {errorMessage || 'Không tìm thấy yêu cầu hỗ trợ.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/customer/complaints">
              <Button variant="secondary" size="sm">
                Quay lại danh sách
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={loadAll}>
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 min-h-[calc(100vh-64px)] py-8 sm:py-10 font-sans">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/customer/complaints"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Danh sách yêu cầu hỗ trợ</span>
          </Link>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={loadAll}
          >
            Làm mới
          </Button>
        </div>

        {/* Chi tiết yêu cầu */}
        <section className="bg-white border border-neutral-200 rounded-md p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-medium text-neutral-500">
                  {COMPLAINT_CATEGORY_LABELS[complaint.category] ||
                    complaint.category}
                </span>
                <StatusBadge
                  status={complaint.status}
                  configMap={COMPLAINT_STATUS_CONFIG}
                />
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">
                {complaint.subject}
              </h1>
            </div>

            <div className="text-xs text-neutral-500 sm:text-right space-y-1 tabular-nums">
              <p>Tạo lúc: {formatDateTimeVi(complaint.createdAt)}</p>
              {complaint.assignedAdminName && (
                <p className="text-ink font-medium">
                  Phụ trách: {complaint.assignedAdminName}
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
            {complaint.description}
          </p>

          {complaint.booking && (
            <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary-600 shrink-0" />
                <div>
                  <p className="font-semibold text-ink">
                    Đơn hàng {complaint.booking.bookingCode}
                  </p>
                  <p className="text-neutral-600">
                    {complaint.booking.serviceTitleSnapshot}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={complaint.booking.status}
                  configMap={BOOKING_STATUS_CONFIG}
                />
                <Link
                  to={`/customer/bookings/${complaint.booking.id}`}
                  className="text-primary-600 font-medium hover:underline"
                >
                  Xem đơn
                </Link>
              </div>
            </div>
          )}

          {complaint.resolution && (
            <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 space-y-1 text-sm">
              <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Kết quả xử lý</span>
              </p>
              <p className="text-emerald-700 text-xs leading-relaxed">
                {complaint.resolution}
              </p>
              {complaint.resolvedAt && (
                <p className="text-[11px] text-emerald-600 tabular-nums">
                  Cập nhật lúc: {formatDateTimeVi(complaint.resolvedAt)}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Trao đổi hỗ trợ */}
        <section className="bg-white border border-neutral-200 rounded-md overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">
              Trao đổi với bộ phận hỗ trợ
            </h2>
            {!canSendMessage && (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <Lock className="w-3.5 h-3.5" />
                <span>Đã đóng trao đổi</span>
              </span>
            )}
          </div>

          <div className="p-6 space-y-4 max-h-[460px] overflow-y-auto bg-neutral-50/60">
            {hasMore && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleLoadOlderMessages}
                  disabled={isLoadingOlder}
                  leftIcon={
                    isLoadingOlder ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : undefined
                  }
                >
                  Tải tin nhắn cũ hơn
                </Button>
              </div>
            )}

            {messages.length === 0 ? (
              <p className="text-center text-xs text-neutral-500 py-8">
                Chưa có tin nhắn nào. Bạn có thể gửi tin nhắn bổ sung thông tin
                bên dưới.
              </p>
            ) : (
              messages.map((msg) => {
                const isCustomer = msg.senderType === 'CUSTOMER'
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isCustomer ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[11px] text-neutral-500 mb-1 px-1">
                      {isCustomer
                        ? 'Bạn'
                        : msg.senderDisplayName || 'Quản trị viên'}
                      {' · '}
                      <span className="tabular-nums">
                        {formatDateTimeVi(msg.createdAt)}
                      </span>
                    </span>
                    <div
                      className={`max-w-[82%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        isCustomer
                          ? 'bg-primary-500 text-white'
                          : 'bg-white border border-neutral-200 text-ink'
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {canSendMessage ? (
            <form
              onSubmit={handleSubmit(onSendMessage)}
              className="p-4 border-t border-neutral-200 bg-white space-y-2"
            >
              <div className="flex items-end gap-2.5">
                <div className="flex-1">
                  <textarea
                    rows={2}
                    {...register('body')}
                    placeholder="Nhập nội dung tin nhắn gửi bộ phận hỗ trợ..."
                    className="w-full rounded-md border border-neutral-200 px-3.5 py-2 text-sm text-ink placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Gửi
                </Button>
              </div>
              {errors.body?.message && (
                <p className="text-xs text-red-600">{errors.body.message}</p>
              )}
            </form>
          ) : (
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 text-xs text-neutral-500 text-center">
              Yêu cầu hỗ trợ này đã kết thúc nên không thể gửi thêm tin nhắn.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default CustomerComplaintDetailPage
