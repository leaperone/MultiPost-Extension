import type { DiagramColors, ThemeName } from 'beautiful-mermaid'
import { THEMES } from 'beautiful-mermaid'

export interface MermaidTheme {
  id: MermaidThemeId
  name: string
  isDark: boolean
}

function toDisplayName(id: string): string {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isDarkTheme(colors: DiagramColors): boolean {
  const bg = colors.bg
  const hex = bg.replace('#', '')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance < 0.5
}

const themesFromLib: MermaidTheme[] = (Object.keys(THEMES) as ThemeName[])
  .sort()
  .map(id => ({
    id,
    name: toDisplayName(id),
    isDark: isDarkTheme(THEMES[id]),
  }))

export const mermaidThemes: MermaidTheme[] = [
  { id: '', name: 'Default', isDark: false },
  ...themesFromLib,
]

export const mermaidThemeIds = mermaidThemes.map(t => t.id) as [string, ...string[]]

export type MermaidThemeId = '' | ThemeName
