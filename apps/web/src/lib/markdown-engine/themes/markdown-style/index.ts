export interface MarkdownStyle {
  id: string
  name: string
}

export const markdownStyles: MarkdownStyle[] = [
  { id: 'ayu-light', name: 'Ayu Light' },
  { id: 'bauhaus', name: 'Bauhaus' },
  { id: 'blueprint', name: 'Blueprint' },
  { id: 'botanical', name: 'Botanical' },
  { id: 'green-simple', name: 'GreenSimple' },
  { id: 'maximalism', name: 'Maximalism' },
  { id: 'neo-brutalism', name: 'Neo-Brutalism' },
  { id: 'newsprint', name: 'Newsprint' },
  { id: 'organic', name: 'Organic' },
  { id: 'playful-geometric', name: 'Playful Geometric' },
  { id: 'professional', name: 'Professional' },
  { id: 'retro', name: 'Retro' },
  { id: 'sketch', name: 'Sketch' },
  { id: 'terminal', name: 'Terminal' },
]

export const markdownStyleIds = markdownStyles.map(s => s.id) as [string, ...string[]]

export type MarkdownStyleId = (typeof markdownStyles)[number]['id']

export { loadMarkdownStyleCss } from './loader'
