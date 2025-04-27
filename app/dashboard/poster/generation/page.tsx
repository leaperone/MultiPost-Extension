'use client';

import { Card, CardBody } from '@heroui/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { PosterGenerationSchema } from '../types';
import { generatePoster, getPosterGeneration } from '../action';
import { GenerationForm } from './component/GenerationForm';
import { ResultWaiter } from './component/ResultWaiter';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';

export default function PosterGenerationPage() {
  const { t } = useTranslation('poster');
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleGenerate = async (data: z.infer<typeof PosterGenerationSchema>) => {
    try {
      setLoading(true);

      const response = await generatePoster(data);

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

  useEffect(() => {
    if (editId) {
      (async () => {
        const result = await getPosterGeneration(editId);
        if (result.success && result.data) {
          // 如果需要展示已生成的海报详情，可以在这里处理
          setTaskId(result.data.id);
        }
      })();
    }
  }, [editId]);

  return (
    <div className={cn('flex min-h-[80vh] w-full flex-col transition-all duration-500 justify-center')}>
      {!taskId && (
        <Card className="mx-auto mb-8 w-full max-w-3xl">
          <CardBody className="space-y-6">
            <GenerationForm
              onSubmit={handleGenerate}
              loading={loading}
            />
          </CardBody>
        </Card>
      )}

      {/* 生成结果展示 */}
      {taskId && (
        <div className="mx-auto w-full max-w-7xl space-y-4 px-6 py-8 animate-in fade-in slide-in-from-bottom-4">
          <ResultWaiter
            taskId={taskId}
            onError={handleError}
          />
        </div>
      )}
    </div>
  );
}
