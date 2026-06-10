'use client'

import { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button, addToast, Progress, Image } from '@heroui/react'
import { XIcon, GripVerticalIcon, PlayCircleIcon, ImagePlusIcon, LibraryIcon, BotIcon } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import axios from 'axios'
import { nanoid } from 'nanoid'
import { useTranslation } from '@/i18n/client'
import { useMdDraftStore } from '@/store/md-draft.store'
import type { DraftFileDataClient } from '@/lib/types/draft'

const ReactPlayer = lazy(() => import('react-player'))
const Viewer = lazy(() => import('react-viewer'))

// Shared S3 upload logic
async function uploadFileToS3(
  file: File,
  rid: string,
  filesRef: React.RefObject<DraftFileDataClient[]>,
  setFiles: (files: DraftFileDataClient[]) => void,
  onError?: (error: unknown) => void,
) {
  try {
    const { data: presignData } = await axios.post('/api/v1/file/create', {
      filename: file.name,
    })

    if (presignData.code !== 0 || !presignData.data?.url) {
      throw new Error('Failed to get presigned url')
    }

    await axios.put(presignData.data.url, file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: (progressEvent) => {
        const progress = Math.min(99, Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1)))
        const updatedFiles = filesRef.current.map(f =>
          f.rid === rid ? { ...f, uploadProgress: progress } : f,
        )
        setFiles(updatedFiles)
      },
    })

    const { data: previewData } = await axios.get(`/api/v1/file/${presignData.data.fileId}/preview`)

    if (previewData.code !== 0 || !previewData.data?.previewUrl) {
      throw new Error('Failed to get preview url')
    }

    const updatedFiles = filesRef.current.map(f =>
      f.rid === rid
        ? { ...f, url: previewData.data.previewUrl, uploadProgress: 100, source: 'mp_oss' as const }
        : f,
    )
    setFiles(updatedFiles)
  }
  catch (error) {
    console.error('Upload failed', error)
    onError?.(error)
    const filteredFiles = filesRef.current.filter(f => f.rid !== rid)
    setFiles(filteredFiles)
  }
}

function createLocalFiles(fileList: File[]): DraftFileDataClient[] {
  return fileList.map(file => ({
    rid: nanoid(),
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
    source: 'local',
    uploadProgress: 0,
    file,
  }))
}

// --- Sub-components ---

function UploadOverlay({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs">
      <Progress
        size="lg"
        isIndeterminate={progress === 0}
        value={progress}
        className="max-w-md"
        showValueLabel
      />
    </div>
  )
}

interface SortableMediaProps {
  id: string
  file: DraftFileDataClient
  index: number
  onDelete: (index: number) => void
  onImageClick?: (index: number) => void
}

function SortableMedia({ id, file, index, onDelete, onImageClick }: SortableMediaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  }

  const isUploading = file.source === 'local' && (file.uploadProgress ?? 0) < 100

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square w-[80px] shrink-0 overflow-hidden rounded-md bg-default-100"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 z-50 m-0.5 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVerticalIcon className="size-3.5" />
      </div>
      {file.type.startsWith('image') && (
        <Image
          src={file.url}
          alt={file.name}
          width={80}
          height={80}
          className="cursor-pointer object-cover"
          onClick={() => !isUploading && onImageClick?.(index)}
        />
      )}
      {file.type.startsWith('video') && (
        <div className="size-full">
          <Suspense fallback={<div className="size-full animate-pulse bg-default-200" />}>
            <ReactPlayer
              url={file.url}
              width="100%"
              height="100%"
              playing={false}
              controls={false}
              volume={0}
              muted
            />
          </Suspense>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <PlayCircleIcon className="size-6 text-white" />
          </div>
        </div>
      )}
      {isUploading && <UploadOverlay progress={file.uploadProgress!} />}
      {!isUploading && (
        <Button
          isIconOnly
          size="sm"
          color="danger"
          className="absolute right-0 top-0 z-50 m-0.5 size-5 min-w-0 opacity-0 transition-opacity group-hover:opacity-100"
          onPress={() => onDelete(index)}
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </div>
  )
}

function ActionButton({ onClick, icon: Icon, text }: { onClick?: () => void; icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <button
      type="button"
      className="flex aspect-square w-[80px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      onClick={onClick}
    >
      <Icon className="size-5" />
      <p className="text-[10px]">{text}</p>
    </button>
  )
}

// --- Main component ---

interface MediaAttachmentsProps {
  onShowMediaLibrary: () => void
  onShowAiImage: () => void
}

