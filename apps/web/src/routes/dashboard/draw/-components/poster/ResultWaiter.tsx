'use client';

import { Card, CardBody, Image, Button, Skeleton } from '@heroui/react';
import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { getPosterGeneration, updatePosterGeneration } from '../../../../../actions/draw/poster';
import { PosterGenerationStatus } from '../../../../../actions/draw/poster/types';
import { Download, Pencil, Check, Clock, Palette, ImageIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Viewer = lazy(() => import('react-viewer'));

interface ResultWaiterProps {
  taskId: string;
  onError: (error: string) => void;
  prompt?: string;
}

interface TaskResult {
  status: string;
  image?: string;
  error?: string;
  step?: string;
  prompt?: string;
}

const STEP_KEYS = ['pending', 'generation', 'rendering', 'completed'] as const;
const STEP_ICONS = [Clock, Palette, ImageIcon, Check];

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

function StepProgressBar({ currentStep, t }: { currentStep: number; t: (key: string) => string }) {
  const labels = [
    t('result_waiter.step_pending'),
    t('result_waiter.step_generation_label'),
    t('result_waiter.step_rendering_label'),
    t('result_waiter.step_completed_label'),
  ];

  return (
    <div className="mx-auto flex w-full max-w-md items-start justify-center px-2">
      {STEP_KEYS.map((key, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const Icon = STEP_ICONS[index];

        return (
          <Fragment key={key}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full transition-all duration-300',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground animate-pulse',
                  !isCompleted && !isCurrent && 'bg-default-200 text-default-400',
                )}>
                {isCompleted ? <Check className="size-4" /> : <Icon className="size-4" />}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  isCompleted || isCurrent ? 'font-medium text-foreground' : 'text-default-400',
                )}>
                {labels[index]}
              </span>
            </div>
            {index < STEP_KEYS.length - 1 && (
              <div
                className={cn(
                  'mt-[15px] mx-1.5 h-0.5 w-8 shrink-0 sm:w-12 md:w-16 transition-colors duration-300',
                  index < currentStep ? 'bg-primary' : 'bg-default-200',
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function getStatusTitle(status: string, step: string | undefined, t: (key: string) => string): string {
  if (status === PosterGenerationStatus.PENDING) return t('result_waiter.status_title_pending');
  if (status === PosterGenerationStatus.PROCESSING) {
    if (step === 'rendering') return t('result_waiter.status_title_rendering');
    return t('result_waiter.status_title_generation');
  }
  return '';
}

export function ResultWaiter({ taskId, onError, prompt: promptProp }: ResultWaiterProps) {
  const { t } = useTranslation('poster');
  const [result, setResult] = useState<TaskResult | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canManualUpdate, setCanManualUpdate] = useState(false);
  const [manualCooldown, setManualCooldown] = useState(0);
  const [waitingTime, setWaitingTime] = useState(0);
  const pollCountRef = useRef(0);
  const autoUpdatedRef = useRef(false);

  useEffect(() => {
    setResult(null);
    setViewerVisible(false);
    pollCountRef.current = 0;
    autoUpdatedRef.current = false;
  }, [taskId]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkResult = async () => {
      try {
        const response = await getPosterGeneration({
          data: {
            id: taskId,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || t('result_waiter.unknown_error'));
        }

        const promptFromApi = response.data.prompt;

        if (
          response.data.status === PosterGenerationStatus.PENDING ||
          response.data.status === PosterGenerationStatus.PROCESSING
        ) {
          const urls = response.data.urls as Record<string, unknown> | null;
          const step = urls && typeof urls === 'object' ? (urls.step as string | undefined) : undefined;
          setResult({
            status: response.data.status,
            step,
            prompt: promptFromApi,
          });
        }

        if (response.data.status === PosterGenerationStatus.COMPLETED && response.data.lastImageUrl) {
          setResult({
            status: PosterGenerationStatus.COMPLETED,
            image: response.data.lastImageUrl,
            prompt: promptFromApi,
          });
        }

        if (response.data.status === PosterGenerationStatus.FAILED) {
          onError(response.data.error || t('result_waiter.unknown_error'));
          return;
        }

        if (response.data.status === PosterGenerationStatus.COMPLETED) {
          return;
        }

        pollCountRef.current += 1;
        if (pollCountRef.current >= 6 && !autoUpdatedRef.current) {
          autoUpdatedRef.current = true;
          try {
            await updatePosterGeneration({
              data: {
                id: taskId,
              },
            });
          } catch (e) {
            console.error('Auto update failed:', e);
          }
        }

        timeoutId = setTimeout(checkResult, 10000);
      } catch (error) {
        onError(error instanceof Error ? error.message : t('result_waiter.unknown_error'));
      }
    };

    checkResult();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [taskId, onError, t]);

  useEffect(() => {
    if (
      !result ||
      (result.status !== PosterGenerationStatus.PENDING && result.status !== PosterGenerationStatus.PROCESSING)
    ) {
      setWaitingTime(0);
      setCanManualUpdate(false);
      setManualCooldown(0);
      return;
    }
    setWaitingTime(0);
    const timer = setInterval(() => {
      setWaitingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [result?.status]);

  useEffect(() => {
    if (waitingTime >= 180 && manualCooldown === 0) {
      setCanManualUpdate(true);
    }
  }, [waitingTime, manualCooldown]);

  useEffect(() => {
    if (manualCooldown > 0) {
      const timer = setInterval(() => {
        setManualCooldown((prev) => {
          if (prev <= 1) {
            setCanManualUpdate(waitingTime >= 180);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [manualCooldown, waitingTime]);

  const handleDownload = async (url: string) => {
    try {
      toast.loading('Downloading...');
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
      console.error('下载失败:', error);
      toast.error('Download failed');
    }
  };

  const displayPrompt = promptProp || result?.prompt;

  // Initial loading — skeleton placeholder
  if (!result) {
    return (
      <Card className="mx-auto w-full max-w-3xl border shadow-none">
        <CardBody className="space-y-6 py-8">
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Fragment key={i}>
                <Skeleton className="size-8 rounded-full" />
                {i < 3 && <Skeleton className="h-0.5 w-8 sm:w-12 md:w-16" />}
              </Fragment>
            ))}
          </div>
          <div className="space-y-4 px-4">
            <Skeleton className="mx-auto h-6 w-48 rounded-lg" />
            <Skeleton className="mx-auto h-4 w-24 rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="mx-auto h-4 w-40 rounded-lg" />
          </div>
        </CardBody>
      </Card>
    );
  }

  // Waiting / processing state
  if (result.status === PosterGenerationStatus.PENDING || result.status === PosterGenerationStatus.PROCESSING) {
    const currentStep = getStepIndex(result.status, result.step);

    return (
      <Card className="mx-auto w-full max-w-3xl border shadow-none">
        <CardBody className="space-y-6 py-8">
          <StepProgressBar
            currentStep={currentStep}
            t={t}
          />

          <div className="space-y-4 px-4 text-center">
            <h3 className="text-lg font-semibold text-foreground">
              {getStatusTitle(result.status, result.step, t)}
            </h3>

            <div className="flex items-center justify-center gap-2 text-default-500">
              <Clock className="size-4" />
              <span className="font-mono tabular-nums">
                {t('result_waiter.elapsed_time')} {formatElapsed(waitingTime)}
              </span>
            </div>

            {displayPrompt && (
              <div className="mx-auto max-w-lg rounded-lg bg-default-100 p-3 text-left">
                <p className="mb-1 text-xs text-default-400">{t('result_waiter.your_prompt')}</p>
                <p className="line-clamp-3 text-sm text-default-600">{displayPrompt}</p>
              </div>
            )}

            <p className="text-sm text-default-400">{t('result_waiter.expected_time')}</p>

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="flat"
                size="sm"
                onPress={() => {
                  const gallery = document.getElementById('gallery');
                  if (gallery) {
                    gallery.scrollIntoView({ behavior: 'smooth' });
                  }
                }}>
                {t('result_waiter.go_to_gallery')}
              </Button>
              {canManualUpdate && (
                <Button
                  color="primary"
                  variant="bordered"
                  size="sm"
                  isDisabled={manualCooldown > 0}
                  onPress={async () => {
                    setCanManualUpdate(false);
                    setManualCooldown(30);
                    try {
                      toast.loading(t('result_waiter.manual_update_toast'));
                      await updatePosterGeneration({
                        data: {
                          id: taskId,
                        },
                      });
                      toast.dismiss();
                      window.location.reload();
                    } catch {
                      toast.dismiss();
                      toast.error(t('result_waiter.manual_update_failed'));
                    }
                  }}>
                  {manualCooldown > 0
                    ? t('result_waiter.manual_update_cooldown', { seconds: manualCooldown })
                    : t('result_waiter.manual_update')}
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Failed state
  if (result.status === PosterGenerationStatus.FAILED) {
    return (
      <Card className="mx-auto w-full max-w-3xl border shadow-none">
        <CardBody className="flex items-center justify-center py-8">
          <p className="text-danger">
            {t('result_waiter.failed')}: {result.error || t('result_waiter.unknown_error')}
          </p>
        </CardBody>
      </Card>
    );
  }

  // Completed state — image display
  return (
    <div className="space-y-4">
      <div>
        <Card
          className="col-span-1 cursor-pointer transition-transform hover:scale-[1.02]"
          isPressable
          onPress={() => {
            setActiveIndex(0);
            setViewerVisible(true);
          }}>
          <CardBody className="p-0">
            <Image
              alt={t('result_waiter.generated_image')}
              className="aspect-square w-full object-cover"
              src={result.image}
            />
          </CardBody>
        </Card>
      </div>

      {result.image && (
        <div className="flex justify-center gap-4">
          <Button
            color="primary"
            variant="flat"
            startContent={<Download className="size-4" />}
            onPress={() => handleDownload(result.image || '')}>
            {t('result_waiter.download')}
          </Button>
          <Button
            variant="flat"
            startContent={<Pencil className="size-4" />}
            onPress={() => {
              window.location.href = `/dashboard/draw/poster/${taskId}`;
            }}>
            {t('result_waiter.edit')}
          </Button>
        </div>
      )}

      {viewerVisible && (
        <Suspense fallback={null}>
          <Viewer
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
            onMaskClick={() => setViewerVisible(false)}
            images={
              result?.image
                ? [
                    {
                      src: result.image,
                      alt: t('result_waiter.generated_image'),
                    },
                  ]
                : []
            }
            activeIndex={activeIndex}
            zIndex={9999}
            noNavbar
            scalable
            downloadable
            rotatable={false}
          />
        </Suspense>
      )}
    </div>
  );
}
