export interface InfographicTheme {
  id: string
  name: string
  isDark: boolean
}

export interface InfographicPalette {
  id: string
  name: string
}

function toDisplayName(id: string): string {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const BUILTIN_THEMES = ['default', 'dark', 'hand-drawn'] as const
const BUILTIN_PALETTES = ['antv', 'spectral'] as const

export const infographicThemes: InfographicTheme[] = BUILTIN_THEMES.map(id => ({
  id,
  name: toDisplayName(id),
  isDark: id === 'dark',
}))

export const infographicPalettes: InfographicPalette[] = BUILTIN_PALETTES.map(id => ({
  id,
  name: toDisplayName(id),
}))

export const infographicThemeIds = infographicThemes.map(t => t.id) as [string, ...string[]]
export const infographicPaletteIds = infographicPalettes.map(p => p.id) as [string, ...string[]]

export type InfographicThemeId = (typeof infographicThemeIds)[number]
export type InfographicPaletteId = (typeof infographicPaletteIds)[number]

export function isValidTheme(theme: string): theme is InfographicThemeId {
  return BUILTIN_THEMES.includes(theme as typeof BUILTIN_THEMES[number])
}

export function isValidPalette(palette: string): palette is InfographicPaletteId {
  return BUILTIN_PALETTES.includes(palette as typeof BUILTIN_PALETTES[number])
}
