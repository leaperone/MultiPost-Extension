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
import { PosterGenerationSchema, ImageSize, Category } from '@/actions/draw/poster/types';
import { useTranslation } from '@/i18n/client';
import { useEffect, useState } from 'react';
import { getAvailableModels } from '@/actions/draw/poster';
import { useChat } from 'ai/react';
import { parsePromptResponse } from '@/lib/ai-response-parser';

interface GenerationFormProps {
  onSubmit: (data: z.infer<typeof PosterGenerationSchema>) => Promise<void>;
  loading?: boolean;
  initialValues?: z.infer<typeof PosterGenerationSchema> | null;
  extraPrompt?: string;
}

// 为 ImageSize 元素定义类型
type ImageSizeItem = (typeof ImageSize)[number];

export function GenerationForm({ onSubmit, loading, initialValues, extraPrompt }: GenerationFormProps) {
  const { t } = useTranslation('poster');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // useChat for AI prompt optimization
  const {
    messages: aiMessages,
    isLoading: aiOptimizing,
    append: appendAiMessage,
  } = useChat({
    api: '/api/draw/poster/prompt',
    initialMessages: [],
    body: {},
    onFinish: (message) => {
      // Use ai-response-parser to extract optimized prompt from AI response
      const result = parsePromptResponse<{ prompt: string }>(message.content);
      if (result.success && result.data?.prompt) {
        setOptimizedPrompt(result.data.prompt);
      }
    },
  });
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null);

  const form = useForm<z.infer<typeof PosterGenerationSchema>>({
    resolver: zodResolver(PosterGenerationSchema),
    defaultValues: {
      prompt: initialValues?.prompt || '',
      model: initialValues?.model || 'deepseek-v3',
      width: initialValues?.width || 1080,
      height: initialValues?.height || 1440,
      category: initialValues?.category || 'category.social_media_generator',
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

  // 设置预设尺寸
  const setPresetSize = (size: ImageSizeItem) => {
    form.setValue('width', size.width);
    form.setValue('height', size.height);
    setIsPopoverOpen(false);
  };

  /**
   * Trigger AI prompt optimization
   */
  const handleOptimizePrompt = () => {
    setOptimizedPrompt(null);
    const currentPrompt = extraPrompt ? `${form.getValues('prompt')} ${extraPrompt}` : form.getValues('prompt');
    appendAiMessage({ role: 'user', content: currentPrompt });
  };

  /**
   * Fill optimized prompt into input
   */
  const handleFillOptimized = () => {
    if (optimizedPrompt) {
      form.setValue('prompt', optimizedPrompt);
    }
  };

  const handleCategoryChange = (category: string) => {
    form.setValue('category', category);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {Category.map((item) => (
            <Button
              key={item.name}
              variant={form.getValues('category') === item.name ? 'solid' : 'flat'}
              color={form.getValues('category') === item.name ? 'primary' : 'default'}
              className={form.getValues('category') === item.name ? 'font-medium' : ''}
              onPress={() => handleCategoryChange(item.name)}>
              {t(item.name)}
            </Button>
          ))}
        </div>
      </div>
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

      {/* AI 优化按钮和结果展示（流式） */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            color="secondary"
            size="sm"
            isLoading={aiOptimizing}
            disabled={aiOptimizing || loading}
            onPress={handleOptimizePrompt}>
            {t('generation_page.ai_optimize_prompt')}
          </Button>
          {optimizedPrompt && (
            <Button
              color="success"
              size="sm"
              variant="flat"
              onPress={handleFillOptimized}>
              {t('generation_page.fill_to_input')}
            </Button>
          )}
        </div>
        {/* AI 优化流式消息展示 */}
        <div className="space-y-1 text-xs text-gray-700 dark:text-gray-200">
          {(() => {
            // 只保留最近 6 条消息
            const lastSix = aiMessages.slice(-6);
            // 找到最后一条 AI 生成（assistant）的消息
            const lastAssistantMsg = [...lastSix].reverse().find((m) => m.role === 'assistant');
            return lastAssistantMsg ? <div className="text-blue-600">{lastAssistantMsg.content}</div> : null;
          })()}
        </div>
      </div>

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
