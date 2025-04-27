'use client';

import { Button, Textarea, Select, SelectItem } from '@heroui/react';
import { ImageIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PosterGenerationSchema, ImageSize } from '../../types';
import { useTranslation } from '@/i18n/client';
import { useEffect, useState } from 'react';
import { getAvailableModels } from '../../action';

interface GenerationFormProps {
  onSubmit: (data: z.infer<typeof PosterGenerationSchema>) => Promise<void>;
  loading?: boolean;
}

// 为 ImageSize 元素定义类型
type ImageSizeItem = (typeof ImageSize)[number];

export function GenerationForm({ onSubmit, loading }: GenerationFormProps) {
  const { t } = useTranslation('poster');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const form = useForm<z.infer<typeof PosterGenerationSchema>>({
    resolver: zodResolver(PosterGenerationSchema),
    defaultValues: {
      prompt:
        process.env.NODE_ENV === 'development'
          ? '内容 标题：Andrej Karpathy 的极简笔记法 可选副标题：如何用一个文件管理所有非项目笔记'
          : '',
      model: 'deepseek-v3',
      width: 1080,
      height: 1440,
    },
  });

  useEffect(() => {
    async function fetchModels() {
      setLoadingModels(true);
      try {
        const response = await getAvailableModels();
        if (response.success && response.data) {
          setModels(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoadingModels(false);
      }
    }

    fetchModels();
  }, []);

  return (
    <div className="space-y-4">
      {/* 提示词输入 */}
      <Textarea
        placeholder={t('generation_page.prompt_placeholder')}
        {...form.register('prompt')}
        disabled={loading}
        isInvalid={!!form.formState.errors.prompt}
        errorMessage={form.formState.errors.prompt?.message}
        classNames={{
          input: 'bg-white/80 backdrop-blur-sm min-h-[100px]',
          inputWrapper: 'shadow-lg',
        }}
      />

      {/* 生成参数设置 */}
      <div className="flex flex-wrap justify-between gap-2">
        <Select
          label={t('generation_page.size.label')}
          size="sm"
          className="w-[240px]"
          defaultSelectedKeys={['size.ratio.1609']}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as string;
            const selectedSize = ImageSize.find((size: ImageSizeItem) => size.name === key);
            const width = selectedSize?.width || 1080;
            const height = selectedSize?.height || 1440;
            form.setValue('width', width);
            form.setValue('height', height);
          }}
          disabled={loading}>
          {ImageSize.map((size: ImageSizeItem) => (
            <SelectItem
              key={size.name}
              textValue={`${size.width}x${size.height}`}>
              {t(size.name)} ({size.width}x{size.height})
            </SelectItem>
          ))}
        </Select>

        <Select
          label={t('generation_page.model.label')}
          size="sm"
          className="w-[240px]"
          defaultSelectedKeys={[form.getValues('model')]}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as string;
            form.setValue('model', key);
          }}
          isDisabled={loading || loadingModels}>
          {models.map((model) => (
            <SelectItem key={model}>{model}</SelectItem>
          ))}
        </Select>
      </div>

      <Button
        color="primary"
        size="lg"
        isLoading={loading}
        fullWidth
        onPress={() => form.handleSubmit(onSubmit)()}
        startContent={!loading && <ImageIcon />}>
        {loading ? t('generation_page.button.generating') : t('generation_page.button.generate')}
      </Button>
    </div>
  );
}
