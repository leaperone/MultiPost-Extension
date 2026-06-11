import * as ProgressPrimitive from '@radix-ui/react-progress'
import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Progress = forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { value?: number }
>(({ className, value = 0, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={value}
    className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="size-full bg-primary transition-transform duration-300 ease-out"
      style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = 'Progress'
