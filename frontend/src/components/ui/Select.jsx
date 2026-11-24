import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export const Select = forwardRef(
  (
    {
      error = false,
      disabled = false,
      className = '',
      id,
      children,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error)

    const stateClasses = hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'

    const selectClasses = [
      'w-full h-10 pl-3 pr-9 text-[14px] font-sans text-ink bg-white rounded-md border outline-none appearance-none cursor-pointer',
      'transition-colors duration-150',
      'disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed',
      stateClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ')

    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : 'false'}
          className={selectClasses}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="w-4 h-4 text-neutral-400 pointer-events-none absolute right-3 shrink-0"
          aria-hidden="true"
        />
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
