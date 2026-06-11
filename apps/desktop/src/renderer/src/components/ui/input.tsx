import { forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

interface FieldWrapperProps {
  label?: string
  description?: string
  error?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

/** 表单字段统一外壳:label + 控件 + 说明/错误,间距用 gap 不用 margin */
export function FieldWrapper({
  label,
  description,
  error,
  htmlFor,
  children,
  className
}: FieldWrapperProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, description, error, wrapperClassName, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const control = (
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground transition-colors duration-150 ease-out placeholder:text-muted-foreground focus:border-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
    )
    if (!label && !description && !error) return control
    return (
      <FieldWrapper label={label} description={description} error={error} htmlFor={inputId} className={wrapperClassName}>
        {control}
      </FieldWrapper>
    )
  }
)
Input.displayName = 'Input'