export default function MediaAttachments({ onShowMediaLibrary, onShowAiImage }: MediaAttachmentsProps) {
  const { t } = useTranslation('draft')
  const currentFiles = useMdDraftStore(s => s.currentFiles)
  const setFiles = useMdDraftStore(s => s.setFiles)
  const activeDraftId = useMdDraftStore(s => s.activeDraftId)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<DraftFileDataClient[]>(currentFiles)
  const sensors = useSensors(useSensor(PointerSensor))
  const [viewerVisible, setViewerVisible] = useState(false)
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    filesRef.current = currentFiles
  }, [currentFiles])

  const fileIds = useMemo(
    () => currentFiles.map(f => f.rid).filter((rid): rid is string => !!rid),
    [currentFiles],
  )

  const imageFiles = useMemo(
    () => currentFiles.filter(f => f.type.startsWith('image')),
    [currentFiles],
  )

  const startUploads = useCallback(
    (newFiles: DraftFileDataClient[]) => {
      newFiles.forEach(f => {
        if (f.file && f.rid) {
          uploadFileToS3(f.file, f.rid, filesRef, setFiles, () => {
            addToast({ title: t('editor.toast.uploadFailed'), color: 'danger' })
          })
        }
      })
    },
    [setFiles, t],
  )

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        const newFiles = createLocalFiles(Array.from(selectedFiles))
        startUploads(newFiles)
        setFiles([...filesRef.current, ...newFiles])
      }
      event.target.value = ''
    },
    [startUploads, setFiles],
  )

  // Global paste handler for images/videos
  useEffect(() => {
    if (!activeDraftId) return

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      const filesToUpload: File[] = []
      for (const item of items) {
        if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))) {
          const file = item.getAsFile()
          if (file) filesToUpload.push(file)
        }
      }

      if (filesToUpload.length > 0) {
        const newFiles = createLocalFiles(filesToUpload)
        newFiles.forEach(f => {
          if (f.file && f.rid) {
            uploadFileToS3(f.file, f.rid, filesRef, setFiles, () => {
              addToast({ title: t('editor.toast.uploadFailed'), color: 'danger' })
            })
          }
        })
        setFiles([...filesRef.current, ...newFiles])
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [activeDraftId, setFiles, t])

  const handleDeleteFile = useCallback(
    (index: number) => {
      setFiles(currentFiles.filter((_, i) => i !== index))
    },
    [currentFiles, setFiles],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = currentFiles.findIndex(item => item.rid === active.id)
        const newIndex = currentFiles.findIndex(item => item.rid === over.id)
        setFiles(arrayMove(currentFiles, oldIndex, newIndex))
      }
    },
    [currentFiles, setFiles],
  )

  const handleImageClick = useCallback((index: number) => {
    setCurrentImage(index)
    setViewerVisible(true)
  }, [])

  if (!activeDraftId) return null
  if (currentFiles.length === 0) return null

  return (
    <>
      <div className="shrink-0 border-t px-3 py-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fileIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-2 overflow-x-auto">
              {currentFiles.map((file, index) =>
                file.rid
                  ? (
                      <SortableMedia
                        key={file.rid}
                        id={file.rid}
                        file={file}
                        index={index}
                        onDelete={handleDeleteFile}
                        onImageClick={handleImageClick}
                      />
                    )
                  : null,
              )}
              <ActionButton
                icon={ImagePlusIcon}
                text={t('editor.addImage')}
                onClick={() => fileInputRef.current?.click()}
              />
              <ActionButton
                onClick={onShowMediaLibrary}
                icon={LibraryIcon}
                text={t('tabs.mediaLibrary')}
              />
              <ActionButton
                onClick={onShowAiImage}
                icon={BotIcon}
                text={t('tabs.aiImage')}
              />
            </div>
          </SortableContext>
        </DndContext>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          multiple
          accept="image/*,video/*"
          className="hidden"
        />
      </div>
      {viewerVisible && (
        <Suspense fallback={null}>
          <Viewer
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
            images={imageFiles.map(f => ({ src: f.url, alt: f.name }))}
            activeIndex={currentImage}
          />
        </Suspense>
      )}
    </>
  )
}

// --- Drop zone hook for drag-and-drop files onto editor area ---

export function useEditorDropZone() {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const activeDraftId = useMdDraftStore(s => s.activeDraftId)
  const setFiles = useMdDraftStore(s => s.setFiles)
  const currentFiles = useMdDraftStore(s => s.currentFiles)
  const filesRef = useRef<DraftFileDataClient[]>(currentFiles)

  useEffect(() => {
    filesRef.current = currentFiles
  }, [currentFiles])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingOver(false)
      if (!activeDraftId) return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length === 0) return

      const mediaFiles = Array.from(droppedFiles).filter(
        f => f.type.startsWith('image/') || f.type.startsWith('video/'),
      )
      if (mediaFiles.length === 0) return

      const newFiles = createLocalFiles(mediaFiles)
      newFiles.forEach(f => {
        if (f.file && f.rid) {
          uploadFileToS3(f.file, f.rid, filesRef, setFiles, () => {
            addToast({ title: 'Upload failed', color: 'danger' })
          })
        }
      })
      setFiles([...filesRef.current, ...newFiles])
    },
    [activeDraftId, setFiles],
  )

  return {
    isDraggingOver,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  }
}
