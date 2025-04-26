'use client';

import { Button, Textarea, Select, SelectItem } from '@heroui/react';
import { ImageIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ImageGenerationSchema, ImageSize, Style, Color, Composition } from '../../types';
import { useTranslation } from '@/i18n/client';

interface GenerationFormProps {
  onSubmit: (data: z.infer<typeof ImageGenerationSchema>) => Promise<void>;
  loading?: boolean;
}

export function GenerationForm({ onSubmit, loading }: GenerationFormProps) {
  const { t } = useTranslation('images');
  const form = useForm<z.infer<typeof ImageGenerationSchema>>({
    resolver: zodResolver(ImageGenerationSchema),
    defaultValues: {
      prompt: process.env.NODE_ENV === 'development' ? '海边白发红瞳美少女' : '',
      number: 1,
      size: ImageSize.AUTO,
      quality: 'auto',
      style: undefined,
      color: undefined,
      composition: undefined,
    },
  });

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
