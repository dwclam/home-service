import { Inbox } from 'lucide-react'

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Chưa có dữ liệu',
  description = 'Hiện chưa có bản ghi nào phù hợp với điều kiện hiển thị.',
  action = null,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 font-sans ${className}`.trim()}
    >
      <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-[17px] font-semibold text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 max-w-md mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}

export default EmptyState
