'use client'

import { useEffect, useRef } from 'react'
import { useMdPreviewStore, PREVIEW_WIDTH_MOBILE } from '@/store/md-preview.store'
import MarkdownRender from './MarkdownRender'
import PreviewSidebar from './PreviewSidebar'

const MOBILE_BREAKPOINT = 600

export default function MarkdownPreviewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const setPreviewWidth = useMdPreviewStore(s => s.setPreviewWidth)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const width = entry?.contentRect.width
      if (!width) return

      const { userPreferredWidth, previewWidth } = useMdPreviewStore.getState()
      const targetWidth = width < MOBILE_BREAKPOINT
        ? PREVIEW_WIDTH_MOBILE
        : userPreferredWidth

      if (targetWidth !== previewWidth) {
        setPreviewWidth(targetWidth)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [setPreviewWidth])

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/30">
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center p-4"
      >
        <MarkdownRender />
      </div>
      <PreviewSidebar />
    </div>
  )
}
