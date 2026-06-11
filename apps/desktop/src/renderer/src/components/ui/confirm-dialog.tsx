import { useState } from 'react'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './dialog'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 标题必须点名对象,例如「删除账号『小红书 · 主账号』?」 */
  title: string
  /** 说明后果,例如「将同时清除该账号的登录会话,需重新扫码登录。」 */
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}

/** 破坏性操作统一确认对话框:点名对象、说清后果、确认按钮才允许警示红 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  destructive = true,
  onConfirm
}: ConfirmDialogProps): React.ReactElement {
  const [isWorking, setIsWorking] = useState(false)

  const handleConfirm = async (): Promise<void> => {
    setIsWorking(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isWorking && onOpenChange(next)}>
      <DialogContent className="max-w-sm" hideClose>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isWorking}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            isLoading={isWorking}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
