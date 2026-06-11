import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  /** 包裹的子元素必须能接收 ref(原生元素或 forwardRef 组件) */
  asChild?: boolean
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  asChild = true
}: TooltipProps): React.ReactElement {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild={asChild}>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-50 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-[0_4px_16px_rgb(0_0_0/0.08)]',
              className
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
