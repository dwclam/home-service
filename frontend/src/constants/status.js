/**
 * Ánh xạ các trạng thái nghiệp vụ tuân thủ FE-guideline-lite:
 * - Badge KHÔNG nền, KHÔNG viền, chỉ icon Lucide (-600) + chữ semibold (-700).
 * - Riêng trạng thái IN_PROGRESS ("Đang thực hiện") có spin = true.
 */

export const BOOKING_STATUS = {
  PENDING_PROVIDER: 'PENDING_PROVIDER',
  PENDING_DEPOSIT: 'PENDING_DEPOSIT',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
}

export const SERVICE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
}

export const AVAILABILITY_STATE = {
  AVAILABLE: 'AVAILABLE',
  BLOCKED: 'BLOCKED',
}

export const BANK_VERIFICATION_STATUS = {
  NOT_PROVIDED: 'NOT_PROVIDED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
}

export const SETTLEMENT_STATUS = {
  DRAFT: 'DRAFT',
  ON_HOLD: 'ON_HOLD',
  FINALIZED: 'FINALIZED',
}

export const COMPLAINT_STATUS = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
}

export const COMPLAINT_CATEGORY = {
  PAYMENT: 'PAYMENT',
  SERVICE: 'SERVICE',
  OTHER: 'OTHER',
}

export const COMPLAINT_CATEGORY_LABELS = {
  [COMPLAINT_CATEGORY.PAYMENT]: 'Thanh toán & Hoàn tiền',
  [COMPLAINT_CATEGORY.SERVICE]: 'Chất lượng dịch vụ',
  [COMPLAINT_CATEGORY.OTHER]: 'Hỗ trợ khác',
}

export const TERMINATION_REASON_LABELS = {
  CUSTOMER_CANCEL: 'Khách hàng hủy đơn',
  PROVIDER_REJECT: 'Nhà cung cấp từ chối',
  PROVIDER_CANCEL: 'Nhà cung cấp hủy đơn',
  PROVIDER_UNABLE_TO_CONTINUE: 'Nhà cung cấp không thể tiếp tục',
  PROVIDER_RESPONSE_TIMEOUT: 'Quá hạn phản hồi của nhà cung cấp',
  DEPOSIT_TIMEOUT: 'Quá hạn thanh toán đặt cọc',
  SYSTEM_CANCEL: 'Hủy bởi quản trị hệ thống',
}

export const ACTOR_TYPE_LABELS = {
  CUSTOMER: 'Khách hàng',
  PROVIDER: 'Nhà cung cấp',
  ADMIN: 'Quản trị viên',
  SYSTEM: 'Hệ thống',
}

export const BOOKING_STATUS_CONFIG = {
  [BOOKING_STATUS.PENDING_PROVIDER]: {
    label: 'Chờ xác nhận',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    iconName: 'Clock',
    spin: false,
  },
  [BOOKING_STATUS.PENDING_DEPOSIT]: {
    label: 'Chờ đặt cọc',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    iconName: 'Clock',
    spin: false,
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: 'Đã xác nhận',
    textClass: 'text-sky-700',
    iconClass: 'text-sky-600',
    iconName: 'CalendarCheck',
    spin: false,
  },
  [BOOKING_STATUS.IN_PROGRESS]: {
    label: 'Đang thực hiện',
    textClass: 'text-primary-600',
    iconClass: 'text-primary-600',
    iconName: 'Loader2',
    spin: true,
  },
  [BOOKING_STATUS.COMPLETED]: {
    label: 'Hoàn thành',
    textClass: 'text-emerald-700',
    iconClass: 'text-emerald-600',
    iconName: 'CheckCircle2',
    spin: false,
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: 'Đã hủy',
    textClass: 'text-neutral-500',
    iconClass: 'text-neutral-500',
    iconName: 'Ban',
    spin: false,
  },
  [BOOKING_STATUS.REJECTED]: {
    label: 'Từ chối',
    textClass: 'text-red-600',
    iconClass: 'text-red-600',
    iconName: 'XCircle',
    spin: false,
  },
  [BOOKING_STATUS.EXPIRED]: {
    label: 'Hết hạn',
    textClass: 'text-neutral-500',
    iconClass: 'text-neutral-500',
    iconName: 'TimerOff',
    spin: false,
  },
}

export const SERVICE_STATUS_CONFIG = {
  [SERVICE_STATUS.DRAFT]: {
    label: 'Bản nháp',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    iconName: 'FileEdit',
    spin: false,
  },
  [SERVICE_STATUS.PUBLISHED]: {
    label: 'Đang công khai',
    textClass: 'text-emerald-700',
    iconClass: 'text-emerald-600',
    iconName: 'CheckCircle2',
    spin: false,
  },
  [SERVICE_STATUS.ARCHIVED]: {
    label: 'Đã lưu trữ',
    textClass: 'text-neutral-500',
    iconClass: 'text-neutral-500',
    iconName: 'Archive',
    spin: false,
  },
}

