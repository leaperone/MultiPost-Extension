import * as SwitchPrimitive from '@radix-ui/react-switch'
import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-muted transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary',
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-none ring-1 ring-border transition-transform duration-150 ease-out data-[state=checked]:translate-x-[18px] data-[state=checked]:ring-0" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'
