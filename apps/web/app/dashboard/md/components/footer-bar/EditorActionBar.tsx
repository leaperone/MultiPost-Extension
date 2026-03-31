'use client'

import { Button, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Divider } from '@heroui/react'
import { FileUp, FileDown, Settings } from 'lucide-react'
import { useCallback } from 'react'
import { handleImportFiles, exportMarkdown } from '@/lib/markdown-engine/actions'
import { useMdEditorStore } from '@/store/md-editor.store'
import { useMdDraftStore } from '@/store/md-draft.store'

export default function EditorActionBar() {
  const content = useMdDraftStore(s => s.currentContent)
  const enableFootnoteLinks = useMdEditorStore(s => s.enableFootnoteLinks)
  const openLinksInNewWindow = useMdEditorStore(s => s.openLinksInNewWindow)
  const enableScrollSync = useMdEditorStore(s => s.enableScrollSync)
  const setEnableFootnoteLinks = useMdEditorStore(s => s.setEnableFootnoteLinks)
  const setOpenLinksInNewWindow = useMdEditorStore(s => s.setOpenLinksInNewWindow)
  const setEnableScrollSync = useMdEditorStore(s => s.setEnableScrollSync)

  const handleImport = useCallback(async () => {
    await handleImportFiles()
  }, [])

  const handleExport = useCallback(() => {
    exportMarkdown(content)
  }, [content])

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip content="导入文件">
        <Button isIconOnly variant="light" size="sm" aria-label="导入文件" onPress={handleImport}>
          <FileUp className="size-4" />
        </Button>
      </Tooltip>

      <Tooltip content="导出 Markdown">
        <Button isIconOnly variant="light" size="sm" aria-label="导出 Markdown" onPress={handleExport}>
          <FileDown className="size-4" />
        </Button>
      </Tooltip>

      <Divider orientation="vertical" className="mx-1 h-5" />

      <Dropdown>
        <Tooltip content="编辑器设置">
          <div>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" aria-label="编辑器设置">
                <Settings className="size-4" />
              </Button>
            </DropdownTrigger>
          </div>
        </Tooltip>
        <DropdownMenu
          aria-label="编辑器设置"
          selectionMode="multiple"
          selectedKeys={new Set([
            ...(enableFootnoteLinks ? ['footnoteLinks'] : []),
            ...(openLinksInNewWindow ? ['openLinksInNewWindow'] : []),
            ...(enableScrollSync ? ['scrollSync'] : []),
          ])}
          onSelectionChange={(keys) => {
            const selected = new Set(keys)
            setEnableFootnoteLinks(selected.has('footnoteLinks'))
            setOpenLinksInNewWindow(selected.has('openLinksInNewWindow'))
            setEnableScrollSync(selected.has('scrollSync'))
          }}
        >
          <DropdownItem key="footnoteLinks">引用链接列表</DropdownItem>
          <DropdownItem key="openLinksInNewWindow">新窗口打开链接</DropdownItem>
          <DropdownItem key="scrollSync">滚动同步</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}
