import { BookOpen, ExternalLink, Github, LifeBuoy, Mail, type LucideIcon } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'

export interface ContactLink {
  label: string
  description: string
  url: string
  icon: LucideIcon
}

/**
 * Single source of truth for "contact us / feedback" entries, shared by the
 * sidebar feedback dialog and the home page contact card. Material mirrors the
 * browser extension's contact links.
 *
 * TODO(user): 确认 GitHub Issues 应指向的仓库（暂用公开的 Extension 仓库）。
 */
export const CONTACT_LINKS: ContactLink[] = [
  {
    label: '联系我们',
    description: '官方联系方式与支持渠道',
    url: 'https://docs.multipost.app/docs/user-guide/contact-us',
    icon: LifeBuoy
  },
  {
    label: '支持邮箱',
    description: 'support@leaper.one',
    url: 'mailto:support@leaper.one',
    icon: Mail
  },
  {
    label: '帮助文档',
    description: '使用教程与常见问题',
    url: 'https://docs.multipost.app',
    icon: BookOpen
  },
  {
    label: 'GitHub Issues',
    description: '反馈 bug 或提交新平台需求',
    url: 'https://github.com/leaperone/MultiPost-Extension/issues',
    icon: Github
  }
]

/**
 * The main window's window-open handler routes every window.open through
 * shell.openExternal (http/https/mailto/tel allow-listed), so this also opens
 * the mailto: support link in the system mail client.
 */
export function openContactLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function FeedbackDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>联系我们 / 反馈</DialogTitle>
          <DialogDescription>
            遇到问题，或想让我们支持新平台？通过下面任一方式联系我们。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {CONTACT_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => {
                openContactLink(link.url)
                onOpenChange(false)
              }}
              className="group flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-foreground/[0.04]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-foreground">
                <link.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{link.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {link.description}
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
