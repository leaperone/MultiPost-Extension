import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SpinnerProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
  label?: string
}

export function Spinner({ className, size = 'default', label }: SpinnerProps): React.ReactElement {
  const sizeClass = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5'
  return (
    <span className={cn('inline-flex items-center gap-2 text-muted-foreground', className)} role="status">
      <Loader2 className={cn('animate-spin', sizeClass)} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}
