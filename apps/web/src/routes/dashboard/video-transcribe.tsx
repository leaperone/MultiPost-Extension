import { useState, useEffect, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Button,
  Input,
  Card,
  CardBody,
  Chip,
  Modal,
  Progress,
  Skeleton,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react';
import { toast } from 'sonner';
import {
  Video,
  RefreshCw,
  Trash2,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
} from 'lucide-react';
import {
  createVideoTranscription,
  getVideoTranscriptionsByIds,
  listVideoTranscriptions,
  deleteVideoTranscription,
  retryVideoTranscription,
} from '../../actions/video-transcription';
import { VideoTranscriptionStatus, type VideoExtractResult } from '../../actions/video-transcription/types';
import { useTranslation } from '@/src/i18n/client';
import { useLocale } from '@/src/i18n/locale-provider';
import { routeMeta } from '../../lib/seo';

export const Route = createFileRoute('/dashboard/video-transcribe')({
  head: () => ({
    meta: routeMeta({
      title: 'Video Transcription | MultiPost',
      description: 'Extract and transcribe videos in MultiPost',
      robots: 'noindex, nofollow',
    }),
  }),
  component: VideoTranscribePage,
});

interface TranscriptionTask {
  id: string;
  videoUrl: string;
  videoId: string | null;
  platform: string | null;
  transcript: string | null;
  status: string;
  error: string | null;
  duration: number | null;
  metadata: {
    title?: string;
    author?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Clean up input text for video extraction.
 * LEAPERone API supports share text directly, so we only need basic trimming.
 */
function cleanInputText(text: string): string {
  return text.trim();
}

function CreateTaskForm({ onTaskCreated }: { onTaskCreated: () => void }) {
  const { t } = useTranslation('dashboard');
  const [videoUrl, setVideoUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoExtractResult | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return t('videoTranscribe.format.duration', { mins, secs });
  };

  const handleExtract = async (inputUrl?: string) => {
    const url = (inputUrl || videoUrl).trim();
    if (!url) {
      toast.error(t('videoTranscribe.toast.enterUrl'));
      return;
    }

    const extractedUrl = cleanInputText(url);

    try {
      setExtracting(true);
      setVideoInfo(null);

      const response = await fetch(`/api/video/extract?url=${encodeURIComponent(extractedUrl)}`);
      const result = await response.json();

      if (result.code === 0 && result.data) {
        setVideoInfo(result.data);
        toast.success(t('videoTranscribe.toast.extractSuccess'));
      } else {
        const msg = typeof result.msg === 'string' ? result.msg : t('videoTranscribe.toast.extractFailed');
        toast.error(msg);
      }
    } catch (error) {
      console.error('Extract video error:', error);
      toast.error(t('videoTranscribe.toast.extractFailed'));
    } finally {
      setExtracting(false);
    }
  };

  const handleCreate = async () => {
    if (!videoInfo) {
      toast.error(t('videoTranscribe.toast.parseFirst'));
      return;
    }

    if (videoInfo.taskId) {
      toast.success(t('videoTranscribe.toast.createSuccess'));
      setVideoUrl('');
      setVideoInfo(null);
      onTaskCreated();
      return;
    }

    // Use extracted URL for task creation
    const extractedUrl = cleanInputText(videoUrl);

    try {
      setCreating(true);
      const result = await createVideoTranscription({
        data: {
          videoUrl: extractedUrl,
          videoId: videoInfo.videoId,
          platform: videoInfo.platform,
          audioUrl: videoInfo.audioUrl,
          duration: videoInfo.duration,
          metadata: {
            title: videoInfo.title,
            author: videoInfo.author,
            authorId: videoInfo.authorId,
            coverUrl: videoInfo.coverUrl,
          },
        },
      });

      if (result.success) {
        toast.success(result.message || t('videoTranscribe.toast.createSuccess'));
        setVideoUrl('');
        setVideoInfo(null);
        onTaskCreated();
      } else {
        toast.error(result.error || t('videoTranscribe.toast.createFailed'));
      }
    } catch (error) {
      console.error('Create task error:', error);
      toast.error(t('videoTranscribe.toast.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setVideoUrl('');
    setVideoInfo(null);
  };

  return (
    <Card className="border shadow-none">
      <CardBody className="gap-4">
        {!videoInfo ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder={t('videoTranscribe.create.placeholder')}
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  if (videoInfo) setVideoInfo(null);
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text').trim();
                  if (text) {
                    setVideoUrl(text);
                    setTimeout(() => handleExtract(text), 0);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && videoUrl.trim() && !extracting) {
                    handleExtract();
                  }
                }}
                disabled={extracting}
                variant="bordered"
                classNames={{
                  inputWrapper: 'border',
                }}
              />
              <Button
                color="primary"
                variant="flat"
                isLoading={extracting}
                onPress={() => handleExtract()}
                isDisabled={!videoUrl.trim()}
                startContent={!extracting && <Search className="size-4" />}
                className="w-full shrink-0 sm:w-auto">
                {t('videoTranscribe.create.extractBtn')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['抖音', 'TikTok', 'B站', 'YouTube', '小红书', '快手', 'Instagram', 'Twitter'].map((p) => (
                <Chip key={p} size="sm" variant="flat" className="text-xs">{p}</Chip>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border bg-default-50 p-3">
            {videoInfo.coverUrl && (
              <div className="relative size-12 shrink-0 overflow-hidden rounded bg-default-200">
                <img
                  src={videoInfo.coverUrl}
                  alt=""
                  className="size-full object-cover"
                  width={48}
                  height={48}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{videoInfo.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {videoInfo.author && <span>{videoInfo.author}</span>}
                {videoInfo.transcript && (
                  <Chip size="sm" color="success" variant="flat" className="text-xs">
                    已获取 AI 字幕
                  </Chip>
                )}
                {videoInfo.platform && (
                  <Chip size="sm" variant="flat" className="text-xs">{videoInfo.platform}</Chip>
                )}
                {videoInfo.duration > 0 && <span>{formatDuration(videoInfo.duration)}</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button color="primary" size="sm" isLoading={creating} onPress={handleCreate}>
                {t('videoTranscribe.create.startBtn')}
              </Button>
              <Button size="sm" variant="flat" onPress={handleReset} isDisabled={creating}>
                {t('videoTranscribe.create.resetBtn')}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TaskCard({
  task,
  onDelete,
  onRetry,
}: {
  task: TranscriptionTask;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const getStatusChip = () => {
    switch (task.status) {
      case VideoTranscriptionStatus.PENDING:
        return (
          <Chip startContent={<Clock className="size-3" />} color="warning" variant="flat" size="sm">
            {t('videoTranscribe.status.pending')}
          </Chip>
        );
      case VideoTranscriptionStatus.PROCESSING:
        return (
          <Chip startContent={<Loader2 className="size-3 animate-spin" />} color="primary" variant="flat" size="sm">
            {t('videoTranscribe.status.processing')}
          </Chip>
        );
      case VideoTranscriptionStatus.COMPLETED:
        return (
          <Chip startContent={<CheckCircle className="size-3" />} color="success" variant="flat" size="sm">
            {t('videoTranscribe.status.completed')}
          </Chip>
        );
      case VideoTranscriptionStatus.FAILED:
        return (
          <Chip startContent={<XCircle className="size-3" />} color="danger" variant="flat" size="sm">
            {t('videoTranscribe.status.failed')}
          </Chip>
        );
      default:
        return <Chip size="sm">{task.status}</Chip>;
    }
  };

  const handleCopyTranscript = () => {
    if (task.transcript) {
      navigator.clipboard.writeText(task.transcript);
      toast.success(t('videoTranscribe.toast.copied'));
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return t('videoTranscribe.format.duration', { mins, secs });
  };

  const metadata = task.metadata as { title?: string; author?: string } | null;

  return (
    <Card className="border shadow-none">
      <CardBody className="gap-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              {getStatusChip()}
              {task.platform && (
                <Chip size="sm" variant="bordered">
                  {task.platform}
                </Chip>
              )}
              {task.duration && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(task.duration)}
                </span>
              )}
            </div>
            {metadata?.title && (
              <p className="truncate text-sm font-medium">{metadata.title}</p>
            )}
            {metadata?.author && (
              <p className="text-xs text-muted-foreground">{t('videoTranscribe.task.author')}: {metadata.author}</p>
            )}
            <p className="mt-1 truncate text-xs text-muted-foreground">{task.videoUrl}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(task.createdAt).toLocaleString(locale)}
            </p>
          </div>
          <div className="flex gap-1">
            {task.status === VideoTranscriptionStatus.FAILED && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => onRetry(task.id)}
                title={t('videoTranscribe.task.retry')}>
                <RefreshCw className="size-4" />
              </Button>
            )}
            {task.status !== VideoTranscriptionStatus.PROCESSING && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={() => onDelete(task.id)}
                title={t('videoTranscribe.task.delete')}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {task.status === VideoTranscriptionStatus.PROCESSING && (
          <Progress
            size="sm"
            isIndeterminate
            aria-label="Processing..."
            classNames={{
              indicator: 'bg-primary',
            }}
          />
        )}

        {task.status === VideoTranscriptionStatus.FAILED && task.error && (
          <div className="rounded-lg bg-danger-50 p-3 dark:bg-danger-900/20">
            <p className="line-clamp-2 text-sm text-danger">{task.error}</p>
          </div>
        )}

        {task.status === VideoTranscriptionStatus.COMPLETED && task.transcript && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('videoTranscribe.task.charCount', { count: task.transcript.length })}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="light"
                  startContent={<Copy className="size-3" />}
                  onPress={handleCopyTranscript}>
                  {t('videoTranscribe.task.copy')}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => setExpanded(!expanded)}>
                  {expanded ? t('videoTranscribe.task.collapse') : t('videoTranscribe.task.expand')}
                </Button>
              </div>
            </div>
            <p className={`whitespace-pre-line text-sm ${expanded ? '' : 'line-clamp-5'}`}>
              {task.transcript}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TaskList({
  tasks,
  loading,
  onRefresh,
  onDelete,
  onRetry,
}: {
  tasks: TranscriptionTask[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const { t } = useTranslation('dashboard');

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border shadow-none">
              <CardBody className="gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                    <Skeleton className="h-3 w-1/2 rounded-lg" />
                  </div>
                  <Skeleton className="size-8 rounded-lg" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="border shadow-none">
        <CardBody className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-full bg-default-100 p-4">
            <Video className="size-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">{t('videoTranscribe.task.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('videoTranscribe.task.emptyHint')}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('videoTranscribe.task.listTitle')} ({tasks.length})</h2>
        <Button
          size="sm"
          variant="light"
          startContent={<RefreshCw className="size-4" />}
          onPress={onRefresh}
          isLoading={loading}>
          {t('videoTranscribe.task.refresh')}
        </Button>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onDelete}
            onRetry={onRetry}
          />
        ))}
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const { t } = useTranslation('dashboard');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{t('videoTranscribe.deleteConfirm.title')}</ModalHeader>
        <ModalBody>
          <p>{t('videoTranscribe.deleteConfirm.description')}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isDeleting}>
            {t('videoTranscribe.deleteConfirm.cancel')}
          </Button>
          <Button color="danger" onPress={onConfirm} isLoading={isDeleting}>
            {t('videoTranscribe.deleteConfirm.confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function VideoTranscribePage() {
  const { t } = useTranslation('dashboard');
  const [tasks, setTasks] = useState<TranscriptionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingTaskIds, setPollingTaskIds] = useState<Set<string>>(new Set());
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const result = await listVideoTranscriptions({
        data: {
          limit: 50,
        },
      });
      if (result.success && result.data) {
        setTasks(result.data.tasks as TranscriptionTask[]);

        // Find tasks that need polling (pending or processing)
        const needsPolling = result.data.tasks
          .filter(
            (t) =>
              t.status === VideoTranscriptionStatus.PENDING ||
              t.status === VideoTranscriptionStatus.PROCESSING,
          )
          .map((t) => t.id);
        setPollingTaskIds(new Set(needsPolling));
      }
    } catch (error) {
      console.error('Fetch tasks error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for task updates using batch query
  useEffect(() => {
    if (pollingTaskIds.size === 0) return;

    const pollInterval = setInterval(async () => {
      try {
        const taskIdArray = Array.from(pollingTaskIds);
        const result = await getVideoTranscriptionsByIds({
          data: {
            taskIds: taskIdArray,
          },
        });

        if (result.success && result.data) {
          const updates = result.data as TranscriptionTask[];
          const stillPolling = updates
            .filter(
              (t) =>
                t.status === VideoTranscriptionStatus.PENDING ||
                t.status === VideoTranscriptionStatus.PROCESSING,
            )
            .map((t) => t.id);

          // Update tasks with polled data
          if (updates.length > 0) {
            setTasks((prev) =>
              prev.map((task) => {
                const updated = updates.find((u) => u.id === task.id);
                return updated || task;
              }),
            );
          }

          setPollingTaskIds(new Set(stillPolling));
        }
      } catch (error) {
        console.error('Poll tasks error:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [pollingTaskIds]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskCreated = () => {
    fetchTasks();
  };

  const handleDeleteClick = (taskId: string) => {
    setDeleteTaskId(taskId);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTaskId) return;

    try {
      setIsDeleting(true);
      const result = await deleteVideoTranscription({
        data: {
          taskId: deleteTaskId,
        },
      });
      if (result.success) {
        toast.success(result.message || t('videoTranscribe.toast.deleteSuccess'));
        setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
        onClose();
      } else {
        toast.error(result.error || t('videoTranscribe.toast.deleteFailed'));
      }
    } catch (error) {
      console.error('Delete task error:', error);
      toast.error(t('videoTranscribe.toast.deleteFailed'));
    } finally {
      setIsDeleting(false);
      setDeleteTaskId(null);
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      const result = await retryVideoTranscription({
        data: {
          taskId,
        },
      });
      if (result.success) {
        toast.success(result.message || t('videoTranscribe.toast.retrySuccess'));
        fetchTasks();
      } else {
        toast.error(result.error || t('videoTranscribe.toast.retryFailed'));
      }
    } catch (error) {
      console.error('Retry task error:', error);
      toast.error(t('videoTranscribe.toast.retryFailed'));
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">{t('videoTranscribe.page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('videoTranscribe.page.description')}</p>
        </div>

        <CreateTaskForm onTaskCreated={handleTaskCreated} />

        <TaskList
          tasks={tasks}
          loading={loading}
          onRefresh={fetchTasks}
          onDelete={handleDeleteClick}
          onRetry={handleRetry}
        />
      </div>

      <DeleteConfirmModal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
