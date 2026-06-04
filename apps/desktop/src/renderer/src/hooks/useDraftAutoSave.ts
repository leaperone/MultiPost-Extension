import { useEffect, useState, useCallback, useRef } from 'react'
import type { SyncContentType, PlatformType, Draft } from '../../../shared/types'

// Keep localStorage key for backward compatibility during migration
const DRAFT_STORAGE_KEY = 'multipost:draft'

export interface DraftData {
  contentType: SyncContentType
  dynamic: { title: string; content: string }
  video: { title: string; description: string; tags: string }
  article: { title: string; digest: string; content: string }
  podcast: { title: string; description: string; tags: string }
  selectedPlatforms: PlatformType[]
  savedAt: number
}

interface UseDraftAutoSaveOptions {
  delay?: number
  enabled?: boolean
  useBackend?: boolean // New option to use backend API
}

interface UseDraftAutoSaveReturn {
  isSaving: boolean
  lastSaved: number | null
  hasDraft: boolean
  draftId: string | null
  clearDraft: () => void
  loadDraft: () => DraftData | null
  saveDraftNow: () => Promise<void>
}

export function useDraftAutoSave(
  data: Omit<DraftData, 'savedAt'>,
  options: UseDraftAutoSaveOptions = {}
): UseDraftAutoSaveReturn {
  const { delay = 3000, enabled = true, useBackend = true } = options
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDataRef = useRef<string>('')

  // Migrate from localStorage to backend on mount
  useEffect(() => {
    const migrateLocalDraft = async () => {
      const localDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (localDraft && useBackend) {
        try {
          const parsed = JSON.parse(localDraft) as DraftData
          // Create draft in backend
          const draft = await window.api.draft.create({
            title: getTitleFromData(parsed),
            contentType: parsed.contentType,
            content: getContentFromData(parsed),
            selectedPlatforms: parsed.selectedPlatforms
          })
          setDraftId(draft.id)
          setHasDraft(true)
          setLastSaved(draft.updatedAt)
          // Clear localStorage after successful migration
          localStorage.removeItem(DRAFT_STORAGE_KEY)
        } catch (error) {
          console.error('Failed to migrate local draft:', error)
        }
      }
    }
    migrateLocalDraft()
  }, [useBackend])

  // Check if draft exists on mount
  useEffect(() => {
    const checkExistingDraft = async () => {
      if (useBackend) {
        try {
          const drafts = await window.api.draft.list(data.contentType)
          if (drafts.length > 0) {
            // Use the most recent draft
            const latestDraft = drafts[0]
            setDraftId(latestDraft.id)
            setHasDraft(true)
            setLastSaved(latestDraft.updatedAt)
          }
        } catch (error) {
          console.error('Failed to check existing drafts:', error)
        }
      } else {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
        setHasDraft(!!saved)
        if (saved) {
          try {
            const draft = JSON.parse(saved) as DraftData
            setLastSaved(draft.savedAt)
          } catch {
            localStorage.removeItem(DRAFT_STORAGE_KEY)
            setHasDraft(false)
          }
        }
      }
    }
    checkExistingDraft()
  }, [useBackend, data.contentType])

  // Save to backend
  const saveToBackend = useCallback(
    async (dataToSave: Omit<DraftData, 'savedAt'>) => {
      const title = getTitleFromData(dataToSave)
      const content = getContentFromData(dataToSave)

      try {
        if (draftId) {
          // Update existing draft
          const updated = await window.api.draft.update(draftId, {
            title,
            contentType: dataToSave.contentType,
            content,
            selectedPlatforms: dataToSave.selectedPlatforms
          })
          setLastSaved(updated.updatedAt)
        } else {
          // Create new draft
          const created = await window.api.draft.create({
            title,
            contentType: dataToSave.contentType,
            content,
            selectedPlatforms: dataToSave.selectedPlatforms
          })
          setDraftId(created.id)
          setLastSaved(created.updatedAt)
          setHasDraft(true)
        }
      } catch (error) {
        console.error('Failed to save draft to backend:', error)
        throw error
      }
    },
    [draftId]
  )

  // Save to localStorage (fallback)
  const saveToLocalStorage = useCallback((dataToSave: Omit<DraftData, 'savedAt'>) => {
    const now = Date.now()
    const draftData: DraftData = {
      ...dataToSave,
      savedAt: now
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData))
    setLastSaved(now)
    setHasDraft(true)
  }, [])

  // Auto save with debounce
  useEffect(() => {
    if (!enabled) return

    const dataString = JSON.stringify(data)

    // Skip if data hasn't changed
    if (dataString === lastDataRef.current) return

    // Skip if all content is empty
    const hasContent =
      data.dynamic.content.trim() ||
      data.video.title.trim() ||
      data.article.title.trim() ||
      data.article.content.trim() ||
      data.podcast.title.trim()

    if (!hasContent) return

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        if (useBackend) {
          await saveToBackend(data)
        } else {
          saveToLocalStorage(data)
        }
        lastDataRef.current = dataString
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setIsSaving(false)
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, enabled, useBackend, saveToBackend, saveToLocalStorage])

  const clearDraft = useCallback(async () => {
    if (useBackend && draftId) {
      try {
        await window.api.draft.delete(draftId)
      } catch (error) {
        console.error('Failed to delete draft:', error)
      }
    }
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    setHasDraft(false)
    setLastSaved(null)
    setDraftId(null)
    lastDataRef.current = ''
  }, [useBackend, draftId])

  const loadDraft = useCallback((): DraftData | null => {
    // For now, still use localStorage for loading
    // Backend drafts are loaded via DraftsPage
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!saved) return null
    try {
      return JSON.parse(saved) as DraftData
    } catch {
      return null
    }
  }, [])

  const saveDraftNow = useCallback(async () => {
    setIsSaving(true)
    try {
      if (useBackend) {
        await saveToBackend(data)
      } else {
        saveToLocalStorage(data)
      }
      lastDataRef.current = JSON.stringify(data)
    } finally {
      setIsSaving(false)
    }
  }, [data, useBackend, saveToBackend, saveToLocalStorage])

  return {
    isSaving,
    lastSaved,
    hasDraft,
    draftId,
    clearDraft,
    loadDraft,
    saveDraftNow
  }
}

