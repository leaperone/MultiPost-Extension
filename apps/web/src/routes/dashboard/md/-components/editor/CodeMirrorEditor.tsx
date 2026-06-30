'use client'

import { createClientOnlyFn } from '@tanstack/react-start'
import { Component, useCallback, useMemo, type ErrorInfo, type ReactNode } from 'react'
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

const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
  highlightSelectionMatches: true,
  bracketMatching: true,
}

const MAX_AUTO_RETRIES = 2

const reportEditorErrorToSentry = createClientOnlyFn((error: unknown) => {
  void Promise.all([import('@/sentry.client.config'), import('@sentry/core')]).then(
    ([{ initSentryClient }, { captureException }]) => {
      initSentryClient()
      captureException(error)
    },
  )
})

function CodeMirrorEditorInner() {
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
      basicSetup={BASIC_SETUP}
    />
  )
}

interface CodeMirrorEditorBoundaryState {
  hasError: boolean
  remountKey: number
  retryCount: number
}

export default class CodeMirrorEditor extends Component<
  Record<string, never>,
  CodeMirrorEditorBoundaryState
> {
  state: CodeMirrorEditorBoundaryState = {
    hasError: false,
    remountKey: 0,
    retryCount: 0,
  }

  static getDerivedStateFromError(): Partial<CodeMirrorEditorBoundaryState> {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo) {
    reportEditorErrorToSentry(error)

    this.setState(prevState => {
      if (prevState.retryCount >= MAX_AUTO_RETRIES) {
        return prevState
      }

      return {
        hasError: false,
        remountKey: prevState.remountKey + 1,
        retryCount: prevState.retryCount + 1,
      }
    })
  }

  handleReloadEditor = () => {
    this.setState(prevState => ({
      hasError: false,
      remountKey: prevState.remountKey + 1,
      retryCount: 0,
    }))
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center bg-background p-4 text-foreground">
          <div className="w-full max-w-sm border bg-background p-4 text-center shadow-none">
            <p className="text-sm font-medium text-foreground">Editor unavailable</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your draft is still saved. Reload the editor to continue.
            </p>
            <button
              type="button"
              onClick={this.handleReloadEditor}
              className="mt-4 inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-none transition-colors hover:bg-foreground/5">
              Reload editor
            </button>
          </div>
        </div>
      )
    }

    return <CodeMirrorEditorInner key={this.state.remountKey} />
  }
}
