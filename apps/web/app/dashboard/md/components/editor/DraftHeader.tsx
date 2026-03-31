'use client'

import { useMdDraftStore } from '@/store/md-draft.store'

export default function DraftHeader() {
  const currentTitle = useMdDraftStore(s => s.currentTitle)
  const setTitle = useMdDraftStore(s => s.setTitle)
  const isSaving = useMdDraftStore(s => s.isSaving)
  const hasUnsavedChanges = useMdDraftStore(s => s.hasUnsavedChanges)
  const activeDraftId = useMdDraftStore(s => s.activeDraftId)

  if (!activeDraftId) return null

  return (
    <div className="flex items-center gap-2 border-b px-3 py-1.5">
      <input
        value={currentTitle}
        onChange={e => setTitle(e.target.value)}
        placeholder="Untitled"
        className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
      />
      <span className="shrink-0 text-xs text-muted-foreground">
        {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
      </span>
    </div>
  )
}
