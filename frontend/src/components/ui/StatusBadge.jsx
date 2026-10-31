import {
  Clock,
  CalendarCheck,
  Loader2,
  CheckCircle2,
  Ban,
  XCircle,
  TimerOff,
  FileEdit,
  Archive,
  Lock,
  MinusCircle,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { ALL_STATUS_CONFIG } from '../../constants/status'

const ICON_MAP = {
  Clock,
  CalendarCheck,
  Loader2,
  CheckCircle2,
  Ban,
  XCircle,
  TimerOff,
  FileEdit,
  Archive,
  Lock,
  MinusCircle,
  ShieldCheck,
  Info,
}

/**
 * Badge trạng thái dùng chung toàn hệ thống.
 * Tuân thủ nghiêm ngặt FE-guideline-lite:
 * - KHÔNG nền (no background), KHÔNG viền (no border).
 * - Chỉ hiển thị icon Lucide (tông -600) + chữ in đậm semibold (tông -700).
 * - Chỉ trạng thái "Đang thực hiện" (IN_PROGRESS) được xoay icon (animate-spin).
 */
export const StatusBadge = ({
  status,
  configMap = ALL_STATUS_CONFIG,
  customLabel = '',
  className = '',
}) => {
  const item = configMap?.[status] || ALL_STATUS_CONFIG[status] || {
    label: customLabel || status || 'Không xác định',
    textClass: 'text-neutral-700',
    iconClass: 'text-neutral-500',
    iconName: 'Info',
    spin: false,
  }

  const IconComponent = ICON_MAP[item.iconName] || Info
  const labelText = customLabel || item.label

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans text-xs font-semibold leading-none select-none ${item.textClass} ${className}`.trim()}
    >
      <IconComponent
        className={`w-3.5 h-3.5 shrink-0 ${item.iconClass} ${
          item.spin ? 'animate-spin' : ''
        }`.trim()}
        aria-hidden="true"
      />
      <span>{labelText}</span>
    </span>
  )
}

export default StatusBadge
