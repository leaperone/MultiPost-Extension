let katexCssCache: string | null = null

export async function loadKatexCss() {
  if (katexCssCache) {
    return katexCssCache
  }

  const response = await fetch('/md-themes/katex.min.css')
  if (!response.ok) return ''
  katexCssCache = await response.text()
  return katexCssCache
}
