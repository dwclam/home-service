import { Inbox } from 'lucide-react'

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Chưa có dữ liệu',
  action = null,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 font-sans ${className}`.trim()}
    >
      <div className="w-10 h-10 rounded-md bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-medium text-neutral-600 mb-4">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  )
}

export default EmptyState
