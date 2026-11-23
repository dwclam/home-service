const TONE_STYLES = {
  success: { text: 'text-emerald-700', icon: 'text-emerald-600' },
  warning: { text: 'text-amber-700', icon: 'text-amber-600' },
  info: { text: 'text-blue-700', icon: 'text-blue-600' },
  danger: { text: 'text-red-600', icon: 'text-red-600' },
  neutral: { text: 'text-neutral-500', icon: 'text-neutral-500' },
  primary: { text: 'text-primary-600', icon: 'text-primary-600' },
}

export const StatusText = ({
  icon: Icon,
  label,
  tone = 'neutral',
  spin = false,
  className = '',
}) => {
  const style = TONE_STYLES[tone] || TONE_STYLES.neutral

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${style.text} ${className}`.trim()}
    >
      {Icon && (
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${style.icon} ${spin ? 'animate-spin' : ''}`.trim()}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  )
}

export default StatusText
