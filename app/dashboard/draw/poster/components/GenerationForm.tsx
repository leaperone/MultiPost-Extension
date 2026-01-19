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
import { PosterGenerationSchema, ImageSize, Category, SeedeTheme } from '@/actions/draw/poster/types';
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
      theme: initialValues?.theme || 'default',
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

  const selectedCategory = form.watch('category');

  const handleCategoryChange = (category: string) => {
    form.setValue('category', category);
  };

  return (
    <div className="space-y-6">
      {/* 类型选择 */}
      <div>
        <div className="mb-3 text-sm font-medium text-foreground">{t('generation_page.category')}</div>
        <div className="flex flex-wrap gap-2">
          {Category.map((item) => (
            <Button
              key={item.name}
              size="sm"
              variant={selectedCategory === item.name ? 'solid' : 'bordered'}
              color={selectedCategory === item.name ? 'primary' : 'default'}
              className={`transition-all ${selectedCategory === item.name ? 'font-medium shadow-sm' : 'border-default-200'}`}
              onPress={() => handleCategoryChange(item.name)}>
              {t(item.name)}
            </Button>
          ))}
        </div>
      </div>

      {/* 提示词输入 */}
      <div>
        <Controller
          name="prompt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Textarea
              {...field}
              isRequired
              label={'Prompt'}
              minRows={4}
              placeholder={t('generation_page.prompt_placeholder')}
              disabled={loading}
              isInvalid={!!fieldState.error}
              errorMessage={fieldState.error?.message}
              classNames={{
                inputWrapper: 'bg-default-50',
              }}
            />
          )}
        />

        {/* AI 优化按钮和结果 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            variant="flat"
            size="sm"
            isLoading={aiOptimizing}
            disabled={aiOptimizing || loading}
            onPress={handleOptimizePrompt}
            className="bg-default-100">
            ✨ {t('generation_page.ai_optimize_prompt')}
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
        {aiMessages.length > 0 &&
          (() => {
            const lastSix = aiMessages.slice(-6);
            const lastAssistantMsg = [...lastSix].reverse().find((m) => m.role === 'assistant');
            return lastAssistantMsg ? (
              <div className="mt-2 rounded-lg bg-default-100 p-3 text-sm text-foreground">
                {lastAssistantMsg.content}
              </div>
            ) : null;
          })()}
      </div>

      {/* 生成参数设置 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 尺寸选择 */}
        <Popover
          placement="bottom"
          isOpen={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger>
            <Button
              size="sm"
              variant="bordered"
              className="h-12 w-full justify-center border-default-200"
              disabled={loading}>
              <span className="text-sm">{`${form.getValues('width')} × ${form.getValues('height')}`}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] rounded-xl p-4 shadow-lg">
            <div className="flex flex-col gap-4">
              <Tabs
                aria-label={'size'}
                defaultSelectedKey={'social_media'}
                fullWidth
                size="sm"
                classNames={{
                  tabList: 'w-full bg-default-100 p-1 rounded-lg',
                  tab: 'rounded-md',
                  cursor: 'bg-background shadow-sm',
                  panel: 'pt-4',
                }}>
                <Tab
                  key="social_media"
                  title={t('size.social_media.label')}>
                  <div className="grid grid-cols-1 gap-2">
                    {ImageSize.filter((size) => size.category === 'size.social_media.label').map((size) => (
                      <Button
                        key={size.name}
                        size="sm"
                        variant="light"
                        className="w-full justify-between px-3 hover:bg-default-100"
                        onPress={() => setPresetSize(size)}>
                        <span>{t(size.name)}</span>
                        <span className="text-xs text-default-400">
                          {size.width}×{size.height}
                        </span>
                      </Button>
                    ))}
                  </div>
                </Tab>
                <Tab
                  key="ratio"
                  title={t('size.ratio.label')}>
                  <div className="grid grid-cols-1 gap-2">
                    {ImageSize.filter((size) => size.category === 'size.ratio.label').map((size) => (
                      <Button
                        key={size.name}
                        size="sm"
                        variant="light"
                        className="w-full justify-between px-3 hover:bg-default-100"
                        onPress={() => setPresetSize(size)}>
                        <span>{t(size.name)}</span>
                        <span className="text-xs text-default-400">
                          {size.width}×{size.height}
                        </span>
                      </Button>
                    ))}
                  </div>
                </Tab>
              </Tabs>
              <div className="border-t border-default-100 pt-4">
                <div className="mb-2 text-xs font-medium text-default-500">{t('size.custom')}</div>
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
                      />
                    )}
                  />
                  <span className="text-default-400">×</span>
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
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 配色选择 - 暂时注释 */}
        {/* <Controller
          name="theme"
          control={form.control}
          render={({ field }) => (
            <Select
              label={t('theme.label')}
              size="sm"
              selectedKeys={[field.value || 'default']}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                field.onChange(key);
              }}
              isDisabled={loading}
              classNames={{
                trigger: 'bg-background border-default-200',
              }}
              renderValue={() => {
                const selected = SeedeTheme.find((theme) => theme.value === field.value);
                if (!selected) return null;
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {selected.colors.slice(0, 4).map((color, index) => (
                        <div
                          key={index}
                          className="size-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs">{t(selected.label)}</span>
                  </div>
                );
              }}>
              {SeedeTheme.map((theme) => (
                <SelectItem
                  key={theme.value}
                  textValue={t(theme.label)}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {theme.colors.slice(0, 4).map((color, index) => (
                        <div
                          key={index}
                          className="size-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span>{t(theme.label)}</span>
                  </div>
                </SelectItem>
              ))}
            </Select>
          )}
        /> */}

        {/* 模型选择 */}
        <Controller
          name="model"
          control={form.control}
          render={({ field }) => (
            <Select
              label={t('generation_page.model.label')}
              size="sm"
              selectedKeys={[field.value]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                field.onChange(key);
              }}
              isDisabled={loading || loadingModels}
              classNames={{
                trigger: 'bg-background border-default-200',
              }}>
              {models.map((model) => (
                <SelectItem key={model}>{model}</SelectItem>
              ))}
            </Select>
          )}
        />
      </div>

      {/* 生成按钮 */}
      <Button
        color="primary"
        size="lg"
        isLoading={loading}
        fullWidth
        onPress={() => form.handleSubmit(onSubmit)()}
        startContent={!loading && <ImageIcon className="size-5" />}
        className="font-medium shadow-md">
        {loading ? t('generation_page.button.generating') : t('generation_page.button.generate')}
      </Button>
    </div>
  );
}
