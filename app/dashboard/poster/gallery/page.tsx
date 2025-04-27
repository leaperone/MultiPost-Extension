'use client';

import { Button, Skeleton, Tabs, Tab, Link } from '@heroui/react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ImageIcon, Download, Calendar, Maximize2, Edit } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getPosterGenerations } from '../action';
import { PosterGenerationStatus } from '../types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/client';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

interface PosterGeneration {
  id: string;
  prompt: string;
  status: string;
  error?: string | null;
  lastImageUrl?: string | null;
  createdAt: string;
}

export default function GalleryPage() {
  const { t, i18n } = useTranslation('poster');

  // 创建日期格式化函数
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    [i18n.language],
  );

  const STATUS_TABS = [
    { key: 'all', label: t('gallery_page.tabs.all') },
    { key: PosterGenerationStatus.DONE, label: t('gallery_page.tabs.done') },
    { key: PosterGenerationStatus.PENDING, label: t('gallery_page.tabs.pending') },
    { key: PosterGenerationStatus.PROCESSING, label: t('gallery_page.tabs.processing') },
    { key: PosterGenerationStatus.FAILED, label: t('gallery_page.tabs.failed') },
  ] as const;

  type StatusType = (typeof STATUS_TABS)[number]['key'];
  const [posters, setPosters] = useState<PosterGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(PosterGenerationStatus.DONE);

  // 处理图片URL
  const getImageUrls = (poster: PosterGeneration) => {
    if (!poster.lastImageUrl) return [];

    if (typeof poster.lastImageUrl === 'string') {
      return [poster.lastImageUrl];
    }

    if (Array.isArray(poster.lastImageUrl)) {
      return poster.lastImageUrl;
    }

    return [];
  };

  // 计算所有可以查看的图片
  const viewerImages = useMemo(() => {
    return posters
      .filter((poster) => poster.status === PosterGenerationStatus.DONE && poster.lastImageUrl)
      .flatMap((poster) => {
        const imageUrls = getImageUrls(poster);
        return imageUrls.map((url) => ({
          src: url,
          alt: poster.prompt,
          downloadUrl: url,
          description: `${dateFormatter.format(new Date(poster.createdAt))}\n${poster.prompt}`,
        }));
      });
  }, [posters, dateFormatter]);

  const fetchPosters = async (status: string) => {
    try {
      setLoading(true);
      const response = await getPosterGenerations(status);
      if (!response.success) {
        throw new Error(response.error);
      }
      if (response.data) {
        const results = response.data.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        }));
        setPosters(results);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('gallery_page.get_image_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosters(selectedStatus);
  }, [selectedStatus]);

  const handleImageClick = (index: number) => {
    // 计算在所有图片中的实际索引
    let actualIndex = 0;
    let count = 0;

    for (const poster of posters) {
      if (poster.status === PosterGenerationStatus.DONE && poster.lastImageUrl) {
        const imageUrls = getImageUrls(poster);
        if (count === index) {
          actualIndex = count;
          break;
        }
        count += imageUrls.length;
      }
    }

    setActiveIndex(actualIndex);
    setVisible(true);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const getStatusDisplay = (poster: PosterGeneration) => {
    switch (poster.status) {
      case PosterGenerationStatus.PENDING:
        return t('result_waiter.pending');
      case PosterGenerationStatus.PROCESSING:
        return t('result_waiter.processing');
      case PosterGenerationStatus.FAILED:
        return `${t('result_waiter.failed')}: ${poster.error || t('result_waiter.unknown_error')}`;
      default:
        return t('result_waiter.loading');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('gallery_page.title')}</h1>
        <div className="flex items-center gap-2">
          <Button
            as="a"
            href="/dashboard/poster/generation"
            color="primary">
            {t('gallery_page.new_image')}
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-col">
        <Tabs
          selectedKey={selectedStatus}
          onSelectionChange={(key) => setSelectedStatus(key as StatusType)}
          variant="underlined"
          classNames={{
            tabList: 'gap-6',
            cursor: 'w-full bg-primary',
          }}>
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.key}
              title={
                <div className="flex items-center gap-2">
                  <span>{tab.label}</span>
                </div>
              }
            />
          ))}
        </Tabs>
      </div>

      {loading ? (
        <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg bg-default-50">
              <Skeleton className="aspect-square w-full" />
            </div>
          ))}
        </div>
      ) : posters.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <ImageIcon className="size-12 text-default-300" />
          <p className="text-default-600">{t('gallery_page.empty.title')}</p>
          <Button
            as="a"
            href="/dashboard/poster/generation"
            color="primary"
            variant="flat">
            {t('gallery_page.empty.action')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {posters.map((poster, index) => (
            <div
              key={poster.id}
              className="relative overflow-hidden rounded-lg bg-default-50">
              {poster.status === PosterGenerationStatus.DONE && poster.lastImageUrl ? (
                <div className="group relative aspect-square overflow-hidden">
                  <img
                    src={poster.lastImageUrl}
                    alt={poster.prompt}
                    className="size-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* 使用伪元素实现遮罩背景 */}
                  <div className="absolute inset-0 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative z-20 flex h-full flex-col justify-between p-4">
                      {/* 顶部信息 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs text-white/80">
                          <Calendar className="size-3" />
                          <span>{dateFormatter.format(new Date(poster.createdAt))}</span>
                        </div>
                        <p className="line-clamp-4 text-sm text-white">{poster.prompt}</p>
                      </div>

                      {/* 中间放大按钮 */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Button
                          isIconOnly
                          size="lg"
                          variant="flat"
                          className="bg-white/20 backdrop-blur-sm hover:bg-white/40"
                          onPress={() => handleImageClick(index)}>
                          <Maximize2 className="size-6 text-white" />
                        </Button>
                      </div>

                      {/* 底部操作按钮 */}
                      <div className="flex justify-end gap-2">
                        {process.env.NODE_ENV === 'development' && (
                          <Button
                            isIconOnly
                            as={Link}
                            href={`/dashboard/poster/${poster.id}`}
                            size="sm"
                            variant="flat"
                            className="bg-white/10 backdrop-blur-sm">
                            <Edit className="size-4 text-white" />
                          </Button>
                        )}
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          className="bg-white/10 backdrop-blur-sm"
                          onPress={() => handleDownload(poster.lastImageUrl || '')}>
                          <Download className="size-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    {poster.status !== PosterGenerationStatus.FAILED && (
                      <div className="loading loading-spinner loading-md" />
                    )}
                    <p
                      className={cn(
                        'text-sm text-center px-4',
                        poster.status === PosterGenerationStatus.FAILED ? 'text-danger' : 'text-default-600',
                      )}>
                      {getStatusDisplay(poster)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Viewer
        visible={visible}
        onClose={() => setVisible(false)}
        images={viewerImages}
        activeIndex={activeIndex}
        onMaskClick={() => setVisible(false)}
        downloadable
        downloadInNewWindow
        noNavbar={false}
        zoomable
        rotatable
        scalable
        noImgDetails={false}
        showTotal
      />
    </div>
  );
}
