'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Textarea,
  Divider,
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
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Search,
  User,
} from 'lucide-react';
import {
  createVideoTranscription,
  getVideoTranscriptionsByIds,
  listVideoTranscriptions,
  deleteVideoTranscription,
  retryVideoTranscription,
} from '@/actions/video-transcription';
import { VideoTranscriptionStatus, type VideoExtractResult } from '@/actions/video-transcription/types';
import { useTranslation } from '@/i18n/client';

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

  const handleExtract = async () => {
    if (!videoUrl.trim()) {
      toast.error(t('videoTranscribe.toast.enterUrl'));
      return;
    }

    // Extract URL from share text
    const extractedUrl = cleanInputText(videoUrl);

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

    // Use extracted URL for task creation
    const extractedUrl = cleanInputText(videoUrl);

    try {
      setCreating(true);
      const result = await createVideoTranscription({
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
      <CardHeader className="flex gap-3">
        <Video className="size-5" />
        <div className="flex flex-col">
          <p className="text-md font-semibold">{t('videoTranscribe.create.title')}</p>
          <p className="text-small text-muted-foreground">
            {t('videoTranscribe.create.description')}
          </p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={t('videoTranscribe.create.placeholder')}
            value={videoUrl}
            onChange={(e) => {
              setVideoUrl(e.target.value);
              if (videoInfo) setVideoInfo(null);
            }}
            disabled={extracting || creating}
            variant="bordered"
            classNames={{
              inputWrapper: 'border',
            }}
          />
          <Button
            color="primary"
            variant="flat"
            isLoading={extracting}
            onPress={handleExtract}
            isDisabled={!videoUrl.trim() || creating}
            startContent={!extracting && <Search className="size-4" />}
            className="w-full shrink-0 sm:w-auto">
            {t('videoTranscribe.create.extractBtn')}
          </Button>
        </div>

        {videoInfo && (
          <div className="rounded-lg border bg-default-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              {videoInfo.coverUrl && (
                <div className="relative mx-auto size-24 shrink-0 overflow-hidden rounded-lg bg-default-200 sm:mx-0">
                  <Image
                    src={videoInfo.coverUrl}
                    alt={t('videoTranscribe.create.coverAlt')}
                    className="size-full object-cover"
                    width={96}
                    height={96}
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                {videoInfo.title && (
                  <p className="line-clamp-2 text-sm font-medium">{videoInfo.title}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {videoInfo.author && (
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {videoInfo.author}
                    </span>
                  )}
                  {videoInfo.platform && (
                    <Chip size="sm" variant="flat">
                      {videoInfo.platform}
                    </Chip>
                  )}
                  {videoInfo.duration > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDuration(videoInfo.duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                color="primary"
                isLoading={creating}
                onPress={handleCreate}
                startContent={!creating && <Plus className="size-4" />}
                className="flex-1">
                {t('videoTranscribe.create.createBtn')}
              </Button>
              <Button
                variant="flat"
                onPress={handleReset}
                isDisabled={creating}>
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
  const { t, i18n } = useTranslation('dashboard');
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

  // Status-based left border color
  const getStatusBorderClass = () => {
    switch (task.status) {
      case VideoTranscriptionStatus.PENDING:
        return 'border-l-4 border-l-warning';
      case VideoTranscriptionStatus.PROCESSING:
        return 'border-l-4 border-l-primary';
      case VideoTranscriptionStatus.COMPLETED:
        return 'border-l-4 border-l-success';
      case VideoTranscriptionStatus.FAILED:
        return 'border-l-4 border-l-danger';
      default:
        return '';
    }
  };

  return (
    <Card className={`border shadow-none transition-colors hover:bg-default-50 ${getStatusBorderClass()}`}>
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
              {new Date(task.createdAt).toLocaleString(i18n.language)}
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
            <p className="text-sm text-danger">{task.error}</p>
          </div>
        )}

        {task.status === VideoTranscriptionStatus.COMPLETED && task.transcript && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4" />
                <span className="text-sm font-medium">{t('videoTranscribe.task.result')}</span>
                <span className="text-xs text-muted-foreground">
                  ({t('videoTranscribe.task.charCount', { count: task.transcript.length })})
                </span>
              </div>
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
            <Textarea
              isReadOnly
              value={task.transcript}
              minRows={expanded ? 10 : 3}
              maxRows={expanded ? 30 : 3}
              variant="bordered"
              classNames={{
                inputWrapper: 'border',
              }}
            />
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
      const result = await listVideoTranscriptions({ limit: 50 });
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
        const result = await getVideoTranscriptionsByIds(taskIdArray);

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
      const result = await deleteVideoTranscription(deleteTaskId);
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
      const result = await retryVideoTranscription(taskId);
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
        <div>
          <h1 className="text-2xl font-bold">{t('videoTranscribe.page.title')}</h1>
          <p className="text-muted-foreground">
            {t('videoTranscribe.page.description')}
          </p>
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
