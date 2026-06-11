import { forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'
import { FieldWrapper } from './input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
  wrapperClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, description, error, wrapperClassName, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const control = (
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed text-foreground transition-colors duration-150 ease-out placeholder:text-muted-foreground focus:border-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
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
Textarea.displayName = 'Textarea'
