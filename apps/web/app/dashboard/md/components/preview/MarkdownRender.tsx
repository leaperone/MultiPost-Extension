'use client'

import { useCallback, useEffect, useRef } from 'react'
import morphdom from 'morphdom'
import { iframeShellHtml } from '@/lib/markdown-engine/iframe-shell'
import { renderMarkdown } from '@/lib/markdown-engine/worker-client'
import { useMdEditorStore } from '@/store/md-editor.store'
import { useMdDraftStore } from '@/store/md-draft.store'
import { PREVIEW_WIDTH_MOBILE, useMdPreviewStore } from '@/store/md-preview.store'
import { Phone } from './IPhoneMockup'
import { Safari } from './SafariMockup'

const RENDER_DEBOUNCE_MS = 100

export default function MarkdownRender() {
  const content = useMdDraftStore(s => s.currentContent)
  const enableScrollSync = useMdEditorStore(s => s.enableScrollSync)
  const enableFootnoteLinks = useMdEditorStore(s => s.enableFootnoteLinks)
  const openLinksInNewWindow = useMdEditorStore(s => s.openLinksInNewWindow)
  const previewWidth = useMdPreviewStore(s => s.previewWidth)
  const markdownStyle = useMdPreviewStore(s => s.markdownStyle)
  const codeTheme = useMdPreviewStore(s => s.codeTheme)
  const mermaidTheme = useMdPreviewStore(s => s.mermaidTheme)
  const customCss = useMdPreviewStore(s => s.customCss)
  const renderedHtml = useMdPreviewStore(s => s.getRenderedHtml('html'))
  const setRenderedHtml = useMdPreviewStore(s => s.setRenderedHtml)
  const clearRenderedHtmlCache = useMdPreviewStore(s => s.clearRenderedHtmlCache)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const iframeReadyRef = useRef(false)
  const pendingHtmlRef = useRef<string | null>(null)
  const canceledRef = useRef(false)
  const renderedHtmlRef = useRef(renderedHtml)

  // Scroll sync
  const scrollRatio = useMdEditorStore(s => s.scrollRatio)
  const scrollSource = useMdEditorStore(s => s.scrollSource)

  useEffect(() => {
    renderedHtmlRef.current = renderedHtml
  }, [renderedHtml])

  useEffect(() => {
    if (!enableScrollSync || scrollSource !== 'editor') return
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    const doc = iframe.contentDocument
    if (!doc) return
    const maxScroll = doc.documentElement.scrollHeight - doc.documentElement.clientHeight
    if (maxScroll > 0) {
      iframe.contentWindow.scrollTo({ top: scrollRatio * maxScroll, behavior: 'auto' })
    }
  }, [scrollRatio, scrollSource, enableScrollSync])

  const updateIframeContent = useCallback((html: string) => {
    const iframe = iframeRef.current
    const body = iframe?.contentDocument?.body
    if (!body) {
      pendingHtmlRef.current = html
      return
    }
    const wrapper = document.createElement('body')
    wrapper.innerHTML = html
    morphdom(body, wrapper, {
      childrenOnly: true,
      onBeforeElUpdated(fromEl, toEl) {
        if (fromEl.isEqualNode(toEl)) return false
        return true
      },
    })
  }, [])

  const enableScrollSyncRef = useRef(enableScrollSync)
  useEffect(() => {
    enableScrollSyncRef.current = enableScrollSync
  }, [enableScrollSync])

  const onIframeLoad = useCallback(() => {
    iframeReadyRef.current = true
    const htmlToRender = pendingHtmlRef.current ?? renderedHtmlRef.current
    if (htmlToRender) {
      updateIframeContent(htmlToRender)
      pendingHtmlRef.current = null
    }

    // Intercept link clicks inside iframe
    const iframeDoc = iframeRef.current?.contentDocument
    if (iframeDoc) {
      iframeDoc.addEventListener('click', (e: MouseEvent) => {
        const link = (e.target as HTMLElement).closest('a')
        if (!link) return
        const href = link.getAttribute('href')
        if (!href) return
        e.preventDefault()
        if (href.startsWith('#')) {
          const el = iframeDoc.getElementById(href.slice(1))
          el?.scrollIntoView({ behavior: 'smooth' })
        }
        else {
          window.open(href, '_blank', 'noopener,noreferrer')
        }
      })

      // Scroll sync: preview → editor (uses ref to avoid stale closure)
      iframeDoc.addEventListener('scroll', () => {
        if (!enableScrollSyncRef.current) return
        const doc = iframeRef.current?.contentDocument
        if (!doc) return
        const maxScroll = doc.documentElement.scrollHeight - doc.documentElement.clientHeight
        if (maxScroll > 0) {
          const ratio = doc.documentElement.scrollTop / maxScroll
          useMdEditorStore.getState().setScrollFromPreview(ratio)
        }
      })
    }
  }, [updateIframeContent])

  // Apply rendered HTML to iframe
  useEffect(() => {
    if (!renderedHtml) return
    if (iframeReadyRef.current) {
      updateIframeContent(renderedHtml)
    }
    else {
      pendingHtmlRef.current = renderedHtml
    }
  }, [renderedHtml, updateIframeContent])

  // Debounced render scheduling
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRender = useCallback(
    (
      nextContent: string,
      styleId: string,
      themeId: string,
      mermaidThemeId: string,
      customCssValue: string,
      enableRefLinks: boolean,
      openNewWin: boolean,
    ) => {
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
      renderTimerRef.current = setTimeout(async () => {
        try {
          const { result } = await renderMarkdown({
            markdown: nextContent,
            markdownStyle: styleId,
            codeTheme: themeId,
            mermaidTheme: mermaidThemeId,
            customCss: customCssValue,
            enableFootnoteLinks: enableRefLinks,
            openLinksInNewWindow: openNewWin,
            platform: 'html',
          })
          if (!canceledRef.current) {
            setRenderedHtml('html', result)
          }
        }
        catch (error) {
          if (!canceledRef.current) {
            console.error('Markdown render error:', error)
          }
        }
      }, RENDER_DEBOUNCE_MS)
    },
    [setRenderedHtml],
  )

  useEffect(() => {
    clearRenderedHtmlCache()
    canceledRef.current = false
    scheduleRender(content, markdownStyle, codeTheme, mermaidTheme, customCss, enableFootnoteLinks, openLinksInNewWindow)
    return () => {
      canceledRef.current = true
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
    }
  }, [content, markdownStyle, codeTheme, mermaidTheme, customCss, enableFootnoteLinks, openLinksInNewWindow, scheduleRender, clearRenderedHtmlCache])

  const isMobile = previewWidth === PREVIEW_WIDTH_MOBILE

  const iframeContent = (
    <iframe
      ref={iframeRef}
      id="mp-preview-iframe"
      title="Markdown Preview"
      className="h-full w-full border-0"
      sandbox="allow-same-origin allow-modals"
      srcDoc={iframeShellHtml}
      onLoad={onIframeLoad}
    />
  )

  if (isMobile) {
    return <Phone>{iframeContent}</Phone>
  }

  return (
    <Safari
      className="h-full w-full"
      style={{ maxWidth: previewWidth }}
      url="multipost.app/md"
    >
      {iframeContent}
    </Safari>
  )
}
