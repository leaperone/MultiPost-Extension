'use client';

import { useEffect, useState } from 'react';
import { Button, Spinner } from '@heroui/react';
import { useTranslation } from '@/i18n/client';
import { toast } from 'sonner';
import { PosterTemplate, Category } from '../../types';
import { Maximize2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

interface TemplateProps {
  onSelect: (template: { prompt: string; width: number; height: number; model: string; category: string }) => void;
  category: (typeof Category)[number];
}

export function Template({ onSelect, category }: TemplateProps) {
  const { t } = useTranslation('poster');
  const [templates, setTemplates] = useState<PosterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/seede/template?tag=${category.tag}`);
        const result = await response.json();

        if (result.success && result.data) {
          setTemplates(result.data);
        } else {
          toast.error(result.error || t('template.fetch_failed'));
        }
      } catch (error) {
        toast.error(t('template.fetch_failed'));
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [category.tag, t]);

  const handleViewImage = (index: number) => {
    setActiveIndex(index);
    setVisible(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="py-8 text-center">
        <p>{t('template.no_templates')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template, index) => (
          <div
            key={template.id}
            className="overflow-hidden rounded-lg shadow transition-shadow hover:shadow-lg">
            <div className="relative aspect-[3/4] w-full">
              <div className="group relative size-full overflow-hidden">
                <img
                  src={template.thumbnail_path}
                  alt={template.name}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* 遮罩层 */}
                <div className="absolute inset-0 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-black/60" />
                  <div className="relative z-20 flex h-full flex-col justify-between p-4">
                    {/* 顶部信息 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-white">{template.name}</h3>
                      <p className="line-clamp-3 text-sm text-white/80">{template.description}</p>
                    </div>

                    {/* 中间按钮 */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Button
                        isIconOnly
                        size="lg"
                        variant="flat"
                        className="bg-white/20 backdrop-blur-sm hover:bg-white/40"
                        onPress={() => handleViewImage(index)}>
                        <Maximize2 className="size-6 text-white" />
                      </Button>
                    </div>

                    {/* 底部尺寸信息和按钮 */}
                    <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
                      <div className="text-xs text-white/80">
                        {template.meta.size.w} × {template.meta.size.h}
                      </div>
                      <Button
                        color="primary"
                        variant="flat"
                        size="sm"
                        className="bg-white/10 backdrop-blur-sm"
                        onPress={() =>
                          onSelect({
                            prompt: template.meta.prompt,
                            width: template.meta.size.w,
                            height: template.meta.size.h,
                            model: template.meta.model,
                            category: category.name,
                          })
                        }>
                        {t('template.use_template')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Viewer
        visible={visible}
        onClose={() => setVisible(false)}
        activeIndex={activeIndex}
        zoomable={true}
        scalable={true}
        images={templates.map((template) => ({
          src: template.thumbnail_path,
          alt: template.name,
        }))}
      />
    </>
  );
}
