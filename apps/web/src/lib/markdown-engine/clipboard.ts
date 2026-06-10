import * as clipboard from 'clipboard-polyfill'

/**
 * 复制纯文本到剪贴板
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await clipboard.writeText(text)
    return true
  }
  catch {
    return false
  }
}

/**
 * 复制 HTML 到剪贴板（text/plain 降级为 HTML 代码）
 */
export async function copyHtml(html: string): Promise<boolean> {
  try {
    const item = new clipboard.ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([html], { type: 'text/plain' }),
    })
    await clipboard.write([item])
    return true
  }
  catch {
    return false
  }
}

/**
 * 复制图片到剪贴板
 */
export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    const item = new clipboard.ClipboardItem({
      [blob.type]: blob,
    })
    await clipboard.write([item])
    return true
  }
  catch {
    return false
  }
}
