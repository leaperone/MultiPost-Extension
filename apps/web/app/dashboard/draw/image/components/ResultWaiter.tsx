'use client';

import { Card, CardBody } from '@heroui/react';
import { useEffect, useState, useRef } from 'react';
import { checkLeaperOneStatus, completeImageGeneration, failImageGeneration } from '@/actions/draw/image';
import { ImageGenerationStatus } from '@/actions/draw/image/types';
import { useTranslation } from '@/i18n/client';

interface ResultWaiterProps {
  taskId: string;
  leaperOneId: string;
  onError: (error: string) => void;
  onStatusChange: (status: { status: string; images?: string[]; error?: string }) => void;
}

export function ResultWaiter({ taskId, leaperOneId, onError, onStatusChange }: ResultWaiterProps) {
  const { t } = useTranslation('images');
  const [waitingTime, setWaitingTime] = useState(0);
  const isPollingRef = useRef(false);
  const hasCompletedRef = useRef(false);

  // 使用 ref 存储回调函数，避免依赖变化导致 useEffect 重复执行
  const onErrorRef = useRef(onError);
  const onStatusChangeRef = useRef(onStatusChange);
  onErrorRef.current = onError;
  onStatusChangeRef.current = onStatusChange;

  // 轮询 LeaperOne 状态
  useEffect(() => {
    hasCompletedRef.current = false;
    isPollingRef.current = false;

    const pollStatus = async () => {
      if (isPollingRef.current || hasCompletedRef.current) return;
      isPollingRef.current = true;

      try {
        const response = await checkLeaperOneStatus(leaperOneId);

        if (!response.success) {
          console.error('Check status failed:', response.error);
          return;
        }

        const { status, images, error } = response.data!;

        if (status === 'pending' || status === 'processing') {
          onStatusChangeRef.current({ status: ImageGenerationStatus.PROCESSING });
        } else if (status === 'completed' && images) {
          hasCompletedRef.current = true;

          // 提取预览 URL（使用 !style=imagePreview 后缀）
          const previewUrls = images
            .map((img) => (img.url ? `${img.url}!style=imagePreview` : null))
            .filter((url): url is string => Boolean(url));

          // 保存到数据库
          await completeImageGeneration(taskId, images);

          onStatusChangeRef.current({
            status: ImageGenerationStatus.COMPLETED,
            images: previewUrls,
          });
          return;
        } else if (status === 'failed') {
          hasCompletedRef.current = true;
          const errorMessage = error || 'Unknown error';

          // 标记任务失败
          await failImageGeneration(taskId, errorMessage);

          onStatusChangeRef.current({
            status: ImageGenerationStatus.FAILED,
            error: errorMessage,
          });
          onErrorRef.current(errorMessage);
          return;
        }
      } catch (err) {
        console.error('Poll status error:', err);
      } finally {
        isPollingRef.current = false;
      }
    };

    // 立即执行一次
    pollStatus();

    // 每 5 秒轮询一次
    const intervalId = setInterval(() => {
      if (!hasCompletedRef.current) {
        pollStatus();
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [leaperOneId, taskId]);

  // 计时器：显示等待时间
  useEffect(() => {
    setWaitingTime(0);
    const timer = setInterval(() => {
      setWaitingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [taskId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

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
            <p className="text-xs text-default-300">{formatTime(waitingTime)}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
