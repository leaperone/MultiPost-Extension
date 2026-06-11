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
          'min-h-20 w-full rounded-lg border-0 bg-foreground/[0.05] px-3 py-2 text-sm leading-relaxed text-foreground transition-[background-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground focus:bg-foreground/[0.07] focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'ring-2 ring-destructive/40',
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
