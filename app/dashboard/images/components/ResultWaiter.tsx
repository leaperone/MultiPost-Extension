'use client';

import { Card, CardBody, Image, Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { getImageGeneration } from '../action';
import { ImageGenerationStatus } from '../types';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Download, Edit } from 'lucide-react';
import { useTranslation } from '@/i18n/client';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

interface ResultWaiterProps {
  taskId: string;
  onError: (error: string) => void;
  onContinueEdit?: (images: string[]) => void;
}

interface TaskResult {
  status: keyof typeof ImageGenerationStatus;
  response?: string;
  images?: { url: string }[];
  error?: string;
}

export function ResultWaiter({ taskId, onError, onContinueEdit }: ResultWaiterProps) {
  const { t } = useTranslation('images');
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
        const response = await getImageGeneration(taskId);

        if (!response.success || !response.data) {
          throw new Error(response.error || t('result_waiter.unknown_error'));
        }

        const responseJson = response.data.response as { content: string };
        const responseData = responseJson?.content;

        const status = response.data.status as keyof typeof ImageGenerationStatus;
        setResult({
          status,
          response: responseData,
          images: response.data.result as { url: string }[],
        });

        if (status === ImageGenerationStatus.FAILED) {
          onError(responseData || t('result_waiter.unknown_error'));
          return;
        }

        // 如果状态是完成，就不再继续查询
        if (status === ImageGenerationStatus.DONE) {
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

  if (result.status === ImageGenerationStatus.PENDING || result.status === ImageGenerationStatus.PROCESSING) {
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
                {result.status === ImageGenerationStatus.PENDING
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

  if (result.status === ImageGenerationStatus.FAILED) {
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
      <div
        className={cn(
          'grid gap-4',
          (result.images?.length ?? 0) === 1 && 'grid-cols-1 max-w-xl mx-auto',
          (result.images?.length ?? 0) === 2 && 'grid-cols-2 max-w-2xl mx-auto',
          (result.images?.length ?? 0) === 3 && 'sm:grid-cols-3 max-w-3xl mx-auto',
          (result.images?.length ?? 0) === 4 && 'sm:grid-cols-2 md:grid-cols-4 max-w-4xl mx-auto',
          (result.images?.length ?? 0) > 4 && 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        )}>
        {result.images?.map((image, index) => (
          <Card
            key={index}
            className="col-span-1 cursor-pointer transition-transform hover:scale-[1.02]"
            isPressable
            onPress={() => {
              setActiveIndex(index);
              setViewerVisible(true);
            }}>
            <CardBody className="p-0">
              <Image
                alt={t('result_waiter.generated_image')}
                className="aspect-square w-full object-cover"
                src={image.url}
              />
            </CardBody>
          </Card>
        ))}
      </div>

      {/* 操作按钮 */}
      {result.images && result.images.length > 0 && (
        <div className="flex justify-center gap-4">
          <Button
            color="primary"
            variant="flat"
            startContent={<Download className="size-4" />}
            onPress={() => handleDownload(result.images![0].url)}>
            {t('result_waiter.download')}
          </Button>
          <Button
            color="secondary"
            variant="flat"
            startContent={<Edit className="size-4" />}
            onPress={() => onContinueEdit?.(result.images!.map((img) => img.url))}>
            {t('result_waiter.continue_edit')}
          </Button>
        </div>
      )}

      <Viewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        onMaskClick={() => setViewerVisible(false)}
        images={
          result?.images?.map((img) => ({
            src: img.url,
            alt: t('result_waiter.generated_image'),
          })) || []
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
