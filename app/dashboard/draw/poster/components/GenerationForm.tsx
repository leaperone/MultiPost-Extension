'use client';

import {
  Button,
  Textarea,
  Select,
  SelectItem,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tabs,
  Tab,
} from '@heroui/react';
import { ImageIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { PosterGenerationSchema, ImageSize } from '../types';
import { useTranslation } from '@/i18n/client';
import { useEffect, useState } from 'react';
import { getAvailableModels } from '../action';

interface GenerationFormProps {
  onSubmit: (data: z.infer<typeof PosterGenerationSchema>) => Promise<void>;
  loading?: boolean;
  initialValues?: z.infer<typeof PosterGenerationSchema> | null;
}

// 为 ImageSize 元素定义类型
type ImageSizeItem = (typeof ImageSize)[number];

export function GenerationForm({ onSubmit, loading, initialValues }: GenerationFormProps) {
  const { t } = useTranslation('poster');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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

  // 当initialValues变化时更新表单
  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues);
    }
  }, [initialValues, form]);

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

  // 设置预设尺寸
  const setPresetSize = (size: ImageSizeItem) => {
    form.setValue('width', size.width);
    form.setValue('height', size.height);
    setIsPopoverOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* 提示词输入 */}
      <Controller
        name="prompt"
        control={form.control}
        render={({ field, fieldState }) => (
          <Textarea
            {...field}
            isRequired
            isClearable
            label={'Prompt'}
            minRows={5}
            placeholder={t('generation_page.prompt_placeholder')}
            disabled={loading}
            isInvalid={!!fieldState.error}
            errorMessage={fieldState.error?.message}
          />
        )}
      />

      {/* 生成参数设置 */}
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex w-[240px] items-end gap-2">
          <Popover
            placement="bottom"
            isOpen={isPopoverOpen}
            onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger>
              <Button
                size="lg"
                variant="light"
                className="mb-1 bg-default-100"
                disabled={loading}>
                <span className="text-sm">{`${form.getValues('width')} × ${form.getValues('height')}`}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] rounded-lg p-3 shadow-lg">
              <div className="flex flex-col gap-3">
                <Tabs
                  aria-label={'size'}
                  defaultSelectedKey={'social_media'}
                  fullWidth
                  size="sm"
                  classNames={{
                    tabList: 'w-full justify-start bg-default-50 p-0.5 rounded-md',
                    tab: 'rounded-md data-[selected=true]:shadow-sm',
                    panel: 'pt-3',
                  }}>
                  <Tab
                    key="social_media"
                    title={
                      <div className="flex items-center gap-2 py-1">
                        <span>{t('size.social_media.label')}</span>
                      </div>
                    }>
                    <div className="grid grid-cols-1 gap-1.5">
                      {ImageSize.filter((size) => size.category === 'size.social_media.label').map((size) => (
                        <Button
                          key={size.name}
                          size="sm"
                          variant="flat"
                          className="w-full justify-between px-3 transition-colors hover:bg-default-100"
                          onPress={() => setPresetSize(size)}>
                          <span>{t(size.name)}</span>
                          <span className="text-xs text-default-500">
                            {size.width}×{size.height}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </Tab>
                  <Tab
                    key="ratio"
                    title={
                      <div className="flex items-center gap-2 py-1">
                        <span>{t('size.ratio.label')}</span>
                      </div>
                    }>
                    <div className="grid grid-cols-1 gap-1.5">
                      {ImageSize.filter((size) => size.category === 'size.ratio.label').map((size) => (
                        <Button
                          key={size.name}
                          size="sm"
                          variant="flat"
                          className="w-full justify-between px-3 transition-colors hover:bg-default-100"
                          onPress={() => setPresetSize(size)}>
                          <span>{t(size.name)}</span>
                          <span className="text-xs text-default-500">
                            {size.width}×{size.height}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </Tab>
                </Tabs>
                <div className="mt-1 flex flex-col gap-3">
                  <div className="pl-1 text-xs font-medium text-default-500">{t('size.custom')}</div>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="width"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          size="sm"
                          label={t('size.width')}
                          value={field.value.toString()}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={loading}
                          classNames={{
                            inputWrapper: 'bg-default-50',
                          }}
                        />
                      )}
                    />
                    <span className="mb-2 text-default-500">×</span>
                    <Controller
                      name="height"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          size="sm"
                          label={t('size.height')}
                          value={field.value.toString()}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={loading}
                          classNames={{
                            inputWrapper: 'bg-default-50',
                          }}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Controller
          name="model"
          control={form.control}
          render={({ field }) => (
            <Select
              label={t('generation_page.model.label')}
              size="sm"
              className="w-[240px]"
              selectedKeys={[field.value]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                field.onChange(key);
              }}
              isDisabled={loading || loadingModels}>
              {models.map((model) => (
                <SelectItem key={model}>{model}</SelectItem>
              ))}
            </Select>
          )}
        />
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
