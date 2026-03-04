import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { deleteFileContent, getFileContent, saveFileContent } from '@/lib/markdown-engine/file-storage'

const DEFAULT_MARKDOWN = `# Hello MultiPost Markdown

欢迎使用 MultiPost Markdown 排版工具！

## 功能特性

- **14 种排版样式** — 从极简到创意，总有一款适合你
- **多平台复制** — 一键复制到微信公众号、知乎、掘金
- **代码高亮** — 14 种代码主题可选
- **数学公式** — 支持 KaTeX 公式渲染
- **Mermaid 图表** — 流程图、时序图、甘特图
- **PDF / 图片导出** — 智能分页，高清截图

## 代码示例

\`\`\`javascript
function hello() {
  console.log('Hello, MultiPost!')
}
\`\`\`

## 数学公式

行内公式 $E = mc^2$，块级公式：

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## 表格

| 功能 | 描述 |
|------|------|
| 排版 | 14 种 Markdown 样式 |
| 复制 | 微信 / 知乎 / 掘金 |
| 导出 | PDF / 图片 |

> [!TIP]
> 点击右侧工具栏切换排版样式和代码主题。
`

export interface MarkdownFile {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

const DEFAULT_FILE_NAME = 'untitled.md'

function normalizeFileName(name: string): string {
  let normalized = name.trim()
  if (!normalized) {
    normalized = DEFAULT_FILE_NAME
  }
  if (!/\.md$/i.test(normalized)) {
    normalized = `${normalized}.md`
  }
  return normalized
}

function ensureUniqueName(name: string, files: MarkdownFile[], excludeId?: string): string {
  const normalized = normalizeFileName(name)
  const baseName = normalized.replace(/\.md$/i, '')
  const ext = '.md'

  const existingNames = new Set(
    files.filter(f => f.id !== excludeId).map(f => f.name.toLowerCase()),
  )

  if (!existingNames.has(normalized.toLowerCase())) {
    return normalized
  }

  let i = 1
  while (existingNames.has(`${baseName} (${i})${ext}`.toLowerCase())) {
    i++
  }
  return `${baseName} (${i})${ext}`
}

function extractH1Title(content: string): string | null {
  const lines = content.split('\n')
  for (const line of lines) {
    if (line.startsWith('# ')) {
      const title = line.slice(2).trim().replace(/[*_`[\]]/g, '').trim()
      return title || null
    }
  }
  return null
}

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>()

function cancelPendingSave(id: string) {
  const timeout = pendingSaves.get(id)
  if (timeout) {
    clearTimeout(timeout)
    pendingSaves.delete(id)
  }
}

function debouncedSave(id: string, content: string, onSuccess: () => void, onError: (err: Error) => void) {
  cancelPendingSave(id)
  const timeout = setTimeout(async () => {
    pendingSaves.delete(id)
    try {
      await saveFileContent(id, content)
      onSuccess()
    }
    catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }, 500)
  pendingSaves.set(id, timeout)
}

let switchSeq = 0
let initPromise: Promise<void> | null = null

interface MdFilesState {
  files: MarkdownFile[]
  activeFileId: string | null
  currentContent: string
  isInitialized: boolean
  hasHydrated: boolean
  lastSaveError: string | null
}

const initState: MdFilesState = {
  files: [],
  activeFileId: null,
  currentContent: '',
  isInitialized: false,
  hasHydrated: false,
  lastSaveError: null,
}

interface MdFilesStore extends MdFilesState {
  setCurrentContent: (content: string) => void
  createFile: (name?: string, content?: string) => Promise<string>
  deleteFile: (id: string) => Promise<void>
  renameFile: (id: string, name: string) => void
  switchFile: (id: string) => Promise<void>
  getActiveFile: () => MarkdownFile | undefined
  initialize: () => Promise<void>
  setHasHydrated: (value: boolean) => void
}

export const useMdFilesStore = create(
  persist<MdFilesStore>(
    (set, get) => ({
      ...initState,

      setHasHydrated: (value) => {
        set({ hasHydrated: value })
      },

      setCurrentContent: (content) => {
        const { activeFileId } = get()
        set({ currentContent: content, lastSaveError: null })

        if (activeFileId) {
          debouncedSave(
            activeFileId,
            content,
            () => {
              const { files } = get()
              set({
                files: files.map(f =>
                  f.id === activeFileId ? { ...f, updatedAt: Date.now() } : f,
                ),
              })
            },
            (err) => {
              set({ lastSaveError: err.message })
              console.error(`保存失败: ${err.message}`)
            },
          )
        }
      },

      createFile: async (name, content = '') => {
        const { files } = get()
        const id = crypto.randomUUID()
        const rawName = name ?? extractH1Title(content) ?? DEFAULT_FILE_NAME
        const fileName = ensureUniqueName(rawName, files)
        const newFile: MarkdownFile = {
          id,
          name: fileName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        try {
          await saveFileContent(id, content)
        }
        catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`创建文件失败: ${message}`)
          throw err
        }
        set({ files: [...files, newFile] })
        return id
      },

      deleteFile: async (id) => {
        const { files, activeFileId, switchFile, createFile } = get()

        cancelPendingSave(id)

        try {
          await deleteFileContent(id)
        }
        catch (err) {
          console.error('删除文件内容失败:', err)
        }

        const newFiles = files.filter(f => f.id !== id)

        if (newFiles.length === 0) {
          set({ files: [] })
          const newId = await createFile(undefined, DEFAULT_MARKDOWN)
          await switchFile(newId)
          return
        }

        set({ files: newFiles })

        if (id === activeFileId) {
          await switchFile(newFiles[0].id)
        }
      },

      renameFile: (id, name) => {
        const { files } = get()
        const newName = ensureUniqueName(name, files, id)
        set({
          files: files.map(f =>
            f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f,
          ),
        })
      },

      switchFile: async (id) => {
        const { activeFileId, currentContent } = get()
        const thisSeq = ++switchSeq

        if (activeFileId) {
          cancelPendingSave(activeFileId)
        }

        if (activeFileId && activeFileId !== id) {
          try {
            await saveFileContent(activeFileId, currentContent)
          }
          catch (err) {
            console.error('切换前保存失败:', err)
          }
        }

        if (thisSeq !== switchSeq) {
          return
        }

        try {
          const content = await getFileContent(id)
          if (thisSeq !== switchSeq) {
            return
          }
          set({ activeFileId: id, currentContent: content })
        }
        catch (err) {
          console.error('加载文件内容失败:', err)
          if (thisSeq === switchSeq) {
            set({ activeFileId: id, currentContent: '' })
          }
        }
      },

      getActiveFile: () => {
        const { files, activeFileId } = get()
        return files.find(f => f.id === activeFileId)
      },

      initialize: async () => {
        if (initPromise) {
          return initPromise
        }

        const { isInitialized, hasHydrated } = get()
        if (isInitialized || !hasHydrated) {
          return
        }

        initPromise = (async () => {
          try {
            let { files, activeFileId } = get()

            if (files.length === 0) {
              const id = crypto.randomUUID()
              const h1Title = extractH1Title(DEFAULT_MARKDOWN)
              const newFile: MarkdownFile = {
                id,
                name: normalizeFileName(h1Title ?? DEFAULT_FILE_NAME),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }
              try {
                await saveFileContent(id, DEFAULT_MARKDOWN)
              }
              catch (err) {
                console.error('初始化保存失败:', err)
              }
              files = [newFile]
              activeFileId = id
              set({ files, activeFileId })
            }

            if (!activeFileId && files.length > 0) {
              activeFileId = files[0].id
              set({ activeFileId })
            }

            if (activeFileId) {
              try {
                const content = await getFileContent(activeFileId)
                set({ currentContent: content, isInitialized: true })
              }
              catch (err) {
                console.error('加载初始内容失败:', err)
                set({ currentContent: '', isInitialized: true })
              }
            }
            else {
              set({ isInitialized: true })
            }
          }
          catch {
            initPromise = null
          }
        })()

        return initPromise
      },
    }),
    {
      name: 'multipost.md.files',
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
      }) as unknown as MdFilesStore,
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Zustand rehydration error:', error)
        }
        state?.setHasHydrated(true)
      },
    },
  ),
)