// Helper functions to extract title and content from draft data
function getTitleFromData(data: Omit<DraftData, 'savedAt'>): string {
  switch (data.contentType) {
    case 'DYNAMIC':
      return data.dynamic.title || '未命名动态'
    case 'VIDEO':
      return data.video.title || '未命名视频'
    case 'ARTICLE':
      return data.article.title || '未命名文章'
    case 'PODCAST':
      return data.podcast.title || '未命名播客'
    default:
      return '未命名草稿'
  }
}

function getContentFromData(data: Omit<DraftData, 'savedAt'>): string {
  switch (data.contentType) {
    case 'DYNAMIC':
      return data.dynamic.content
    case 'VIDEO':
      return data.video.description
    case 'ARTICLE':
      return data.article.content
    case 'PODCAST':
      return data.podcast.description
    default:
      return ''
  }
}

// Export Draft type converter for use in other components
export function draftToEditorData(draft: Draft): Omit<DraftData, 'savedAt'> {
  const emptyDynamic = { title: '', content: '' }
  const emptyVideo = { title: '', description: '', tags: '' }
  const emptyArticle = { title: '', digest: '', content: '' }
  const emptyPodcast = { title: '', description: '', tags: '' }

  switch (draft.contentType) {
    case 'DYNAMIC':
      return {
        contentType: 'DYNAMIC',
        dynamic: { title: draft.title, content: draft.content },
        video: emptyVideo,
        article: emptyArticle,
        podcast: emptyPodcast,
        selectedPlatforms: draft.selectedPlatforms || []
      }
    case 'VIDEO':
      return {
        contentType: 'VIDEO',
        dynamic: emptyDynamic,
        video: {
          title: draft.title,
          description: draft.content,
          tags: draft.tags?.join(', ') || ''
        },
        article: emptyArticle,
        podcast: emptyPodcast,
        selectedPlatforms: draft.selectedPlatforms || []
      }
    case 'ARTICLE':
      return {
        contentType: 'ARTICLE',
        dynamic: emptyDynamic,
        video: emptyVideo,
        article: {
          title: draft.title,
          digest: '',
          content: draft.htmlContent || draft.content
        },
        podcast: emptyPodcast,
        selectedPlatforms: draft.selectedPlatforms || []
      }
    case 'PODCAST':
      return {
        contentType: 'PODCAST',
        dynamic: emptyDynamic,
        video: emptyVideo,
        article: emptyArticle,
        podcast: {
          title: draft.title,
          description: draft.content,
          tags: draft.tags?.join(', ') || ''
        },
        selectedPlatforms: draft.selectedPlatforms || []
      }
    default:
      return {
        contentType: 'DYNAMIC',
        dynamic: emptyDynamic,
        video: emptyVideo,
        article: emptyArticle,
        podcast: emptyPodcast,
        selectedPlatforms: []
      }
  }
}
