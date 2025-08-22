'use client';

import { Card, CardBody, Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { getImageGeneration, updateImageGeneration } from '@/actions/draw/image';
import { ImageGenerationStatus } from '@/actions/draw/image/types';
import { useTranslation } from '@/i18n/client';
import { toast } from 'sonner';

interface ResultWaiterProps {
  taskId: string;
  onError: (error: string) => void;
  onStatusChange: (status: { status: string; images?: string[]; error?: string }) => void;
}

export function ResultWaiter({ taskId, onError, onStatusChange }: ResultWaiterProps) {
  const { t } = useTranslation('images');
  const [canManualUpdate, setCanManualUpdate] = useState(false);
  const [manualCooldown, setManualCooldown] = useState(0);
  const [waitingTime, setWaitingTime] = useState(0);

  // 当 taskId 变化时重置状态
  useEffect(() => {
    setCanManualUpdate(false);
    setManualCooldown(0);
    setWaitingTime(0);
  }, [taskId]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkResult = async () => {
      try {
        const response = await getImageGeneration(taskId);

        if (!response.success || !response.data) {
          throw new Error(response.error || t('result_waiter.unknown_error'));
        }

        const task = response.data;

        if (task.status === ImageGenerationStatus.PENDING || task.status === ImageGenerationStatus.PROCESSING) {
          onStatusChange({
            status: task.status,
          });
        }

        if (task.status === ImageGenerationStatus.COMPLETED && task.ImageGenerationLog) {
          const images = task.ImageGenerationLog.filter((log) => log.fileHosting?.previewUrl).map(
            (log) => log.fileHosting!.previewUrl!,
          );

          if (images.length > 0) {
            onStatusChange({
              status: ImageGenerationStatus.COMPLETED,
              images,
            });
          }
        }

        if (task.status === ImageGenerationStatus.FAILED) {
          const errorMessage = task.message || t('result_waiter.unknown_error');
          onStatusChange({
            status: ImageGenerationStatus.FAILED,
            error: errorMessage,
          });
          onError(errorMessage);
          return;
        }

        // 如果状态是完成，就不再继续查询
        if (task.status === ImageGenerationStatus.COMPLETED) {
          return;
        }

        // 如果还在处理中，则继续查询
        timeoutId = setTimeout(checkResult, 10000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('result_waiter.unknown_error');
        onStatusChange({
          status: ImageGenerationStatus.FAILED,
          error: errorMessage,
        });
        onError(errorMessage);
      }
    };

    checkResult(); // 立即执行一次

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [taskId, onError, onStatusChange, t]);

  // 计时器：用于判断等待时间
  useEffect(() => {
    setWaitingTime(0);
    const timer = setInterval(() => {
      setWaitingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 超过3分钟允许手动刷新
  useEffect(() => {
    if (waitingTime >= 180 && manualCooldown === 0) {
      setCanManualUpdate(true);
    }
  }, [waitingTime, manualCooldown]);

  // 30秒冷却倒计时
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

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardBody className="flex items-center justify-center py-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="loading loading-spinner loading-lg" />
            <div className="absolute inset-0 animate-spin">
              <div className="size-full rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-default-600">{t('result_waiter.processing')}</p>
            <p className="text-default-400">{t('result_waiter.processing_description')}</p>
            {canManualUpdate && (
              <Button
                color="primary"
                variant="bordered"
                disabled={manualCooldown > 0}
                onPress={async () => {
                  setCanManualUpdate(false);
                  setManualCooldown(30);
                  try {
                    toast.loading(t('result_waiter.manual_update_toast'));
                    const response = await updateImageGeneration(taskId);
                    toast.dismiss();

                    if (response.success) {
                      if (response.message) {
                        toast.success(response.message);
                      }
                      // 重新开始检查结果
                      setWaitingTime(0);
                    } else {
                      toast.error(response.error || t('result_waiter.manual_update_failed'));
                    }
                  } catch (e) {
                    toast.dismiss();
                    toast.error(t('result_waiter.manual_update_failed'));
                  }
                }}
                className="mt-2 w-fit self-start">
                {manualCooldown > 0
                  ? `${t('result_waiter.manual_update_cooldown', { seconds: manualCooldown })}`
                  : t('result_waiter.manual_update')}
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
