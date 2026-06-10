const cache = new Map<string, string>()

export async function loadCodeThemeCss(id: string): Promise<string | undefined> {
  if (cache.has(id)) {
    return cache.get(id)
  }

  try {
    const response = await fetch(`/md-themes/code-theme/${id}.css`)
    if (!response.ok) {
      return undefined
    }

    const css = await response.text()
    cache.set(id, css)
    return css
  }
  catch {
    return undefined
  }
}
