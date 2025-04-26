'use client';

import { Card, CardBody, Tabs, Tab } from '@heroui/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { ImageGenerationSchema, ImageGenerationStatus } from '../types';
import { generateImage, getImageGeneration } from '../action';
import { GenerationForm } from './component/GenerationForm';
import { EditsForm } from './component/EditsForm';
import { ResultWaiter } from './component/ResultWaiter';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';

export default function ImageGenerationPage() {
  const { t } = useTranslation('images');
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selected, setSelected] = useState('generation');
  const [editImages, setEditImages] = useState<string[]>([]);
  const isVertical = true;

  const handleGenerate = async (data: z.infer<typeof ImageGenerationSchema>) => {
    try {
      setLoading(true);
      const response = await generateImage(data);

      if (!response.success || !response.data) {
        throw new Error(response.error);
      }

      setTaskId(response.data.id);

      toast.success(t('result_waiter.task_submitted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('result_waiter.submit_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  const handleContinueEdit = (images: string[]) => {
    setEditImages(images);
    setSelected('edits');
    setTaskId(null);
  };

  useEffect(() => {
    if (editId) {
      (async () => {
        const result = await getImageGeneration(editId);
        if (result.success && result.data) {
          if (result.data.status === ImageGenerationStatus.DONE) {
            const resultData = result.data.result as { url: string }[];
            const imageUrls = resultData.map((item) => item.url);
            handleContinueEdit(imageUrls);
          }
        }
      })();
    }
  }, [editId]);

  return (
    <div
      className={cn(
        'flex min-h-[80vh] w-full flex-col transition-all duration-500',
        !taskId && !loading ? 'justify-center' : 'justify-start',
      )}>
      <Card className="mx-auto mb-8 w-full max-w-3xl">
        <CardBody className="space-y-6">
          <div className="flex gap-4">
            <Tabs
              selectedKey={selected}
              onSelectionChange={(key) => setSelected(key as string)}
              color="primary"
              isVertical={isVertical}
              className="min-w-fit"
              classNames={{
                tabList: 'gap-2',
                cursor: 'w-full',
                tab: 'flex h-12 w-full items-center justify-start px-4',
              }}>
              <Tab
                key="generation"
                title={t('generation')}
              />
              <Tab
                key="edits"
                title={t('edit')}
              />
            </Tabs>

            <div className="flex-1">
              {selected === 'generation' && (
                <GenerationForm
                  onSubmit={handleGenerate}
                  loading={loading}
                />
              )}
              {selected === 'edits' && (
                <EditsForm
                  onSubmit={handleGenerate}
                  loading={loading}
                  images={editImages}
                />
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 生成结果展示 */}
      {taskId && (
        <div className="mx-auto w-full max-w-7xl space-y-4 px-6 py-8 animate-in fade-in slide-in-from-bottom-4">
          <ResultWaiter
            taskId={taskId}
            onError={handleError}
            onContinueEdit={handleContinueEdit}
          />
        </div>
      )}
    </div>
  );
}
