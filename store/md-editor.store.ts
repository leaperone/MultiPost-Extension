import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMdPreviewStore } from './md-preview.store'

type ScrollSource = 'editor' | 'preview' | null

function clampRatio(value: number) {
  return Math.min(1, Math.max(0, value))
}

interface MdEditorState {
  scrollRatio: number
  scrollSource: ScrollSource
  enableFootnoteLinks: boolean
  openLinksInNewWindow: boolean
  enableScrollSync: boolean
}

const initState: MdEditorState = {
  scrollRatio: 0,
  scrollSource: null,
  enableFootnoteLinks: true,
  openLinksInNewWindow: true,
  enableScrollSync: true,
}

interface MdEditorStore extends MdEditorState {
  setScrollFromEditor: (ratio: number) => void
  setScrollFromPreview: (ratio: number) => void
  setEnableFootnoteLinks: (enable: boolean) => void
  setOpenLinksInNewWindow: (enable: boolean) => void
  setEnableScrollSync: (enable: boolean) => void
}

export const useMdEditorStore = create(
  persist<MdEditorStore>(
    (set) => ({
      ...initState,

      setScrollFromEditor: ratio => set({
        scrollRatio: clampRatio(ratio),
        scrollSource: 'editor',
      }),
      setScrollFromPreview: ratio => set({
        scrollRatio: clampRatio(ratio),
        scrollSource: 'preview',
      }),

      setEnableFootnoteLinks: (enable) => {
        set({ enableFootnoteLinks: enable })
        useMdPreviewStore.getState().clearRenderedHtmlCache()
      },

      setOpenLinksInNewWindow: (enable) => {
        set({ openLinksInNewWindow: enable })
        useMdPreviewStore.getState().clearRenderedHtmlCache()
      },

      setEnableScrollSync: enable => set({ enableScrollSync: enable }),
    }),
    {
      name: 'multipost.md.editor',
      partialize: (state) => ({
        enableFootnoteLinks: state.enableFootnoteLinks,
        openLinksInNewWindow: state.openLinksInNewWindow,
        enableScrollSync: state.enableScrollSync,
      }) as unknown as MdEditorStore,
    },
  ),
)
