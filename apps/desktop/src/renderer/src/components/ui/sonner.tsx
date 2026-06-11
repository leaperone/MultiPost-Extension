import { useTheme } from 'next-themes'
import { Toaster as SonnerToaster, toast } from 'sonner'

/**
 * 全局 Toast。样式遵循 DESIGN.md:纸面底、hairline 边、浮层阴影;
 * 成功不染绿(The One Red Rule),仅错误允许警示红。
 */
export function Toaster(): React.ReactElement {
  const { resolvedTheme } = useTheme()
  return (
    <SonnerToaster
      position="bottom-right"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      toastOptions={{
        classNames: {
          toast:
            '!bg-background !text-foreground !border !border-border !rounded-lg !shadow-[0_4px_16px_rgb(0_0_0/0.08)]',
          title: '!text-sm !font-medium !text-foreground',
          description: '!text-xs !text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground !rounded-md',
          cancelButton: '!bg-muted !text-foreground !rounded-md',
          error: '!text-destructive',
          icon: '!text-foreground'
        }
      }}
    />
  )
}

export { toast }
