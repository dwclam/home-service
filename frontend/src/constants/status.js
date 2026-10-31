/**
 * Ánh xạ các trạng thái nghiệp vụ (BookingStatus, ServiceStatus, AvailabilityState, BankVerificationStatus)
 * tuân thủ nghiêm ngặt FE-guideline-lite:
 * - Badge KHÔNG nền, KHÔNG viền, chỉ icon Lucide + chữ semibold.
 * - Chữ dùng tông đậm (-700) để đủ tương phản trên nền trắng, icon giữ tông -600.
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

export const ALL_STATUS_CONFIG = {
  ...BOOKING_STATUS_CONFIG,
  ...SERVICE_STATUS_CONFIG,
  ...AVAILABILITY_STATE_CONFIG,
  ...BANK_VERIFICATION_CONFIG,
}
