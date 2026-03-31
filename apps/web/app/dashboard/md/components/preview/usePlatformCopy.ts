import type { Platform } from '@/lib/markdown-engine/render/adapters'
import { useCallback, useState } from 'react'
import { renderMarkdown } from '@/lib/markdown-engine/worker-client'
import { useMdEditorStore } from '@/store/md-editor.store'
import { useMdDraftStore } from '@/store/md-draft.store'
import { useMdPreviewStore } from '@/store/md-preview.store'

export interface PlatformCopyResult {
  getHtml: () => Promise<string>
  isLoading: boolean
}

export function usePlatformCopy(platform: Platform): PlatformCopyResult {
  const [isLoading, setIsLoading] = useState(false)

  const content = useMdDraftStore(s => s.currentContent)
  const markdownStyle = useMdPreviewStore(s => s.markdownStyle)
  const codeTheme = useMdPreviewStore(s => s.codeTheme)
  const mermaidTheme = useMdPreviewStore(s => s.mermaidTheme)
  const customCss = useMdPreviewStore(s => s.customCss)
  const enableFootnoteLinks = useMdEditorStore(s => s.enableFootnoteLinks)
  const openLinksInNewWindow = useMdEditorStore(s => s.openLinksInNewWindow)
  const getRenderedHtml = useMdPreviewStore(s => s.getRenderedHtml)
  const setRenderedHtml = useMdPreviewStore(s => s.setRenderedHtml)

  const getHtml = useCallback(async (): Promise<string> => {
    const cached = getRenderedHtml(platform)
    if (cached) return cached

    setIsLoading(true)
    try {
      const { result } = await renderMarkdown({
        markdown: content,
        markdownStyle,
        codeTheme,
        mermaidTheme,
        customCss,
        enableFootnoteLinks,
        openLinksInNewWindow,
        platform,
      })
      setRenderedHtml(platform, result)
      return result
    }
    catch (err) {
      console.error(`[${platform}] 渲染失败:`, err)
      throw err
    }
    finally {
      setIsLoading(false)
    }
  }, [content, markdownStyle, codeTheme, mermaidTheme, customCss, enableFootnoteLinks, openLinksInNewWindow, platform, getRenderedHtml, setRenderedHtml])

  return { getHtml, isLoading }
}
