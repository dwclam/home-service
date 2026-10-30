import React from 'react'
import { AlertCircle } from 'lucide-react'

export const FormField = ({
  label,
  htmlFor,
  required = false,
  error = '',
  hint = '',
  className = '',
  children,
}) => {
  const hasError = Boolean(error)
  const errorId = htmlFor ? `${htmlFor}-error` : undefined

  return (
    <div className={`w-full flex flex-col ${className}`.trim()}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-ink font-sans mb-1.5 select-none"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1 font-semibold" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {React.isValidElement(children)
        ? React.cloneElement(children, {
            id: children.props.id || htmlFor,
            error: children.props.error ?? hasError,
            'aria-invalid': hasError ? 'true' : undefined,
            'aria-describedby':
              hasError && errorId
                ? errorId
                : children.props['aria-describedby'],
          })
        : children}

      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-red-500 font-sans mt-1.5 flex items-center gap-1.5 leading-tight"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {!hasError && hint && (
        <p className="text-xs text-neutral-500 font-sans mt-1.5 leading-tight">
          {hint}
        </p>
      )}
    </div>
  )
}

export default FormField
