import type { Element, Root } from 'hast'
import type { Plugin, Transformer } from 'unified'
import rehypeParse from 'rehype-parse'
import { unified } from 'unified'
import { SKIP, visit } from 'unist-util-visit'

const svgParser = unified().use(rehypeParse, { fragment: true })

export interface SvgRendererTask {
  parent: Element
  index: number
  code: string
}

export interface SvgRendererConfig<TOptions> {
  languageId: string
  figureClassName: string
  render: (code: string, options: TOptions) => Promise<string>
  extractSvg?: (raw: string) => string
  adjustSvgStyle?: (svgNode: Element) => void
}

export function isCodeBlock(node: Element, languageId: string): boolean {
  if (node.tagName !== 'pre')
    return false
  const code = node.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'code',
  )
  if (!code)
    return false
  const className = Array.isArray(code.properties?.className)
    ? code.properties.className
    : []
  return className.some(c => typeof c === 'string' && c.includes(languageId))
}

export function extractText(pre: Element): string {
  const code = pre.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'code',
  )
  if (!code)
    return ''
  return code.children
    .filter((c): c is { type: 'text', value: string } => c.type === 'text')
    .map(c => c.value)
    .join('')
}

export function parseSvg(svg: string): Element {
  const parsed = svgParser.parse(svg)
  const svgNode = parsed.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'svg',
  )
  if (!svgNode) {
    throw new Error('Failed to parse SVG: no svg element in parsed result')
  }
  return svgNode
}

export function createErrorFigure(
  figureClassName: string,
  errorMessage: string,
  code: string,
): Element {
  return {
    type: 'element',
    tagName: 'figure',
    properties: {
      'className': [figureClassName, `${figureClassName}-error`],
      'data-error': errorMessage,
    },
    children: [
      {
        type: 'element',
        tagName: 'pre',
        properties: { className: [`${figureClassName.replace('figure-', '')}-error`] },
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: [{ type: 'text', value: code }],
          },
        ],
      },
    ],
  }
}

export function createFigure(figureClassName: string, svgNode: Element): Element {
  return {
    type: 'element',
    tagName: 'figure',
    properties: { className: [figureClassName] },
    children: [svgNode],
  }
}

export function createSvgRendererPlugin<TOptions>(
  config: SvgRendererConfig<TOptions>,
): Plugin<[TOptions?], Root> {
  const { languageId, figureClassName, render, extractSvg, adjustSvgStyle } = config

  return (options = {} as TOptions) => {
    const transformer: Transformer<Root> = async (tree) => {
      const tasks: SvgRendererTask[] = []

      visit(tree, 'element', (node, index, parent) => {
        if (!parent || typeof index !== 'number')
          return
        if (!isCodeBlock(node as Element, languageId))
          return

        const code = extractText(node as Element)
        if (!code.trim())
          return

        tasks.push({ parent: parent as Element, index, code })
        return SKIP
      })

      if (tasks.length === 0) {
        return
      }

      await Promise.all(
        tasks.map(async ({ parent, index, code }) => {
          try {
            const svgRaw = await render(code, options)
            const svg = extractSvg ? extractSvg(svgRaw) : svgRaw
            const svgNode = parseSvg(svg)

            if (adjustSvgStyle) {
              adjustSvgStyle(svgNode)
            }

            parent.children.splice(index, 1, createFigure(figureClassName, svgNode))
          }
          catch (error) {
            console.error(`${languageId} render error:`, error)
            const errorMessage = error instanceof Error ? error.message : 'Render failed'
            parent.children.splice(index, 1, createErrorFigure(figureClassName, errorMessage, code))
          }
        }),
      )
    }

    return transformer
  }
}
