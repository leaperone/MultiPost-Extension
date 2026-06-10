import { Card, CardBody, Tabs, Tab, Image, Skeleton, Divider, Button } from '@heroui/react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { PosterGenerationSchema, PosterGenerationStatus } from '../../../actions/draw/poster/types';
import {
  generatePoster,
  getPosterGeneration,
  getPosterGenerations,
  updatePosterGeneration,
} from '../../../actions/draw/poster';
import { GenerationForm } from './-components/poster/GenerationForm';
import { useTranslation } from '@/i18n/client';
import { useLocale } from '@/i18n/locale-provider';
import { ImageIcon, Download, Calendar, Maximize2, RefreshCcw, Pencil, X, Clock, Eye } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { routeMeta } from '../../../lib/seo';

interface PosterSearch {
  editId?: string;
}

export const Route = createFileRoute('/dashboard/draw/poster')({
  validateSearch: (search): PosterSearch => ({
    editId: typeof search.editId === 'string' ? search.editId : undefined,
  }),
  head: () => ({
    meta: routeMeta({
      title: 'Poster Generation | MultiPost',
      description: 'Generate posters in MultiPost',
      robots: 'noindex, nofollow',
    }),
  }),
  component: PosterPage,
});

const Viewer = lazy(() => import('react-viewer'));

// --- Active task types & helpers ---

interface ActiveTask {
  id: string;
  prompt: string;
  status: string;
  step?: string;
  image?: string;
  error?: string;
  createdAt: number; // timestamp ms
}

const STEP_KEYS = ['pending', 'generation', 'rendering', 'completed'] as const;

