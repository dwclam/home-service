import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm focus-visible:ring-2 focus-visible:ring-primary-500/25',
  secondary:
    'bg-white text-ink border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 shadow-xs focus-visible:ring-2 focus-visible:ring-neutral-200',
  ghost:
    'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-ink active:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-neutral-200',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm focus-visible:ring-2 focus-visible:ring-red-500/25',
  link:
    'bg-transparent text-primary-500 hover:text-primary-600 underline-offset-4 hover:underline p-0 h-auto shadow-none focus-visible:ring-0',
}

const SIZES = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-[14px] gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

const SPINNER_SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export const Button = forwardRef(
  (
    {
      type = 'button',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      fullWidth = false,
      leftIcon = null,
      rightIcon = null,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isLink = variant === 'link'
    const variantStyles = VARIANTS[variant] || VARIANTS.primary
    const sizeStyles = isLink ? '' : SIZES[size] || SIZES.md
    const spinnerSize = SPINNER_SIZES[size] || SPINNER_SIZES.md

    const baseStyles =
      'inline-flex items-center justify-center font-sans font-medium rounded-md transition-colors duration-150 select-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

    const classes = [
      baseStyles,
      variantStyles,
      sizeStyles,
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ')

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={classes}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={`${spinnerSize} animate-spin shrink-0`} />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
        )}

        {children && <span>{children}</span>}

        {!isLoading && rightIcon && (
          <span className="shrink-0 flex items-center">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
