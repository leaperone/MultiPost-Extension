import type { ThemeName } from 'beautiful-mermaid'
import type { Element } from 'hast'
import { renderMermaid, THEMES } from 'beautiful-mermaid'
import { createSvgRendererPlugin } from './rehype-svg-renderer'

export interface RehypeMermaidOptions {
  theme?: string
}

function isValidTheme(theme: string): theme is ThemeName {
  return theme !== '' && theme in THEMES
}

function adjustSvgStyle(svgNode: Element): void {
  const props = svgNode.properties || {}
  const existingStyle = typeof props.style === 'string' ? props.style : ''

  delete props.width

  props.style = existingStyle
    ? `${existingStyle};min-width:100%;max-width:unset;`
    : 'min-width:100%'

  svgNode.properties = props
}

const rehypeMermaid = createSvgRendererPlugin<RehypeMermaidOptions>({
  languageId: 'mermaid',
  figureClassName: 'figure-mermaid',
  render: async (code, options) => {
    const themeColors = options.theme && isValidTheme(options.theme)
      ? THEMES[options.theme]
      : undefined
    return renderMermaid(code, themeColors)
  },
  adjustSvgStyle,
})

export default rehypeMermaid
