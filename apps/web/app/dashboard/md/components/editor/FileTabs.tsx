'use client'

import { useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@heroui/react'
import { useMdFilesStore } from '@/store/md-files.store'

export default function FileTabs() {
  const files = useMdFilesStore(s => s.files)
  const activeFileId = useMdFilesStore(s => s.activeFileId)
  const switchFile = useMdFilesStore(s => s.switchFile)
  const createFile = useMdFilesStore(s => s.createFile)
  const deleteFile = useMdFilesStore(s => s.deleteFile)
  const renameFile = useMdFilesStore(s => s.renameFile)

  const handleCreate = useCallback(async () => {
    const id = await createFile()
    await switchFile(id)
  }, [createFile, switchFile])

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteFile(id)
  }, [deleteFile])

  const handleDoubleClick = useCallback((id: string, currentName: string) => {
    const newName = prompt('重命名文件', currentName.replace(/\.md$/i, ''))
    if (newName !== null && newName.trim()) {
      renameFile(id, newName.trim())
    }
  }, [renameFile])

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1 overflow-x-auto">
      {files.map(file => (
        <button
          key={file.id}
          onClick={() => switchFile(file.id)}
          onDoubleClick={() => handleDoubleClick(file.id, file.name)}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs whitespace-nowrap transition-colors ${
            file.id === activeFileId
              ? 'bg-foreground/10 text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
          }`}
        >
          <span className="max-w-[120px] truncate">{file.name}</span>
          {files.length > 1 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => handleDelete(e, file.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(e as unknown as React.MouseEvent, file.id) }}
              className="ml-1 rounded p-0.5 hover:bg-foreground/10"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      ))}
      <Button
        isIconOnly
        size="sm"
        variant="light"
        onPress={handleCreate}
        className="size-6 min-w-6"
      >
        <Plus className="size-3" />
      </Button>
    </div>
  )
}
