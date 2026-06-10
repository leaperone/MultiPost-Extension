import type { Plugin } from 'unified'
import type { Platform } from './adapters'
import juice from 'juice'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeGithubAlert from 'rehype-github-alert'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { loadCodeThemeCss } from '../themes/code-theme/loader'
import { loadMarkdownStyleCss } from '../themes/markdown-style/loader'
import { loadKatexCss } from '../utils'
import { getAdapterPlugins } from './adapters'
import { rehypeDivToSection, rehypeFigureWrapper, rehypeFootnoteLinks, rehypeMermaid, rehypeWrapTextNodes, remarkFrontmatterTable } from './plugins'
import { sanitizeSchema } from './sanitize-schema'

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

interface ProcessorOptions {
  enableFootnoteLinks?: boolean
  openLinksInNewWindow?: boolean
  mermaidTheme?: string
  platform?: Platform
  footnoteLabel?: string
  referenceTitle?: string
}

function createProcessor({ enableFootnoteLinks, openLinksInNewWindow, mermaidTheme, platform = 'html', footnoteLabel = 'Footnotes', referenceTitle = 'References' }: ProcessorOptions) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkFrontmatterTable)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      footnoteLabel,
      footnoteLabelTagName: 'h4',
    })

  if (openLinksInNewWindow) {
    processor.use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noreferrer', 'noopener'],
    })
  }

  processor
    .use(rehypeRaw)
    .use(rehypeGithubAlert)
    .use(rehypeMermaid, { theme: mermaidTheme })
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeFigureWrapper)

  if (enableFootnoteLinks && platform !== 'wechat') {
    processor.use(rehypeFootnoteLinks, { referenceTitle })
  }

  const adapterPlugins = getAdapterPlugins(platform, { referenceTitle })
  for (const plugin of adapterPlugins) {
    if (Array.isArray(plugin)) {
      processor.use(plugin[0] as Plugin, plugin[1])
    }
    else {
      processor.use(plugin as Plugin)
    }
  }

  processor.use(rehypeDivToSection)
  processor.use(rehypeWrapTextNodes)

  processor.use(rehypeStringify, { allowDangerousHtml: true })

  return processor
}

export async function render(options: RenderOptions): Promise<string> {
  const {
    markdown,
    markdownStyle,
    codeTheme,
    mermaidTheme,
    customCss = '',
    enableFootnoteLinks = true,
    openLinksInNewWindow = true,
    platform = 'html',
    footnoteLabel = 'Footnotes',
    referenceTitle = 'References',
  } = options

  const processor = createProcessor({ enableFootnoteLinks, openLinksInNewWindow, mermaidTheme, platform, footnoteLabel, referenceTitle })
  const html = (await processor.process(markdown)).toString()

  const hasKatex = html.includes('class="katex"')
    || html.includes('class="katex-display"')
    || html.includes('class="katex-mathml"')

  if (!markdownStyle && !codeTheme && !hasKatex && !customCss) {
    return html
  }

  const [markdownStyleCss, codeThemeCss, katexCss] = await Promise.all([
    markdownStyle ? loadMarkdownStyleCss(markdownStyle) : Promise.resolve(''),
    codeTheme ? loadCodeThemeCss(codeTheme) : Promise.resolve(''),
    hasKatex ? loadKatexCss() : Promise.resolve(''),
  ])
  const css = [
    markdownStyleCss ?? '',
    codeThemeCss ?? '',
    katexCss ?? '',
    customCss,
  ].filter(Boolean).join('\n')

  const wrapped = `<section id="mp-md">${html}</section>`

  try {
    return juice.inlineContent(wrapped, css, {
      inlinePseudoElements: true,
      preserveImportant: true,
    })
  }
  catch (error) {
    console.error('Juice inline error:', error)
    return wrapped
  }
}
