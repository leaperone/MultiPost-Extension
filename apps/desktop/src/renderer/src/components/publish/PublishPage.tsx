import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Button, Card, Checkbox, Input, Textarea, Spinner, addToast } from '@heroui/react'
import { CheckCircle, XCircle, Circle, Loader2, Upload, X, Video, Image, Eye, StopCircle, ChevronDown, ChevronUp, Save, Music } from 'lucide-react'
import { useDraftAutoSave } from '../../hooks/useDraftAutoSave'
import type {
  PlatformType,
  SyncContentType,
  SyncContentData,
  DynamicData,
  VideoData,
  ArticleData,
  PodcastData,
  FileData
} from '../../../../shared/types'
import {
  CONTENT_TYPE_LABELS,
  getPlatformPublishTarget,
  getPlatformPublishTargetsByContentType,
  PLATFORMS
} from '../../../../shared/constants'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export type PublishStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface PlatformPublishState {
  platform: PlatformType
  status: PublishStatus
  message?: string
}

// Available content types
const AVAILABLE_CONTENT_TYPES: SyncContentType[] = ['DYNAMIC', 'VIDEO', 'ARTICLE', 'PODCAST']

// Platform categories for better organization
interface PlatformCategory {
  id: string
  name: string
  platforms: PlatformType[]
}

const PLATFORM_CATEGORIES: PlatformCategory[] = [
  {
    id: 'featured',
    name: '常用平台',
    platforms: ['weibo', 'xiaohongshu', 'twitter', 'douyin', 'bilibili', 'zhihu', 'wechat']
  },
  {
    id: 'china-social',
    name: '国内社交',
    platforms: [
      'xueqiu',
      'okjike',
      'kuaishou',
      'baijiahao',
      'toutiao',
      'toutiaohao',
      'weixinchannel',
      'v2ex',
      'douban',
      'dedao',
      'zsxq',
      'xiaoheihe',
      'maimai',
      'juejin'
    ]
  },
  {
    id: 'international',
    name: '国际平台',
    platforms: [
      'instagram',
      'facebook',
      'linkedin',
      'reddit',
      'threads',
      'bluesky',
      'substack',
      'pinterest',
      'webhook'
    ]
  },
  {
    id: 'video',
    name: '视频平台',
    platforms: [
      'youtube',
      'tiktok',
      'eastmoney',
      'qie',
      'chejiahao',
      'dewu',
      'yiche',
      'sohu',
      'netease',
      'dayu',
      'alipay',
      'yidian',
      'pinduoduo',
      'vivovideo',
      'iqiyi',
      'youku',
      'tencentvideo'
    ]
  },
  {
    id: 'article',
    name: '文章平台',
    platforms: [
      'csdn',
      'jianshu',
      'segmentfault',
      'sspai',
      '51cto',
      'wordpress',
      'aliyun',
      'tencentyun',
      'medium',
      'oschina',
      'infoq',
      'smzdm',
      'woshipm',
      'gelonghui',
      'jiankangjie',
      'kaidiwang',
      'autohome',
      'jianpian',
      'tonghuashun',
      'dongchedi',
      'dingduanhao',
      'kuaichuanhao'
    ]
  },
  {
    id: 'podcast',
    name: '播客平台',
    platforms: [
      'qqmusic',
      'lizhi',
      'ximalaya',
      'xiaoyuzhou',
      'qingting',
      'neteasepodcast',
      'spotify'
    ]
  }
]

interface PublishPageProps {
  onStartPublish: (
    platforms: PlatformType[],
    contentType: SyncContentType,
    data: SyncContentData,
    autoSubmit: boolean
  ) => void
  publishStates: PlatformPublishState[]
  isPublishing: boolean
  onViewPlatform?: (platform: PlatformType) => void
  onCancelPublish?: () => void
  onRetryPlatform?: (platform: PlatformType) => void
  onCancelPlatform?: (platform: PlatformType) => void
}

