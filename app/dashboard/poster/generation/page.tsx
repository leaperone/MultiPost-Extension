'use client';

import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Category, PosterGenerationSchema } from '../types';
import { generatePoster, getPosterGeneration } from '../action';
import { GenerationForm } from './component/GenerationForm';
import { ResultWaiter } from './component/ResultWaiter';
import { Template } from './component/Template';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';

export default function PosterGenerationPage() {
  const { t } = useTranslation('poster');
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<z.infer<typeof PosterGenerationSchema> | null>(null);
  const [category, setCategory] = useState<string>('category.social_media_generator');

  const handleGenerate = async (data: z.infer<typeof PosterGenerationSchema>) => {
    try {
      setLoading(true);

      data.category = category || 'category.social_media_generator';

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

  const handleTemplateSelect = (template: {
    prompt: string;
    width: number;
    height: number;
    model: string;
    category: string;
  }) => {
    setFormValues({
      prompt: template.prompt,
      width: template.width,
      height: template.height,
      model: template.model,
      category: template.category,
    });

    // 滚动到表单位置
    document.getElementById('generation-form')?.scrollIntoView({
      behavior: 'smooth',
    });
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
    <div className={cn('flex min-h-[80vh] w-full flex-col transition-all duration-500')}>
      {!taskId && (
        <>
          <Card
            id="generation-form"
            className="mx-auto mb-8 mt-12 w-full max-w-3xl">
            <CardHeader className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {Category.map((item) => (
                  <Button
                    key={item.name}
                    variant={category === item.name ? 'solid' : 'flat'}
                    color={category === item.name ? 'primary' : 'default'}
                    className={category === item.name ? 'font-medium' : ''}
                    onPress={() => setCategory(item.name)}>
                    {t(item.name)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <GenerationForm
                onSubmit={handleGenerate}
                loading={loading}
                initialValues={formValues}
              />
            </CardBody>
          </Card>
        </>
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

      {/* 模板选择 */}
      {!taskId && (
        <div className="mx-auto w-full max-w-7xl px-6 py-8">
          <Template
            onSelect={handleTemplateSelect}
            category={Category.find((item) => item.name === category) || Category[0]}
          />
        </div>
      )}
    </div>
  );
}
