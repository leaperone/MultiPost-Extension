import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode
}

export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, id, ...props }, ref) => {
  const autoId = useId()
  const boxId = id ?? autoId
  const box = (
    <CheckboxPrimitive.Root
      ref={ref}
      id={boxId}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border bg-background transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.checked === 'indeterminate' ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
  if (!label) return box
  return (
    <div className="flex items-center gap-2">
      {box}
      <label htmlFor={boxId} className="cursor-pointer select-none text-sm text-foreground">
        {label}
      </label>
    </div>
  )
})
Checkbox.displayName = 'Checkbox'
