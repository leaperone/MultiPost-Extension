const cache = new Map<string, string>()

let resetCssPromise: Promise<string> | null = null

function loadResetCss(): Promise<string> {
  return resetCssPromise ??= fetch('/md-themes/markdown-style/reset.css').then(r => {
    if (!r.ok) return ''
    return r.text()
  })
}

export async function loadMarkdownStyleCss(id: string): Promise<string | undefined> {
  if (cache.has(id)) {
    return cache.get(id)
  }

  try {
    const [resetCss, themeCss] = await Promise.all([
      loadResetCss(),
      fetch(`/md-themes/markdown-style/${id}.css`).then(r => {
        if (!r.ok) return undefined
        return r.text()
      }),
    ])

    if (!themeCss) {
      return undefined
    }

    const css = resetCss + themeCss
    cache.set(id, css)
    return css
  }
  catch {
    return undefined
  }
}
