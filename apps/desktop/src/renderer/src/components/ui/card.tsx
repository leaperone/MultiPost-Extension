import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

/** 扁平卡片:固定 border、零阴影(The Flat-By-Default Rule);禁止嵌套 Card */
export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-background', className)} {...props} />
  )
)
Card.displayName = 'Card'

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('flex flex-col gap-1 p-4 pb-0', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('text-base font-semibold text-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('p-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('flex items-center gap-2 p-4 pt-0', className)} {...props} />
}
