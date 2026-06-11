import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full text-xs leading-none transition-colors duration-150 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-muted text-foreground',
        outline: 'border text-muted-foreground',
        destructive: 'border border-destructive/30 text-destructive'
      },
      size: {
        default: 'px-2.5 py-1',
        sm: 'px-2 py-0.5'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  onClose?: () => void
}

export function Badge({ className, variant, size, onClose, children, ...props }: BadgeProps): React.ReactElement {
  return (
    <span className={cn(badgeVariants({ variant, size }), onClose && 'pr-1', className)} {...props}>
      {children}
      {onClose && (
        <button
          type="button"
          aria-label="移除"
          onClick={onClose}
          className="rounded-full p-0.5 text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}
