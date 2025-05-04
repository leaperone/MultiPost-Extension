'use client';

import { Button, Textarea, Select, SelectItem, Image } from '@heroui/react';
import { ImageIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ImageGenerationSchema, ImageSize, Style, Color, Composition } from '../types';
import { useTranslation } from '@/i18n/client';

interface EditsFormProps {
  onSubmit: (data: z.infer<typeof ImageGenerationSchema>) => Promise<void>;
  loading?: boolean;
  images?: string[];
}

export function EditsForm({ onSubmit, loading, images = [] }: EditsFormProps) {
  const { t } = useTranslation('images');
  const form = useForm<z.infer<typeof ImageGenerationSchema>>({
    resolver: zodResolver(ImageGenerationSchema),
    defaultValues: {
      images: images,
      prompt: process.env.NODE_ENV === 'development' ? '修改图片中角色的服饰为中国传统服饰' : '',
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
      {/* 图片预览区域 */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={image}
                alt={t('result_waiter.generated_image')}
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-default-200 p-4">
          <div className="text-center">
            <ImageIcon className="mx-auto size-12 text-default-300" />
            <p className="mt-2 text-sm text-default-500">{t('generation_page.no_image')}</p>
          </div>
        </div>
      )}

      {/* 提示词输入 */}
      <Textarea
        isRequired
        isClearable
        label={'Prompt'}
        minRows={5}
        placeholder={t('generation_page.edit_prompt_placeholder')}
        {...form.register('prompt')}
        disabled={loading}
        isInvalid={!!form.formState.errors.prompt}
        errorMessage={form.formState.errors.prompt?.message}
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
        onPress={() => form.handleSubmit(onSubmit)()}
        className="w-full rounded-full shadow-lg">
        {loading ? t('generation_page.button.editing') : t('generation_page.button.edit')}
        {!loading && <ImageIcon className="ml-2 size-4" />}
      </Button>
    </div>
  );
}
