'use client';

import { Card, CardBody, Image, Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { getPosterGeneration } from '../action';
import { PosterGenerationStatus } from '../types';
import dynamic from 'next/dynamic';
import { Download } from 'lucide-react';
import { useTranslation } from '@/i18n/client';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

interface ResultWaiterProps {
  taskId: string;
  onError: (error: string) => void;
}

interface TaskResult {
  status: string;
  response?: string;
  image?: string;
  error?: string;
}

export function ResultWaiter({ taskId, onError }: ResultWaiterProps) {
  const { t } = useTranslation('poster');
  const [result, setResult] = useState<TaskResult | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // 当 taskId 变化时重置状态
  useEffect(() => {
    setResult(null);
    setViewerVisible(false);
  }, [taskId]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkResult = async () => {
      try {
        const response = await getPosterGeneration(taskId);

        if (!response.success || !response.data) {
          throw new Error(response.error || t('result_waiter.unknown_error'));
        }

        if (response.data.status === PosterGenerationStatus.DONE && response.data.lastImageUrl) {
          setResult({
            status: PosterGenerationStatus.DONE,
            image: response.data.lastImageUrl,
          });
        }

        if (response.data.status === PosterGenerationStatus.FAILED) {
          onError(response.data.error || t('result_waiter.unknown_error'));
          return;
        }

        // 如果状态是完成，就不再继续查询
        if (response.data.status === PosterGenerationStatus.DONE) {
          return;
        }

        // 如果还在处理中，则继续查询
        timeoutId = setTimeout(checkResult, 10000);
      } catch (error) {
        onError(error instanceof Error ? error.message : t('result_waiter.unknown_error'));
      }
    };

    checkResult(); // 立即执行一次

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [taskId, onError, t]);

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  if (!result) {
    return (
      <Card className="mx-auto w-full max-w-3xl">
        <CardBody className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="loading loading-spinner loading-lg" />
            <p className="text-default-600">{t('result_waiter.loading')}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (result.status === PosterGenerationStatus.PENDING || result.status === PosterGenerationStatus.PROCESSING) {
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
              <p className="text-default-600">
                {result.status === PosterGenerationStatus.PENDING
                  ? t('result_waiter.pending')
                  : t('result_waiter.processing')}
              </p>
              <p className="text-default-400">{t('result_waiter.processing_description')}</p>
              {result.response && (
                <p className="text-default-400">
                  <pre>{result.response}</pre>
                </p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (result.status === PosterGenerationStatus.FAILED) {
    return (
      <Card className="mx-auto w-full max-w-3xl">
        <CardBody className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-danger">
              {t('result_waiter.failed')}: {result.response || t('result_waiter.unknown_error')}
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

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

      {/* 操作按钮 */}
      {result.image && (
        <div className="flex justify-center gap-4">
          <Button
            color="primary"
            variant="flat"
            startContent={<Download className="size-4" />}
            onPress={() => handleDownload(result.image || '')}>
            {t('result_waiter.download')}
          </Button>
        </div>
      )}

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
    </div>
  );
}
