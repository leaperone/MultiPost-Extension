import type { Platform } from '@/lib/markdown-engine/render/adapters'
import type { MermaidThemeId } from '@/lib/markdown-engine/themes/mermaid-theme'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const PREVIEW_WIDTH_MOBILE = 415
export const PREVIEW_WIDTH_DESKTOP = 768

type PreviewWidth = typeof PREVIEW_WIDTH_MOBILE | typeof PREVIEW_WIDTH_DESKTOP

export interface InfographicSettings {
  theme: string
  palette: string
}

interface MdPreviewState {
  previewWidth: PreviewWidth
  userPreferredWidth: PreviewWidth
  markdownStyle: string
  codeTheme: string
  mermaidTheme: MermaidThemeId
  infographic: InfographicSettings
  customCss: string
  renderedHtmlMap: Partial<Record<Platform, string>>
}

const initState: MdPreviewState = {
  previewWidth: PREVIEW_WIDTH_MOBILE,
  userPreferredWidth: PREVIEW_WIDTH_MOBILE,
  markdownStyle: 'ayu-light',
  codeTheme: 'kimbie-light',
  mermaidTheme: '',
  infographic: { theme: 'default', palette: 'antv' },
  customCss: '',
  renderedHtmlMap: {},
}

interface MdPreviewStore extends MdPreviewState {
  setPreviewWidth: (width: PreviewWidth) => void
  setUserPreferredWidth: (width: PreviewWidth) => void
  setMarkdownStyle: (id: string) => void
  setCodeTheme: (theme: string) => void
  setMermaidTheme: (theme: MermaidThemeId) => void
  setInfographic: (settings: Partial<InfographicSettings>) => void
  setCustomCss: (css: string) => void
  setRenderedHtml: (platform: Platform, html: string) => void
  getRenderedHtml: (platform: Platform) => string
  clearRenderedHtmlCache: () => void
}

export const useMdPreviewStore = create(
  persist<MdPreviewStore>(
    (set, get) => ({
      ...initState,

      setPreviewWidth: previewWidth => set({ previewWidth }),

      setUserPreferredWidth: userPreferredWidth => set({ previewWidth: userPreferredWidth, userPreferredWidth }),

      setMarkdownStyle: markdownStyle => set({ markdownStyle, renderedHtmlMap: {} }),

      setCodeTheme: codeTheme => set({ codeTheme, renderedHtmlMap: {} }),

      setMermaidTheme: mermaidTheme => set({ mermaidTheme, renderedHtmlMap: {} }),

      setInfographic: settings => set(state => ({
        infographic: { ...state.infographic, ...settings },
        renderedHtmlMap: {},
      })),

      setCustomCss: customCss => set({ customCss, renderedHtmlMap: {} }),

      setRenderedHtml: (platform, html) => set(state => ({
        renderedHtmlMap: { ...state.renderedHtmlMap, [platform]: html },
      })),

      getRenderedHtml: platform => get().renderedHtmlMap[platform] ?? '',

      clearRenderedHtmlCache: () => set({ renderedHtmlMap: {} }),
    }),
    {
      name: 'multipost.md.preview',
      partialize: (state) => ({
        userPreferredWidth: state.userPreferredWidth,
        markdownStyle: state.markdownStyle,
        codeTheme: state.codeTheme,
        mermaidTheme: state.mermaidTheme,
        infographic: state.infographic,
        customCss: state.customCss,
      }) as unknown as MdPreviewStore,
    },
  ),
)