export const AVAILABILITY_STATE_CONFIG = {
  [AVAILABILITY_STATE.AVAILABLE]: {
    label: 'Mở nhận việc',
    textClass: 'text-emerald-700',
    iconClass: 'text-emerald-600',
    iconName: 'CheckCircle2',
    spin: false,
  },
  [AVAILABILITY_STATE.BLOCKED]: {
    label: 'Khóa lịch',
    textClass: 'text-red-600',
    iconClass: 'text-red-600',
    iconName: 'Lock',
    spin: false,
  },
}

export const BANK_VERIFICATION_CONFIG = {
  [BANK_VERIFICATION_STATUS.NOT_PROVIDED]: {
    label: 'Chưa khai báo',
    textClass: 'text-neutral-500',
    iconClass: 'text-neutral-500',
    iconName: 'MinusCircle',
    spin: false,
  },
  [BANK_VERIFICATION_STATUS.PENDING]: {
    label: 'Chờ xác minh',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    iconName: 'Clock',
    spin: false,
  },
  [BANK_VERIFICATION_STATUS.VERIFIED]: {
    label: 'Đã xác minh',
    textClass: 'text-emerald-700',
    iconClass: 'text-emerald-600',
    iconName: 'ShieldCheck',
    spin: false,
  },
  [BANK_VERIFICATION_STATUS.REJECTED]: {
    label: 'Bị từ chối',
    textClass: 'text-red-600',
    iconClass: 'text-red-600',
    iconName: 'XCircle',
    spin: false,
  },
}

export const SETTLEMENT_STATUS_CONFIG = {
  [SETTLEMENT_STATUS.DRAFT]: {
    label: 'Chờ đối soát',
    textClass: 'text-neutral-600',
    iconClass: 'text-neutral-500',
    iconName: 'Clock',
    spin: false,
  },
  [SETTLEMENT_STATUS.ON_HOLD]: {
    label: 'Tạm giữ đối soát',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    iconName: 'PauseCircle',
    spin: false,
  },
  [SETTLEMENT_STATUS.FINALIZED]: {
    label: 'Đã chốt đối soát',
    textClass: 'text-emerald-700',
    iconClass: 'text-emerald-600',
    iconName: 'ShieldCheck',
    spin: false,
  },
}

export const COMPLAINT_STATUS_CONFIG = {
  [COMPLAINT_STATUS.OPEN]: {
    label: 'Mới tiếp nhận',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    iconName: 'Clock',
    spin: false,
  },
  [COMPLAINT_STATUS.IN_REVIEW]: {
    label: 'Đang xử lý',
    textClass: 'text-sky-700',
    iconClass: 'text-sky-600',
    iconName: 'MessageSquare',
    spin: false,
  },
  [COMPLAINT_STATUS.RESOLVED]: {
    label: 'Đã giải quyết',
    textClass: 'text-emerald-700',
    iconClass: 'text-emerald-600',
    iconName: 'CheckCircle2',
    spin: false,
  },
  [COMPLAINT_STATUS.REJECTED]: {
    label: 'Đã từ chối',
    textClass: 'text-red-600',
    iconClass: 'text-red-600',
    iconName: 'XCircle',
    spin: false,
  },
}

export const PAYMENT_STATUS_CONFIG = {
  CREATED: {
    label: 'Khởi tạo',
    textClass: 'text-neutral-600',
    iconClass: 'text-neutral-500',
    iconName: 'Clock',
    spin: false,
  },
  PENDING: {
    label: 'Đang xử lý',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    iconName: 'Clock',
    spin: false,
  },
  UNKNOWN: {
    label: 'Chờ đối soát cổng',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    iconName: 'AlertTriangle',
    spin: false,
  },
  SUCCEEDED: {
    label: 'Thành công',
    textClass: 'text-emerald-700',
    iconClass: 'text-emerald-600',
    iconName: 'CheckCircle2',
    spin: false,
  },
  FAILED: {
    label: 'Thất bại',
    textClass: 'text-red-600',
    iconClass: 'text-red-600',
    iconName: 'XCircle',
    spin: false,
  },
  EXPIRED: {
    label: 'Hết hạn',
    textClass: 'text-neutral-500',
    iconClass: 'text-neutral-500',
    iconName: 'TimerOff',
    spin: false,
  },
}

export const ALL_STATUS_CONFIG = {
  ...BOOKING_STATUS_CONFIG,
  ...SERVICE_STATUS_CONFIG,
  ...AVAILABILITY_STATE_CONFIG,
  ...BANK_VERIFICATION_CONFIG,
}
