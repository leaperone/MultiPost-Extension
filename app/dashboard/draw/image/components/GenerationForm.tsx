'use client';

import { Button, Textarea, Select, SelectItem, Input } from '@heroui/react';
import { ImageIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ImageGenerationSchema, ImageSize, Style, Color, Composition } from '@/actions/draw/image/types';
import { useTranslation } from '@/i18n/client';
import React, { useState } from 'react';
import { useChat } from 'ai/react';
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
    isLoading: aiOptimizing,
    append: appendAiMessage,
  } = useChat({
    api: '/api/draw/image/prompt',
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

  return (
    <div className="space-y-4">
      {/* 提示词输入 */}
      <Controller
        name="prompt"
        control={form.control}
        render={({ field, fieldState }) => (
          <Textarea
            isRequired
            label={'Prompt'}
            minRows={5}
            placeholder={t('generation_page.prompt_placeholder')}
            // Spread the field props here. This includes value, onChange, onBlur, etc.
            {...field}
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
        <Controller
          name="number"
          control={form.control}
          render={({ field }) => (
            <Input
              type="number"
              label={t('generation_page.number.label')}
              size="sm"
              className="w-[140px]"
              min="1"
              max="9"
              value={field.value.toString()}
              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
              disabled={loading}
            />
          )}
        />

        <Select
          label={t('generation_page.size.label')}
          size="sm"
          className="w-[140px]"
          defaultSelectedKeys={[form.getValues('size')]}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as typeof ImageSize.AUTO;
            form.setValue('size', key);
          }}
          disabled={loading}>
          <SelectItem key={ImageSize.AUTO}>{t('generation_page.size.auto')}</SelectItem>
          <SelectItem key={ImageSize.SQUARE}>{t('generation_page.size.square')}</SelectItem>
          <SelectItem key={ImageSize.LANDSCAPE}>{t('generation_page.size.landscape')}</SelectItem>
          <SelectItem key={ImageSize.PORTRAIT}>{t('generation_page.size.portrait')}</SelectItem>
        </Select>

        <Select
          label={t('generation_page.style.label')}
          size="sm"
          className="w-[140px]"
          defaultSelectedKeys={[form.getValues('style') || '']}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as typeof Style.Anime;
            form.setValue('style', key || undefined);
          }}
          disabled={loading}>
          <SelectItem key="">{t('generation_page.style.none')}</SelectItem>
          <SelectItem key={Style.Anime}>{t('generation_page.style.anime')}</SelectItem>
          <SelectItem key={Style.Cartoon}>{t('generation_page.style.cartoon')}</SelectItem>
          <SelectItem key={Style.Realistic}>{t('generation_page.style.realistic')}</SelectItem>
          <SelectItem key={Style.Vintage}>{t('generation_page.style.vintage')}</SelectItem>
        </Select>

        <Select
          label={t('generation_page.color.label')}
          size="sm"
          className="w-[140px]"
          defaultSelectedKeys={[form.getValues('color') || '']}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as typeof Color.Neutral;
            form.setValue('color', key || undefined);
          }}
          disabled={loading}>
          <SelectItem key="">{t('generation_page.color.none')}</SelectItem>
          <SelectItem key={Color.Neutral}>{t('generation_page.color.neutral')}</SelectItem>
          <SelectItem key={Color.Cold}>{t('generation_page.color.cold')}</SelectItem>
          <SelectItem key={Color.Warm}>{t('generation_page.color.warm')}</SelectItem>
          <SelectItem key={Color.Monochrome}>{t('generation_page.color.monochrome')}</SelectItem>
        </Select>

        <Select
          label={t('generation_page.composition.label')}
          size="sm"
          className="w-[140px]"
          defaultSelectedKeys={[form.getValues('composition') || '']}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0] as typeof Composition.FullBody;
            form.setValue('composition', key || undefined);
          }}
          disabled={loading}>
          <SelectItem key="">{t('generation_page.composition.none')}</SelectItem>
          <SelectItem key={Composition.FullBody}>{t('generation_page.composition.full_body')}</SelectItem>
          <SelectItem key={Composition.HalfBody}>{t('generation_page.composition.half_body')}</SelectItem>
          <SelectItem key={Composition.Headshot}>{t('generation_page.composition.headshot')}</SelectItem>
          <SelectItem key={Composition.CloseUp}>{t('generation_page.composition.close_up')}</SelectItem>
          <SelectItem key={Composition.Bokeh}>{t('generation_page.composition.bokeh')}</SelectItem>
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
