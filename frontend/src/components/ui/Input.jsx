import { forwardRef } from 'react'

export const Input = forwardRef(
  (
    {
      type = 'text',
      error = false,
      disabled = false,
      leftIcon = null,
      rightIcon = null,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error)

    const paddingClasses = [
      leftIcon ? 'pl-10' : 'pl-3',
      rightIcon ? 'pr-10' : 'pr-3',
    ].join(' ')

    const stateClasses = hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'

    const inputClasses = [
      'w-full h-10 text-[15px] font-sans text-ink bg-white rounded-md border outline-none',
      'transition-colors duration-150 placeholder:text-neutral-400',
      'disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed',
      paddingClasses,
      stateClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ')

    const inputElement = (
      <input
        ref={ref}
        id={id}
        type={type}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        className={inputClasses}
        {...props}
      />
    )

    if (!leftIcon && !rightIcon) {
      return inputElement
    }

    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-neutral-400 shrink-0">
            {leftIcon}
          </div>
        )}

        {inputElement}

        {rightIcon && (
          <div className="absolute right-3 flex items-center text-neutral-400 shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