export function PublishPage({
  onStartPublish,
  publishStates,
  isPublishing,
  onViewPlatform,
  onCancelPublish,
  onRetryPlatform,
  onCancelPlatform
}: PublishPageProps): React.ReactElement {
  // Content type selection
  const [contentType, setContentType] = useState<SyncContentType>('DYNAMIC')

  // Dynamic content state
  const [dynamicTitle, setDynamicTitle] = useState('')
  const [dynamicContent, setDynamicContent] = useState('')

  // Video content state
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDescription, setVideoDescription] = useState('')
  const [videoTags, setVideoTags] = useState('')
  const [videoFile, setVideoFile] = useState<FileData | null>(null)
  const [videoCover, setVideoCover] = useState<FileData | null>(null)
  const [isDraggingVideo, setIsDraggingVideo] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Article content state
  const [articleTitle, setArticleTitle] = useState('')
  const [articleDigest, setArticleDigest] = useState('')
  const [articleContent, setArticleContent] = useState('')

  // Podcast content state
  const [podcastTitle, setPodcastTitle] = useState('')
  const [podcastDescription, setPodcastDescription] = useState('')
  const [podcastTags, setPodcastTags] = useState('')
  const [podcastAudio, setPodcastAudio] = useState<FileData | null>(null)
  const [podcastCover, setPodcastCover] = useState<FileData | null>(null)
  const podcastAudioInputRef = useRef<HTMLInputElement>(null)
  const podcastCoverInputRef = useRef<HTMLInputElement>(null)

  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(new Set())
  const [autoSubmit, setAutoSubmit] = useState(false)

  // Draft recovery dialog
  const [showDraftRecovery, setShowDraftRecovery] = useState(false)

  // Draft auto-save
  const draftData = useMemo(
    () => ({
      contentType,
      dynamic: { title: dynamicTitle, content: dynamicContent },
      video: { title: videoTitle, description: videoDescription, tags: videoTags },
      article: { title: articleTitle, digest: articleDigest, content: articleContent },
      podcast: { title: podcastTitle, description: podcastDescription, tags: podcastTags },
      selectedPlatforms: Array.from(selectedPlatforms)
    }),
    [
      contentType,
      dynamicTitle,
      dynamicContent,
      videoTitle,
      videoDescription,
      videoTags,
      articleTitle,
      articleDigest,
      articleContent,
      podcastTitle,
      podcastDescription,
      podcastTags,
      selectedPlatforms
    ]
  )

  const { isSaving, lastSaved, clearDraft, loadDraft } = useDraftAutoSave(draftData, {
    enabled: !isPublishing
  })

  // Check for draft on mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setShowDraftRecovery(true)
    }
  }, [loadDraft])

  // Restore draft content
  const handleRestoreDraft = useCallback(() => {
    const draft = loadDraft()
    if (draft) {
      setContentType(draft.contentType)
      setDynamicTitle(draft.dynamic.title)
      setDynamicContent(draft.dynamic.content)
      setVideoTitle(draft.video.title)
      setVideoDescription(draft.video.description)
      setVideoTags(draft.video.tags)
      setArticleTitle(draft.article.title)
      setArticleDigest(draft.article.digest)
      setArticleContent(draft.article.content)
      setPodcastTitle(draft.podcast?.title || '')
      setPodcastDescription(draft.podcast?.description || '')
      setPodcastTags(draft.podcast?.tags || '')
      setSelectedPlatforms(new Set(draft.selectedPlatforms))
      addToast({
        title: '草稿已恢复',
        description: '之前编辑的内容已恢复',
        hideIcon: true
      })
    }
    setShowDraftRecovery(false)
  }, [loadDraft])

  // Discard draft
  const handleDiscardDraft = useCallback(() => {
    clearDraft()
    setShowDraftRecovery(false)
  }, [clearDraft])

  // Progress card collapse state
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false)

  // Auto collapse progress card after publishing completes
  useEffect(() => {
    if (!isPublishing && publishStates.length > 0) {
      const allDone = publishStates.every(
        (s) => s.status === 'completed' || s.status === 'failed'
      )
      if (allDone) {
        const timer = setTimeout(() => setIsProgressCollapsed(true), 2000)
        return () => clearTimeout(timer)
      }
    }
    // Reset collapse when starting new publish
    if (isPublishing) {
      setIsProgressCollapsed(false)
    }
  }, [isPublishing, publishStates])

  // Progress summary for collapsed state
  const progressSummary = useMemo(() => {
    const completed = publishStates.filter((s) => s.status === 'completed').length
    const failed = publishStates.filter((s) => s.status === 'failed').length
    return { completed, failed, total: publishStates.length }
  }, [publishStates])

  // Filter platforms that support the selected content type
  const availablePlatforms = useMemo(() => {
    return getPlatformPublishTargetsByContentType(contentType).map((target) => target.platform)
  }, [contentType])

  // Group available platforms by category
  const categorizedPlatforms = useMemo(() => {
    return PLATFORM_CATEGORIES.map((category) => ({
      ...category,
      platforms: category.platforms.filter((platform) => availablePlatforms.includes(platform))
    })).filter((category) => category.platforms.length > 0)
  }, [availablePlatforms])

  // Select all available platforms
  const handleSelectAll = () => {
    setSelectedPlatforms(new Set(availablePlatforms))
  }

  // Clear all selected platforms
  const handleClearAll = () => {
    setSelectedPlatforms(new Set())
  }

  // Clear platforms selection when content type changes and platform doesn't support it
  const handleContentTypeChange = (type: SyncContentType) => {
    setContentType(type)
    // Keep platforms that support the new content type, track removed ones
    const newSelected = new Set<PlatformType>()
    const removedPlatforms: string[] = []
    selectedPlatforms.forEach((platform) => {
      const platformInfo = PLATFORMS[platform]
      if (getPlatformPublishTarget(platform, type)) {
        newSelected.add(platform)
      } else if (platformInfo) {
        removedPlatforms.push(platformInfo.name)
      }
    })
    setSelectedPlatforms(newSelected)

    // Show toast if some platforms were removed
    if (removedPlatforms.length > 0) {
      addToast({
        title: '已移除不兼容平台',
        description: `${removedPlatforms.join('、')} 不支持${CONTENT_TYPE_LABELS[type]}`,
        hideIcon: true
      })
    }
  }

  const handlePlatformToggle = (platform: PlatformType) => {
    const newSelected = new Set(selectedPlatforms)
    if (newSelected.has(platform)) {
      newSelected.delete(platform)
    } else {
      newSelected.add(platform)
    }
    setSelectedPlatforms(newSelected)
  }

  // Video file handling
  const handleVideoFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('video/')) {
        console.error('Not a video file')
        return
      }
      const fileData: FileData = {
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size
      }
      // Revoke old URL to prevent memory leak
      if (videoFile?.url) {
        URL.revokeObjectURL(videoFile.url)
      }
      setVideoFile(fileData)
    },
    [videoFile]
  )

  const handleVideoInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleVideoFileSelect(file)
      }
    },
    [handleVideoFileSelect]
  )

  const handleVideoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingVideo(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        handleVideoFileSelect(file)
      }
    },
    [handleVideoFileSelect]
  )

  const handleVideoDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingVideo(true)
  }, [])

  const handleVideoDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingVideo(false)
  }, [])

  const handleRemoveVideo = useCallback(() => {
    if (videoFile?.url) {
      URL.revokeObjectURL(videoFile.url)
    }
    setVideoFile(null)
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }, [videoFile])

  // Cover image handling
  const handleCoverSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        console.error('Not an image file')
        return
      }
      const fileData: FileData = {
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size
      }
      if (videoCover?.url) {
        URL.revokeObjectURL(videoCover.url)
      }
      setVideoCover(fileData)
    },
    [videoCover]
  )

  const handleCoverInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleCoverSelect(file)
      }
    },
    [handleCoverSelect]
  )

  const handleRemoveCover = useCallback(() => {
    if (videoCover?.url) {
      URL.revokeObjectURL(videoCover.url)
    }
    setVideoCover(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }, [videoCover])

  const handleSelectPodcastAudio = useCallback(async () => {
    const [filePath] = await window.api.app.selectFile({
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'] }]
    })
    if (!filePath) return
    const fileData = await window.api.app.getFileInfo(filePath)
    setPodcastAudio(fileData)
  }, [])

  const handleSelectPodcastCover = useCallback(async () => {
    const [filePath] = await window.api.app.selectFile({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    if (!filePath) return
    const fileData = await window.api.app.getFileInfo(filePath)
    setPodcastCover(fileData)
  }, [])

  const handleRemovePodcastAudio = useCallback(() => {
    setPodcastAudio(null)
    if (podcastAudioInputRef.current) {
      podcastAudioInputRef.current.value = ''
    }
  }, [])

  const handleRemovePodcastCover = useCallback(() => {
    setPodcastCover(null)
    if (podcastCoverInputRef.current) {
      podcastCoverInputRef.current.value = ''
    }
  }, [])

  const handlePublish = () => {
    if (selectedPlatforms.size === 0) return

    let data: SyncContentData

    switch (contentType) {
      case 'DYNAMIC': {
        if (!dynamicContent.trim()) return
        const dynamicData: DynamicData = {
          title: dynamicTitle.trim(),
          content: dynamicContent.trim(),
          images: [],
          videos: []
        }
        data = dynamicData
        break
      }
      case 'VIDEO': {
        if (!videoTitle.trim() || !videoFile) return
        const videoData: VideoData = {
          title: videoTitle.trim(),
          content: videoDescription.trim(),
          video: videoFile,
          cover: videoCover || undefined,
          tags: videoTags
            .split(/[,，]/)
            .map((t) => t.trim())
            .filter(Boolean)
        }
        data = videoData
        break
      }
      case 'ARTICLE': {
        if (!articleTitle.trim() || !articleContent.trim()) return
        const articleData: ArticleData = {
          title: articleTitle.trim(),
          digest: articleDigest.trim(),
          cover: { name: '', url: '' } as FileData,
          htmlContent: articleContent.trim(),
          markdownContent: articleContent.trim()
        }
        data = articleData
        break
      }
      case 'PODCAST': {
        if (!podcastTitle.trim() || !podcastAudio) return
        const podcastData: PodcastData = {
          title: podcastTitle.trim(),
          description: podcastDescription.trim(),
          audio: podcastAudio,
          cover: podcastCover || undefined,
          tags: podcastTags
            .split(/[,，]/)
            .map((t) => t.trim())
            .filter(Boolean)
        }
        data = podcastData
        break
      }
      default:
        return
    }

    // Clear draft before publishing
    clearDraft()
    onStartPublish(Array.from(selectedPlatforms), contentType, data, autoSubmit)
  }

  const isContentValid = useMemo(() => {
    switch (contentType) {
      case 'DYNAMIC':
        return dynamicContent.trim().length > 0
      case 'VIDEO':
        return videoTitle.trim().length > 0 && videoFile !== null
      case 'ARTICLE':
        return articleTitle.trim().length > 0 && articleContent.trim().length > 0
      case 'PODCAST':
        return podcastTitle.trim().length > 0 && podcastAudio !== null
      default:
        return false
    }
  }, [contentType, dynamicContent, videoTitle, videoFile, articleTitle, articleContent, podcastTitle, podcastAudio])

  const canPublish = selectedPlatforms.size > 0 && isContentValid && !isPublishing

  const getStatusIcon = (status: PublishStatus) => {
    switch (status) {
      case 'pending':
        return <Circle className="size-4 text-default-400" />
      case 'processing':
        return <Loader2 className="size-4 text-primary animate-spin" />
      case 'completed':
        return <CheckCircle className="size-4 text-success" />
      case 'failed':
        return <XCircle className="size-4 text-danger" />
      case 'cancelled':
        return <StopCircle className="size-4 text-muted-foreground" />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Draft Recovery Dialog */}
      {showDraftRecovery && (
        <Card className="p-4 shadow-none border border-primary/50 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">发现未发布的草稿</h4>
              <p className="text-xs text-muted-foreground mt-1">
                是否恢复之前编辑的内容？
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="flat" onPress={handleDiscardDraft}>
                丢弃
              </Button>
              <Button size="sm" color="primary" onPress={handleRestoreDraft}>
                恢复
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 shadow-none border">
        {/* Draft save status indicator */}
        {(isSaving || lastSaved) && !isPublishing && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
            <Save className="size-3" />
            {isSaving ? (
              <span>正在保存...</span>
            ) : lastSaved ? (
              <span>草稿已保存</span>
            ) : null}
          </div>
        )}

        {/* Content Type Selector */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium">内容类型</label>
          <div className="flex gap-2">
            {AVAILABLE_CONTENT_TYPES.map((type) => (
              <Button
                key={type}
                color={contentType === type ? 'primary' : 'default'}
                variant={contentType === type ? 'solid' : 'bordered'}
                size="sm"
                onPress={() => handleContentTypeChange(type)}
                isDisabled={isPublishing}
              >
                {CONTENT_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>

        {/* Dynamic Content Form */}
        {contentType === 'DYNAMIC' && (
          <>
            <div className="mb-5">
              <Input
                label="标题（可选）"
                placeholder="输入标题..."
                value={dynamicTitle}
                onValueChange={setDynamicTitle}
                isDisabled={isPublishing}
              />
            </div>

            <div className="mb-5">
              <Textarea
                label="内容"
                placeholder="输入要发布的内容..."
                value={dynamicContent}
                onValueChange={setDynamicContent}
                minRows={8}
                isDisabled={isPublishing}
              />
            </div>
          </>
        )}

        {/* Video Content Form */}
        {contentType === 'VIDEO' && (
          <>
            {/* Video Upload Area */}
            <div className="mb-5">
              <label className="block mb-2 text-sm font-medium">视频文件</label>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoInputChange}
                className="hidden"
                disabled={isPublishing}
              />
              {!videoFile ? (
                <div
                  onClick={() => !isPublishing && videoInputRef.current?.click()}
                  onDrop={handleVideoDrop}
                  onDragOver={handleVideoDragOver}
                  onDragLeave={handleVideoDragLeave}
                  className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDraggingVideo
                      ? 'border-primary bg-primary/5'
                      : 'border-default-300 hover:border-primary/50'
                  } ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Upload className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">
                    点击或拖拽视频文件到此处上传
                  </p>
                  <p className="text-xs text-muted-foreground">支持 MP4, MOV, AVI 等格式</p>
                </div>
              ) : (
                <div className="relative border rounded-lg overflow-hidden">
                  <video
                    src={videoFile.url}
                    controls
                    className="w-full max-h-[300px] bg-black"
                  />
                  <div className="p-3 bg-muted/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Video className="size-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{videoFile.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatFileSize(videoFile.size || 0)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      onPress={handleRemoveVideo}
                      isDisabled={isPublishing}
                      className="flex-shrink-0"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Cover Image Upload */}
            <div className="mb-5">
              <label className="block mb-2 text-sm font-medium">
                封面图片 <span className="text-muted-foreground font-normal">（可选）</span>
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverInputChange}
                className="hidden"
                disabled={isPublishing}
              />
              {!videoCover ? (
                <div
                  onClick={() => !isPublishing && coverInputRef.current?.click()}
                  className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-default-300 hover:border-primary/50 ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Image className="size-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">点击上传封面图片</span>
                </div>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={videoCover.url}
                    alt="Cover"
                    className="h-24 w-auto rounded-lg object-cover"
                  />
                  <Button
                    variant="solid"
                    size="sm"
                    isIconOnly
                    onPress={handleRemoveCover}
                    isDisabled={isPublishing}
                    className="absolute -top-2 -right-2 size-6 min-w-0 rounded-full bg-danger"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-5">
              <Input
                label="视频标题"
                placeholder="输入视频标题..."
                value={videoTitle}
                onValueChange={setVideoTitle}
                isDisabled={isPublishing}
              />
            </div>

            <div className="mb-5">
              <Textarea
                label="视频描述"
                placeholder="输入视频描述..."
                value={videoDescription}
                onValueChange={setVideoDescription}
                minRows={4}
                isDisabled={isPublishing}
              />
            </div>

            <div className="mb-5">
              <Input
                label="标签（用逗号分隔）"
                placeholder="标签1, 标签2, 标签3"
                value={videoTags}
                onValueChange={setVideoTags}
                isDisabled={isPublishing}
              />
            </div>
          </>
        )}

        {/* Article Content Form */}
        {contentType === 'ARTICLE' && (
          <>
            <div className="mb-5">
              <Input
                label="文章标题"
                placeholder="输入文章标题..."
                value={articleTitle}
                onValueChange={setArticleTitle}
                isDisabled={isPublishing}
              />
            </div>

            <div className="mb-5">
              <Textarea
                label="摘要（可选）"
                placeholder="输入文章摘要..."
                value={articleDigest}
                onValueChange={setArticleDigest}
                minRows={2}
                isDisabled={isPublishing}
              />
            </div>

            <div className="mb-5">
              <Textarea
                label="文章内容"
                placeholder="输入文章内容（支持 Markdown）..."
                value={articleContent}
                onValueChange={setArticleContent}
                minRows={12}
                classNames={{ input: 'font-mono text-sm' }}
                isDisabled={isPublishing}
              />
            </div>
          </>
        )}

        {/* Podcast Content Form */}
        {contentType === 'PODCAST' && (
          <>
            <div className="mb-5">
              <label className="block mb-2 text-sm font-medium">音频文件</label>
              <input
                ref={podcastAudioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                className="hidden"
                disabled={isPublishing}
              />
              {!podcastAudio ? (
                <div
                  onClick={() => !isPublishing && handleSelectPodcastAudio()}
                  className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-default-300 hover:border-primary/50 ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Upload className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">
                    点击选择音频文件
                  </p>
                  <p className="text-xs text-muted-foreground">支持 MP3, WAV, M4A, AAC 等格式</p>
                </div>
              ) : (
                <div className="relative border rounded-lg overflow-hidden">
                  <div className="p-4">
                    <audio src={podcastAudio.url} controls className="w-full" />
                  </div>
                  <div className="p-3 bg-muted/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="size-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{podcastAudio.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatFileSize(podcastAudio.size || 0)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      onPress={handleRemovePodcastAudio}
                      isDisabled={isPublishing}
                      className="flex-shrink-0"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block mb-2 text-sm font-medium">
                封面图片 <span className="text-muted-foreground font-normal">（可选）</span>
              </label>
              <input
                ref={podcastCoverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isPublishing}
              />
              {!podcastCover ? (
                <div
                  onClick={() => !isPublishing && handleSelectPodcastCover()}
                  className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-default-300 hover:border-primary/50 ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Image className="size-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">点击上传封面图片</span>
                </div>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={podcastCover.url}
                    alt="Cover"
                    className="h-24 w-auto rounded-lg object-cover"
                  />
                  <Button
                    variant="solid"
                    size="sm"
                    isIconOnly
                    onPress={handleRemovePodcastCover}
                    isDisabled={isPublishing}
                    className="absolute -top-2 -right-2 size-6 min-w-0 rounded-full bg-danger"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-5">
              <Input
                label="播客标题"
                placeholder="输入播客标题..."
                value={podcastTitle}
                onValueChange={setPodcastTitle}
                isDisabled={isPublishing}
              />
            </div>

            <div className="mb-5">
              <Textarea
                label="播客描述"
                placeholder="输入播客描述..."
                value={podcastDescription}
                onValueChange={setPodcastDescription}
                minRows={4}
                isDisabled={isPublishing}
              />
            </div>

            <div className="mb-5">
              <Input
                label="标签（用逗号分隔）"
                placeholder="标签1, 标签2, 标签3"
                value={podcastTags}
                onValueChange={setPodcastTags}
                isDisabled={isPublishing}
              />
            </div>
          </>
        )}

        {/* Platform Selection */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">
              发布到
              {selectedPlatforms.size > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">
                  已选 {selectedPlatforms.size} 个平台
                </span>
              )}
            </label>
            {availablePlatforms.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleSelectAll}
                  isDisabled={isPublishing || selectedPlatforms.size === availablePlatforms.length}
                >
                  全选
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleClearAll}
                  isDisabled={isPublishing || selectedPlatforms.size === 0}
                >
                  清空
                </Button>
              </div>
            )}
          </div>
          {availablePlatforms.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm bg-muted rounded-lg border border-dashed">
              当前内容类型没有可用的平台
            </div>
          ) : (
            <div className="space-y-4">
              {categorizedPlatforms.map((category) => (
                <div key={category.id}>
                  <div className="text-xs text-muted-foreground mb-2">{category.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {category.platforms.map((platform) => {
                      const platformInfo = PLATFORMS[platform]
                      const isSelected = selectedPlatforms.has(platform)
                      return (
                        <label
                          key={platform}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'bg-background hover:border-foreground/30'
                          } ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Checkbox
                            isSelected={isSelected}
                            onValueChange={() => handlePlatformToggle(platform)}
                            isDisabled={isPublishing}
                            size="sm"
                          />
                          <span className="text-sm">
                            {getPlatformPublishTarget(platform, contentType)?.name ||
                              platformInfo?.name ||
                              platform}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto Submit Toggle */}
        <div className="mb-5">
          <Checkbox
            isSelected={autoSubmit}
            onValueChange={setAutoSubmit}
            isDisabled={isPublishing}
            size="sm"
          >
            <span className="text-sm">自动发布</span>
            <span className="text-xs text-muted-foreground ml-1">
              （填充内容后自动点击发送按钮）
            </span>
          </Checkbox>
        </div>

        {/* Publish Button */}
        <Button
          color="primary"
          variant="solid"
          className="w-full"
          size="lg"
          onPress={handlePublish}
          isDisabled={!canPublish}
          isLoading={isPublishing}
          spinner={<Spinner size="sm" color="current" />}
        >
          {isPublishing ? '发布中...' : `发布${CONTENT_TYPE_LABELS[contentType]}`}
        </Button>
      </Card>

      {/* Publish Progress */}
      {publishStates.length > 0 && (
        <Card className="p-6 shadow-none border">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsProgressCollapsed(!isProgressCollapsed)}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">发布进度</h3>
              {isProgressCollapsed ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Progress summary */}
              <span className="text-sm text-muted-foreground">
                {progressSummary.completed}/{progressSummary.total} 成功
                {progressSummary.failed > 0 && (
                  <span className="text-danger ml-1">
                    , {progressSummary.failed} 失败
                  </span>
                )}
              </span>
              {/* Cancel button - only show when publishing */}
              {isPublishing && onCancelPublish && (
                // Wrapper stops the DOM click from bubbling to the collapsible header's
                // toggle (PressEvent has no stopPropagation); Button keeps onPress for cancel.
                <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="flat"
                    color="danger"
                    size="sm"
                    onPress={() => onCancelPublish()}
                    startContent={<StopCircle className="size-4" />}
                  >
                    取消
                  </Button>
                </span>
              )}
            </div>
          </div>

          {/* Collapsible content */}
          {!isProgressCollapsed && (
            <ul className="space-y-0 mt-4">
              {publishStates.map((state) => {
                const platformInfo = PLATFORMS[state.platform]
                return (
                  <li
                    key={state.platform}
                    className="flex items-center gap-3 py-3 border-b last:border-b-0"
                  >
                    <span className="flex-shrink-0">{getStatusIcon(state.status)}</span>
                    <span className="font-medium min-w-[80px]">
                      {platformInfo?.name || state.platform}
                    </span>
                    <span className="text-sm text-muted-foreground flex-1">
                      {state.message || getDefaultMessage(state.status)}
                    </span>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Cancel button - only show for pending platforms during publishing */}
                      {onCancelPlatform && state.status === 'pending' && isPublishing && (
                        <Button
                          variant="flat"
                          color="danger"
                          size="sm"
                          onPress={() => onCancelPlatform(state.platform)}
                        >
                          取消
                        </Button>
                      )}
                      {/* Retry button - show for all platforms except processing */}
                      {onRetryPlatform && state.status !== 'processing' && (
                        <Button
                          variant={state.status === 'failed' ? 'flat' : 'light'}
                          color={state.status === 'failed' ? 'primary' : 'default'}
                          size="sm"
                          onPress={() => onRetryPlatform(state.platform)}
                        >
                          重试
                        </Button>
                      )}
                      {/* View platform button */}
                      {onViewPlatform && (
                        <Button
                          variant="light"
                          size="sm"
                          isIconOnly
                          onPress={() => onViewPlatform(state.platform)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}

function getDefaultMessage(status: PublishStatus): string {
  switch (status) {
    case 'pending':
      return '等待中'
    case 'processing':
      return '正在处理...'
    case 'completed':
      return '已发布'
    case 'failed':
      return '发生错误'
    case 'cancelled':
      return '已取消'
    default:
      return ''
  }
}
