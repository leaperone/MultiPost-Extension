'use client'

import { useCallback, useMemo } from 'react'
import { useTheme } from 'next-themes'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { getAyuCodeMirrorTheme } from '@/lib/markdown-engine/themes/codemirror'
import { useMdDraftStore } from '@/store/md-draft.store'
import { useMdEditorStore } from '@/store/md-editor.store'

const baseExtensions = [
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  EditorView.lineWrapping,
]

export default function CodeMirrorEditor() {
  const { resolvedTheme } = useTheme()
  const content = useMdDraftStore(s => s.currentContent)
  const setContent = useMdDraftStore(s => s.setContent)
  const isInitialized = useMdDraftStore(s => s.isInitialized)
  const enableScrollSync = useMdEditorStore(s => s.enableScrollSync)
  const setScrollFromEditor = useMdEditorStore(s => s.setScrollFromEditor)

  const theme = useMemo(
    () => getAyuCodeMirrorTheme(resolvedTheme === 'dark' ? 'dark' : 'light'),
    [resolvedTheme],
  )

  const extensions = useMemo(() => {
    const exts = [...baseExtensions]

    if (enableScrollSync) {
      exts.push(
        EditorView.domEventHandlers({
          scroll(event) {
            const target = event.target as HTMLElement | null
            if (!target) {
              return
            }
            const { scrollTop, scrollHeight, clientHeight } = target
            const maxScroll = scrollHeight - clientHeight
            if (maxScroll > 0) {
              setScrollFromEditor(scrollTop / maxScroll)
            }
          },
        }),
      )
    }

    return exts
  }, [enableScrollSync, setScrollFromEditor])

  const handleChange = useCallback((value: string) => {
    setContent(value)
  }, [setContent])

  if (!isInitialized) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <CodeMirror
      value={content}
      onChange={handleChange}
      theme={theme}
      extensions={extensions}
      height="100%"
      style={{ height: '100%' }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        bracketMatching: true,
      }}
    />
  )
}
