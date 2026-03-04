import { addToast } from '@heroui/react'
import { copyHtml, copyImage as copyImageToClipboard } from './clipboard'
import { useMdDraftStore } from '@/store/md-draft.store'

// ===== Import =====

export function triggerImportDialog(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = false
    input.accept = 'text/markdown,.md'

    let resolved = false

    function cleanup() {
      input.onchange = null
      window.removeEventListener('focus', handleWindowFocus)
    }

    function handleWindowFocus() {
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve([])
        }
      }, 300)
    }

    input.onchange = (e) => {
      if (resolved) return
      resolved = true
      cleanup()
      const target = e.target as HTMLInputElement
      resolve(target.files ? Array.from(target.files) : [])
    }

    window.addEventListener('focus', handleWindowFocus, { once: true })
    input.click()
  })
}

export async function handleImportFiles() {
  const files = await triggerImportDialog()
  if (!files.length) return

  const file = files[0]
  try {
    const content = await file.text()
    const { setContent, setTitle, activeDraftId, createDraft } = useMdDraftStore.getState()

    // Create a new draft if no active draft
    if (!activeDraftId) {
      await createDraft()
    }

    const name = file.name.replace(/\.md$/i, '')
    setTitle(name)
    setContent(content)
  }
  catch (err) {
    console.error('导入文件失败:', err)
    addToast({ title: '导入文件失败', hideIcon: true })
  }
}

// ===== Export Markdown =====

export function exportMarkdown(content: string, fileName?: string) {
  if (!content.trim()) {
    addToast({ title: '没有可导出的内容', hideIcon: true })
    return
  }

  const { currentTitle } = useMdDraftStore.getState()
  const exportFileName = fileName ?? (currentTitle ? `${currentTitle}.md` : 'untitled.md')

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName
  a.click()
  URL.revokeObjectURL(url)
  addToast({ title: '已导出 Markdown 文件', hideIcon: true })
}

// ===== Copy Platform =====

interface CopyPlatformOptions {
  platform: string
  getHtml: () => Promise<string>
}

export async function copyPlatform({ platform, getHtml }: CopyPlatformOptions) {
  try {
    const html = await getHtml()
    if (!html.trim()) {
      addToast({ title: '没有可复制的内容', hideIcon: true })
      return
    }
    const success = await copyHtml(html)
    if (success) {
      const labels: Record<string, string> = {
        wechat: '已复制为微信格式',
        zhihu: '已复制为知乎格式',
        juejin: '已复制为掘金格式',
        html: '已复制 HTML',
      }
      addToast({ title: labels[platform] ?? '已复制', hideIcon: true })
    }
    else {
      addToast({ title: '复制失败', hideIcon: true })
    }
  }
  catch {
    addToast({ title: '渲染失败', hideIcon: true })
  }
}

// ===== Export Image =====

function getPreviewIframe() {
  try {
    const iframe = document.querySelector('#mp-preview-iframe') as HTMLIFrameElement | null
    if (!iframe?.contentDocument?.body) return null
    const content = iframe.contentDocument.getElementById('mp-md')
    if (!content) return null
    return { iframe, content }
  }
  catch {
    return null
  }
}

export async function exportImage() {
  const preview = getPreviewIframe()
  if (!preview) {
    addToast({ title: '预览区域尚未就绪', hideIcon: true })
    return
  }

  try {
    const { snapdom } = await import('@zumer/snapdom')
    const snapshot = await snapdom(preview.content)
    await snapshot.download({ filename: 'multipost-md.jpg', quality: 0.99 })
    addToast({ title: '已导出图片', hideIcon: true })
  }
  catch (err) {
    console.error(err)
    addToast({ title: '导出图片失败', hideIcon: true })
  }
}

export async function copyImage() {
  const preview = getPreviewIframe()
  if (!preview) {
    addToast({ title: '预览区域尚未就绪', hideIcon: true })
    return
  }

  try {
    const { snapdom } = await import('@zumer/snapdom')
    const snapshot = await snapdom(preview.content)
    const blob = await snapshot.toBlob({ type: 'png' })
    await copyImageToClipboard(blob)
    addToast({ title: '已复制图片到剪贴板', hideIcon: true })
  }
  catch (err) {
    console.error(err)
    addToast({ title: '复制图片失败', hideIcon: true })
  }
}

// ===== Export PDF =====

export async function exportPdf() {
  const preview = getPreviewIframe()
  if (!preview) {
    addToast({ title: '预览区域尚未就绪', hideIcon: true })
    return
  }

  try {
    const { snapdom } = await import('@zumer/snapdom')
    const { default: JsPDF } = await import('jspdf')

    const snapshot = await snapdom(preview.content)
    const canvas = await snapshot.toCanvas({ scale: 2 })

    if (canvas.width === 0 || canvas.height === 0) {
      addToast({ title: '没有可导出的内容', hideIcon: true })
      return
    }

    const a4Width = 210
    const a4Height = 297
    const padding = 8

    const contentWidth = a4Width - padding * 2
    const contentHeight = a4Height - padding * 3

    const scale = contentWidth / canvas.width
    const canvasPageHeight = contentHeight / scale

    const bgColor = getComputedStyle(preview.content).backgroundColor || '#ffffff'

    const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const totalPages = Math.ceil(canvas.height / canvasPageHeight)

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage()

      pdf.setFillColor(bgColor)
      pdf.rect(0, 0, a4Width, a4Height, 'F')

      const sourceY = i * canvasPageHeight
      const sourceHeight = Math.min(canvasPageHeight, canvas.height - sourceY)
      const targetHeight = sourceHeight * scale

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sourceHeight

      const ctx = pageCanvas.getContext('2d')
      if (!ctx) continue

      ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92)
      pdf.addImage(pageImgData, 'JPEG', padding, padding * 1.5, contentWidth, targetHeight)
    }

    pdf.save('multipost-md.pdf')
    addToast({ title: '已导出 PDF', hideIcon: true })
  }
  catch (err) {
    console.error(err)
    addToast({ title: '导出 PDF 失败', hideIcon: true })
  }
}

// ===== Print =====

export function printPreview() {
  const preview = getPreviewIframe()
  if (!preview) {
    addToast({ title: '预览区域尚未就绪', hideIcon: true })
    return
  }

  try {
    preview.iframe.contentWindow?.print()
  }
  catch {
    addToast({ title: '打印失败', hideIcon: true })
  }
}
