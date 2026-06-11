import { Button, Textarea, Select, SelectItem } from '@heroui/react';
import { ImageIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ImageGenerationSchema, ImageSize, Style, Color, Composition } from '../../../../../actions/draw/image/types';
import { useTranslation } from '@/i18n/client';
import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { getMessageText } from '@/lib/ai-chat';
import { parsePromptResponse } from '@/lib/ai-response-parser';

interface GenerationFormProps {
  onSubmit: (data: z.infer<typeof ImageGenerationSchema>) => Promise<void>;
  loading?: boolean;
  extraPrompt?: string;
  initPrompt?: string;
}

export function GenerationForm({ onSubmit, loading, extraPrompt, initPrompt }: GenerationFormProps) {
  const { t } = useTranslation('images');
  const form = useForm<z.infer<typeof ImageGenerationSchema>>({
    resolver: zodResolver(ImageGenerationSchema),
    defaultValues: {
      prompt: initPrompt || '',
      number: 1,
      size: ImageSize.AUTO,
      quality: 'auto',
      style: undefined,
      color: undefined,
      composition: undefined,
      extraPrompt: extraPrompt || '',
    },
  });

  // useChat for AI prompt optimization
  const {
    messages: aiMessages,
    status: aiStatus,
    sendMessage: sendAiMessage,
  } = useChat({
    transport: new DefaultChatTransport({ api: '/api/draw/image/prompt' }),
    onFinish: ({ message }) => {
      // Use ai-response-parser to extract optimized prompt from AI response
      const result = parsePromptResponse<{ prompt: string }>(getMessageText(message));
      if (result.success && result.data?.prompt) {
        setOptimizedPrompt(result.data.prompt);
      }
    },
  });
  const aiOptimizing = aiStatus === 'submitted' || aiStatus === 'streaming';
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null);

  /**
   * Trigger AI prompt optimization
   */
  const handleOptimizePrompt = () => {
    setOptimizedPrompt(null);
    const currentPrompt = extraPrompt ? `${form.getValues('prompt')} ${extraPrompt}` : form.getValues('prompt');
    void sendAiMessage({ text: currentPrompt });
  };

  /**
   * Fill optimized prompt into input
   */
  const handleFillOptimized = () => {
    if (optimizedPrompt) {
      form.setValue('prompt', optimizedPrompt);
    }
  };

  return (
    <div className="space-y-6">
      {/* 提示词输入 */}
      <div>
        <Controller
          name="prompt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Textarea
              isRequired
              label={'Prompt'}
              minRows={4}
              placeholder={t('generation_page.prompt_placeholder')}
              {...field}
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
                {getMessageText(lastAssistantMsg)}
              </div>
            ) : null;
          })()}
      </div>

      {/* 生成参数设置 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Select
          label={t('generation_page.size.label')}
          size="sm"
          defaultSelectedKeys={[form.getValues('size')]}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as typeof ImageSize.AUTO;
            form.setValue('size', key);
          }}
          isDisabled={loading}
          classNames={{
            trigger: 'bg-background border-default-200',
          }}>
          <SelectItem key={ImageSize.AUTO}>{t('generation_page.size.auto')}</SelectItem>
          <SelectItem key={ImageSize.SQUARE}>{t('generation_page.size.square')}</SelectItem>
          <SelectItem key={ImageSize.SQUARE_1080}>1080x1080</SelectItem>
          <SelectItem key={ImageSize.LANDSCAPE}>{t('generation_page.size.landscape')}</SelectItem>
          <SelectItem key={ImageSize.LANDSCAPE_1920}>1920x1080</SelectItem>
          <SelectItem key={ImageSize.PORTRAIT}>{t('generation_page.size.portrait')}</SelectItem>
          <SelectItem key={ImageSize.PORTRAIT_1080}>1080x1920</SelectItem>
        </Select>

        <Select
          label={t('generation_page.style.label')}
          size="sm"
          defaultSelectedKeys={[form.getValues('style') || '']}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as typeof Style.Anime;
            form.setValue('style', key || undefined);
          }}
          isDisabled={loading}
          classNames={{
            trigger: 'bg-background border-default-200',
          }}>
          <SelectItem key="">{t('generation_page.style.none')}</SelectItem>
          <SelectItem key={Style.Anime}>{t('generation_page.style.anime')}</SelectItem>
          <SelectItem key={Style.Cartoon}>{t('generation_page.style.cartoon')}</SelectItem>
          <SelectItem key={Style.Realistic}>{t('generation_page.style.realistic')}</SelectItem>
          <SelectItem key={Style.Vintage}>{t('generation_page.style.vintage')}</SelectItem>
        </Select>

        <Select
          label={t('generation_page.color.label')}
          size="sm"
          defaultSelectedKeys={[form.getValues('color') || '']}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as typeof Color.Neutral;
            form.setValue('color', key || undefined);
          }}
          isDisabled={loading}
          classNames={{
            trigger: 'bg-background border-default-200',
          }}>
          <SelectItem key="">{t('generation_page.color.none')}</SelectItem>
          <SelectItem key={Color.Neutral}>{t('generation_page.color.neutral')}</SelectItem>
          <SelectItem key={Color.Cold}>{t('generation_page.color.cold')}</SelectItem>
          <SelectItem key={Color.Warm}>{t('generation_page.color.warm')}</SelectItem>
          <SelectItem key={Color.Monochrome}>{t('generation_page.color.monochrome')}</SelectItem>
        </Select>

        <Select
          label={t('generation_page.composition.label')}
          size="sm"
          defaultSelectedKeys={[form.getValues('composition') || '']}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as typeof Composition.FullBody;
            form.setValue('composition', key || undefined);
          }}
          isDisabled={loading}
          classNames={{
            trigger: 'bg-background border-default-200',
          }}>
          <SelectItem key="">{t('generation_page.composition.none')}</SelectItem>
          <SelectItem key={Composition.FullBody}>{t('generation_page.composition.full_body')}</SelectItem>
          <SelectItem key={Composition.HalfBody}>{t('generation_page.composition.half_body')}</SelectItem>
          <SelectItem key={Composition.Headshot}>{t('generation_page.composition.headshot')}</SelectItem>
          <SelectItem key={Composition.CloseUp}>{t('generation_page.composition.close_up')}</SelectItem>
          <SelectItem key={Composition.Bokeh}>{t('generation_page.composition.bokeh')}</SelectItem>
        </Select>
      </div>

      {/* 生成按钮 */}
      <Button
        color="primary"
        size="lg"
        isLoading={loading}
        fullWidth
        onPress={() => {
          // Catch the form-submit promise — react-hook-form sometimes propagates
          // ZodError / runtime errors from the resolver here, which otherwise become
          // unhandled rejections that pollute Sentry (issue #253).
          form
            .handleSubmit(onSubmit)()
            .catch((error: unknown) => {
              console.warn('GenerationForm submit failed:', error);
            });
        }}
        startContent={!loading && <ImageIcon className="size-5" />}
        className="font-medium shadow-md">
        {loading ? t('generation_page.button.generating') : t('generation_page.button.generate')}
      </Button>
    </div>
  );
}
