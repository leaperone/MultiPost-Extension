export interface CodeTheme {
  id: string
  name: string
  isDark: boolean
}

export const codeThemes: CodeTheme[] = [
  { id: 'catppuccin-frappe', name: 'Catppuccin Frappé', isDark: true },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', isDark: false },
  { id: 'catppuccin-macchiato', name: 'Catppuccin Macchiato', isDark: true },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', isDark: true },
  { id: 'kimbie-dark', name: 'Kimbie Dark', isDark: true },
  { id: 'kimbie-light', name: 'Kimbie Light', isDark: false },
  { id: 'panda-syntax-dark', name: 'Panda Syntax Dark', isDark: true },
  { id: 'panda-syntax-light', name: 'Panda Syntax Light', isDark: false },
  { id: 'paraiso-dark', name: 'Paraiso Dark', isDark: true },
  { id: 'paraiso-light', name: 'Paraiso Light', isDark: false },
  { id: 'rose-pine', name: 'Rosé Pine', isDark: true },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', isDark: false },
  { id: 'tokyo-night-dark', name: 'Tokyo Night Dark', isDark: true },
  { id: 'tokyo-night-light', name: 'Tokyo Night Light', isDark: false },
]

export const codeThemeIds = codeThemes.map(t => t.id) as [string, ...string[]]

export type CodeThemeId = (typeof codeThemes)[number]['id']

export { loadCodeThemeCss } from './loader'
