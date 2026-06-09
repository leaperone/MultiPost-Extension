'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { Lock } from 'lucide-react'

const HEADER_HEIGHT = 52

export interface SafariProps extends HTMLAttributes<HTMLDivElement> {
  url?: string
  children?: ReactNode
}

export function Safari({ children, url, className, style, ...props }: SafariProps) {
  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-xl border border-neutral-300/60 dark:border-neutral-600/60 ${className ?? ''}`}
      style={style}
      {...props}
    >
      <div
        className="relative flex w-full shrink-0 items-center justify-between rounded-t-xl bg-[#fcfcfc] px-5 dark:bg-[#1f2430]"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex shrink-0 items-center gap-2">
          <div className="size-3 rounded-full bg-[#e6e8eb] dark:bg-[#282e3b]" />
          <div className="size-3 rounded-full bg-[#e6e8eb] dark:bg-[#282e3b]" />
          <div className="size-3 rounded-full bg-[#e6e8eb] dark:bg-[#282e3b]" />
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-32">
          <div className="pointer-events-auto flex w-full max-w-md items-center justify-center gap-1.5 rounded-md bg-[#e6e8eb] px-3 py-1.5 dark:bg-[#282e3b]">
            <Lock className="size-3 shrink-0 text-neutral-400" strokeWidth={2} />
            <span className="truncate text-xs text-neutral-400">{url}</span>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#262626]">
        {children && <div className="size-full">{children}</div>}
      </div>
    </div>
  )
}