function getStepIndex(status: string, step?: string): number {
  if (status === PosterGenerationStatus.PENDING) return 0;
  if (status === PosterGenerationStatus.PROCESSING) {
    if (step === 'rendering') return 2;
    return 1;
  }
  if (status === PosterGenerationStatus.COMPLETED) return 3;
  return 0;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// --- Mini step dots ---

function MiniStepDots({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEP_KEYS.map((_, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <div
            key={index}
            className="flex items-center gap-1">
            <div
              className={cn(
                'size-2 rounded-full transition-all',
                isCompleted && 'bg-primary',
                isCurrent && 'bg-primary animate-pulse',
                !isCompleted && !isCurrent && 'bg-default-300',
              )}
            />
            {index < STEP_KEYS.length - 1 && (
              <div className={cn('h-px w-3', index < currentStep ? 'bg-primary' : 'bg-default-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Active task card ---

function ActiveTaskCard({
  task,
  onRemove,
  t,
}: {
  task: ActiveTask;
  onRemove: (id: string) => void;
  t: (key: string) => string;
}) {
  const isPending = task.status === PosterGenerationStatus.PENDING || task.status === PosterGenerationStatus.PROCESSING;
  const isCompleted = task.status === PosterGenerationStatus.COMPLETED;
  const isFailed = task.status === PosterGenerationStatus.FAILED;
  const [elapsed, setElapsed] = useState(() =>
    isPending ? Math.floor((Date.now() - task.createdAt) / 1000) : 0,
  );

  useEffect(() => {
    if (!isPending) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - task.createdAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPending, task.createdAt]);

  const currentStep = getStepIndex(task.status, task.step);

  return (
    <Card className="border shadow-none">
      <CardBody className="flex flex-row gap-4 p-3">
        {/* Left: square thumbnail */}
        <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-default-100">
          {isCompleted && task.image ? (
            <Image
              src={task.image}
              alt={task.prompt}
              className="size-full object-cover"
              width={80}
              height={80}
              radius="none"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              {isFailed ? (
                <X className="size-5 text-danger" />
              ) : (
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
          )}
        </div>

        {/* Right: details + actions */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm text-foreground">{task.prompt}</p>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="shrink-0"
                onPress={() => onRemove(task.id)}>
                <X className="size-3.5" />
              </Button>
            </div>

            {isPending && (
              <div className="flex items-center gap-2 text-xs text-default-400">
                <MiniStepDots currentStep={currentStep} />
                <span className="text-default-300">·</span>
                <Clock className="size-3" />
                <span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
                <span className="text-default-300">·</span>
                <span>
                  {task.status === PosterGenerationStatus.PENDING
                    ? t('result_waiter.step_pending')
                    : task.step === 'rendering'
                      ? t('result_waiter.step_rendering')
                      : t('result_waiter.step_generation')}
                </span>
              </div>
            )}

            {isFailed && (
              <p className="text-xs text-danger">{task.error || t('result_waiter.unknown_error')}</p>
            )}
          </div>

          {isCompleted && (
            <div className="flex gap-2 pt-1">
              <Link
                to="/dashboard/draw/poster/$id"
                params={{ id: task.id }}>
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<Eye className="size-4" />}>
                  {t('active_tasks.view')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// 生成海报部分
function PosterGenerationSection() {
  const { t } = useTranslation('poster');
  const { editId } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const autoUpdatedRef = useRef<Set<string>>(new Set());

  const handleGenerate = async (data: z.infer<typeof PosterGenerationSchema>) => {
    try {
      setLoading(true);
      data.category = data.category || 'category.social_media_generator';
      const response = await generatePoster({ data });
      if (!response.success || !response.data) {
        throw new Error(response.error);
      }
      setActiveTasks((prev) => [
        {
          id: response.data!.id,
          prompt: data.prompt,
          status: PosterGenerationStatus.PENDING,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
      toast.success(t('result_waiter.task_submitted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('result_waiter.submit_failed'));
    } finally {
      setLoading(false);
    }
  };

  const removeTask = useCallback((id: string) => {
    setActiveTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  // Restore editId as an active task
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const result = await getPosterGeneration({
        data: {
          id: editId,
        },
      });
      if (result.success && result.data) {
        setActiveTasks((prev) => {
          if (prev.some((t) => t.id === editId)) return prev;
          return [
            {
              id: result.data!.id,
              prompt: result.data!.prompt,
              status: result.data!.status,
              image: result.data!.lastImageUrl || undefined,
              error: result.data!.error || undefined,
              createdAt: new Date(result.data!.createdAt).getTime(),
            },
            ...prev,
          ];
        });
      }
    })();
  }, [editId]);

  // Keep a ref in sync with activeTasks for polling
  const activeTasksRef = useRef(activeTasks);
  useEffect(() => {
    activeTasksRef.current = activeTasks;
  }, [activeTasks]);

  // Poll active tasks every 10s (runs once, reads from ref)
  useEffect(() => {
    const poll = async () => {
      const pendingTasks = activeTasksRef.current.filter(
        (t) => t.status === PosterGenerationStatus.PENDING || t.status === PosterGenerationStatus.PROCESSING,
      );
      if (pendingTasks.length === 0) return;

      for (const task of pendingTasks) {
        try {
          // Auto-update after 60s
          const elapsed = (Date.now() - task.createdAt) / 1000;
          if (elapsed >= 60 && !autoUpdatedRef.current.has(task.id)) {
            autoUpdatedRef.current.add(task.id);
            await updatePosterGeneration({
              data: {
                id: task.id,
              },
            });
          }

          const response = await getPosterGeneration({
            data: {
              id: task.id,
            },
          });
          if (!response.success || !response.data) continue;

          const data = response.data;
          const urls = data.urls as Record<string, unknown> | null;
          const step = urls && typeof urls === 'object' ? (urls.step as string | undefined) : undefined;

          setActiveTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: data.status,
                    step,
                    image: data.lastImageUrl || undefined,
                    error: data.error || undefined,
                  }
                : t,
            ),
          );
        } catch {
          // Silently continue polling other tasks
        }
      }
    };

    const intervalId = setInterval(poll, 10000);
    poll();

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex w-full flex-col">
      <Card
        id="generation-form"
        className="mx-auto mb-8 w-full max-w-3xl">
        <CardBody className="space-y-6">
          <GenerationForm
            onSubmit={handleGenerate}
            loading={loading}
          />
        </CardBody>
      </Card>

      {activeTasks.length > 0 && (
        <div className="mx-auto mb-8 w-full max-w-3xl space-y-4">
          <h3 className="text-sm font-medium text-foreground">{t('active_tasks.title')}</h3>
          <div className="flex flex-col gap-3">
            {activeTasks.map((task) => (
              <ActiveTaskCard
                key={task.id}
                task={task}
                onRemove={removeTask}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// gallery 部分
interface PosterGeneration {
  id: string;
  prompt: string;
  status: string;
  error?: string | null;
  lastImageUrl?: string | null;
  createdAt: string;
}

function GallerySection() {
  const { t } = useTranslation('poster');
  const locale = useLocale();
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    [locale],
  );
  const STATUS_TABS = [
    { key: 'all', label: t('gallery_page.tabs.all') },
    { key: PosterGenerationStatus.COMPLETED, label: t('gallery_page.tabs.done') },
    { key: PosterGenerationStatus.PENDING, label: t('gallery_page.tabs.pending') },
    { key: PosterGenerationStatus.PROCESSING, label: t('gallery_page.tabs.processing') },
    { key: PosterGenerationStatus.FAILED, label: t('gallery_page.tabs.failed') },
  ] as const;
  type StatusType = (typeof STATUS_TABS)[number]['key'];
  const [posters, setPosters] = useState<PosterGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(PosterGenerationStatus.COMPLETED);

  const getImageUrls = (poster: PosterGeneration) => {
    if (!poster.lastImageUrl) return [];
    if (typeof poster.lastImageUrl === 'string') {
      return [poster.lastImageUrl];
    }
    if (Array.isArray(poster.lastImageUrl)) {
      return poster.lastImageUrl;
    }
    return [];
  };

  const viewerImages = useMemo(() => {
    return posters
      .filter((poster) => poster.status === PosterGenerationStatus.COMPLETED && poster.lastImageUrl)
      .flatMap((poster) => {
        const imageUrls = getImageUrls(poster);
        return imageUrls.map((url) => ({
          src: url,
          alt: poster.prompt,
          downloadUrl: url,
          description: `${dateFormatter.format(new Date(poster.createdAt))}\n${poster.prompt}`,
        }));
      });
  }, [posters, dateFormatter]);

  const fetchPosters = useCallback(async (status: string) => {
    try {
      setLoading(true);
      const response = await getPosterGenerations({
        data: {
          status,
        },
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      if (response.data) {
        const results = response.data.map(
          (item: {
            id: string;
            prompt: string;
            status: string;
            error?: string | null;
            lastImageUrl?: string | null;
            createdAt: Date;
          }) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          }),
        );
        setPosters(results);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('gallery_page.get_image_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPosters(selectedStatus);
  }, [fetchPosters, selectedStatus]);

  const handleImageClick = (index: number) => {
    let actualIndex = 0;
    let count = 0;
    for (const poster of posters) {
      if (poster.status === PosterGenerationStatus.COMPLETED && poster.lastImageUrl) {
        const imageUrls = getImageUrls(poster);
        if (count === index) {
          actualIndex = count;
          break;
        }
        count += imageUrls.length;
      }
    }
    setActiveIndex(actualIndex);
    setVisible(true);
  };

  const handleDownload = async (url: string) => {
    try {
      toast.loading(t('gallery_page.download.loading'));
      const response = await fetch(`/api/proxy/image?url=${encodeURIComponent(url)}`);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = `poster-${new Date().getTime()}.webp`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.dismiss();
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(t('gallery_page.download.failed'));
    }
  };

  const getStatusDisplay = (poster: PosterGeneration) => {
    switch (poster.status) {
      case PosterGenerationStatus.PENDING:
        return t('result_waiter.pending');
      case PosterGenerationStatus.PROCESSING:
        return t('result_waiter.processing');
      case PosterGenerationStatus.FAILED:
        return `${t('result_waiter.failed')}: ${poster.error || t('result_waiter.unknown_error')}`;
      default:
        return t('result_waiter.loading');
    }
  };

  return (
    <div>
      <div className="flex w-full flex-col">
        <Tabs
          selectedKey={selectedStatus}
          onSelectionChange={(key) => setSelectedStatus(key as StatusType)}
          variant="underlined"
          classNames={{
            tabList: 'gap-6',
            cursor: 'w-full bg-primary',
          }}>
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.key}
              title={
                <div className="flex items-center gap-2">
                  <span>{tab.label}</span>
                </div>
              }
            />
          ))}
        </Tabs>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3 pt-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-lg bg-default-50 p-3">
              <Skeleton className="size-20 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-3 w-1/2 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : posters.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <ImageIcon className="size-12 text-default-300" />
          <p className="text-default-600">{t('gallery_page.empty.title')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-4">
          {posters.map((poster, index) => (
            <Card
              key={poster.id}
              className="border shadow-none">
              <CardBody className="flex flex-row gap-4 p-3">
                {/* Left: square thumbnail */}
                <div
                  className="size-20 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-default-100"
                  onClick={() => {
                    if (poster.status === PosterGenerationStatus.COMPLETED && poster.lastImageUrl) {
                      handleImageClick(index);
                    }
                  }}>
                  {poster.status === PosterGenerationStatus.COMPLETED && poster.lastImageUrl ? (
                    <Image
                      src={poster.lastImageUrl}
                      alt={poster.prompt}
                      className="size-full object-cover"
                      width={80}
                      height={80}
                      radius="none"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      {poster.status === PosterGenerationStatus.FAILED ? (
                        <X className="size-5 text-danger" />
                      ) : (
                        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                    </div>
                  )}
                </div>

                {/* Right: details + actions */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="space-y-1">
                    <p className="line-clamp-2 text-sm text-foreground">{poster.prompt}</p>
                    <div className="flex items-center gap-2 text-xs text-default-400">
                      <Calendar className="size-3" />
                      <span>{dateFormatter.format(new Date(poster.createdAt))}</span>
                      {poster.status !== PosterGenerationStatus.COMPLETED && (
                        <>
                          <span className="text-default-300">·</span>
                          <span
                            className={cn(
                              poster.status === PosterGenerationStatus.FAILED ? 'text-danger' : 'text-default-400',
                            )}>
                            {getStatusDisplay(poster)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {poster.status === PosterGenerationStatus.COMPLETED && (
                      <>
                        <Link
                          to="/dashboard/draw/poster/$id"
                          params={{ id: poster.id }}>
                          <Button
                            size="sm"
                            variant="flat"
                            startContent={<Pencil className="size-3.5" />}>
                            {t('result_waiter.edit')}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<Download className="size-3.5" />}
                          onPress={() => handleDownload(poster.lastImageUrl || '')}>
                          {t('result_waiter.download')}
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<Maximize2 className="size-3.5" />}
                          onPress={() => handleImageClick(index)}>
                          {t('active_tasks.view')}
                        </Button>
                      </>
                    )}
                    {(poster.status === PosterGenerationStatus.PENDING ||
                      poster.status === PosterGenerationStatus.PROCESSING) &&
                      new Date(poster.createdAt).getTime() + 1000 * 60 * 5 < Date.now() && (
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<RefreshCcw className="size-3.5" />}
                          onPress={async () => {
                            toast.loading(t('result_waiter.manual_update_toast'));
                            const response = await updatePosterGeneration({
                              data: {
                                id: poster.id,
                              },
                            });
                            if (!response.success || !response.data) {
                              toast.dismiss();
                              toast.error(response.error);
                              return;
                            }
                            toast.dismiss();
                            window.location.reload();
                          }}>
                          {t('result_waiter.manual_update')}
                        </Button>
                      )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      {visible && (
        <Suspense fallback={null}>
          <Viewer
            visible={visible}
            onClose={() => setVisible(false)}
            images={viewerImages}
            activeIndex={activeIndex}
            onMaskClick={() => setVisible(false)}
            downloadable
            downloadInNewWindow
            noNavbar={false}
            zoomable
            rotatable
            scalable
            noImgDetails={false}
            showTotal
          />
        </Suspense>
      )}
    </div>
  );
}

function PosterPage() {
  return (
    <div className="space-y-4 p-8">
      <PosterGenerationSection />
      <Divider className="my-4" />
      <div id="gallery">
        <GallerySection />
      </div>
    </div>
  );
}
