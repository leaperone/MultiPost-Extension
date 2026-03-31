import type { Platform } from './adapters'

export interface RenderOptions {
  markdown: string
  markdownStyle?: string
  codeTheme?: string
  mermaidTheme?: string
  customCss?: string
  enableFootnoteLinks?: boolean
  openLinksInNewWindow?: boolean
  platform?: Platform
  footnoteLabel?: string
  referenceTitle?: string
}

export interface RenderResult {
  result: string
}

export async function render(input: RenderOptions): Promise<RenderResult> {
  const { render: doRender } = await import('./html')
  const result = await doRender(input)
  return { result }
}

export type { Platform } from './adapters'
