'use client';

import { Card, CardBody, Tabs, Tab, Button, Skeleton, Divider } from '@heroui/react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Category, PosterGenerationSchema, PosterGenerationStatus } from './types';
import { generatePoster, getPosterGeneration, getPosterGenerations, updatePosterGeneration } from './action';
import { GenerationForm } from './components/GenerationForm';
import { ResultWaiter } from './components/ResultWaiter';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';
import { ImageIcon, Download, Calendar, Maximize2, RefreshCcw } from 'lucide-react';
import dynamic from 'next/dynamic';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

// 生成海报部分
function PosterGenerationSection() {
  const { t } = useTranslation('poster');
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [formValues] = useState<z.infer<typeof PosterGenerationSchema> | null>(null);
  const [category, setCategory] = useState<string>('category.social_media_generator');

  const handleGenerate = async (data: z.infer<typeof PosterGenerationSchema>) => {
    try {
      setLoading(true);
      data.category = category || 'category.social_media_generator';
      const response = await generatePoster(data);
      if (!response.success || !response.data) {
        throw new Error(response.error);
      }
      setTaskId(response.data.id);
      toast.success(t('result_waiter.task_submitted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('result_waiter.submit_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  useEffect(() => {
    if (editId) {
      (async () => {
        const result = await getPosterGeneration(editId);
        if (result.success && result.data) {
          setTaskId(result.data.id);
        }
      })();
    }
  }, [editId]);

  return (
    <div className={cn('flex w-full flex-col')}>
      {!taskId && (
        <Card
          id="generation-form"
          className="mx-auto mb-8 w-full max-w-3xl">
          <CardBody className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {Category.map((item) => (
                  <Button
                    key={item.name}
                    variant={category === item.name ? 'solid' : 'flat'}
                    color={category === item.name ? 'primary' : 'default'}
                    className={category === item.name ? 'font-medium' : ''}
                    onPress={() => setCategory(item.name)}>
                    {t(item.name)}
                  </Button>
                ))}
              </div>
              <GenerationForm
                onSubmit={handleGenerate}
                loading={loading}
                initialValues={formValues}
              />
            </div>
          </CardBody>
        </Card>
      )}
      {taskId && (
        <div className="mx-auto w-full max-w-7xl space-y-4 px-6 py-8">
          <ResultWaiter
            taskId={taskId}
            onError={handleError}
          />
        </div>
      )}
    </div>
  );
}

// gallery 部分
interface PosterGeneration {
  id: string;
  prompt: string;
  status: string;
  error?: string | null;
  lastImageUrl?: string | null;
  createdAt: string;
}

function GallerySection() {
  const { t, i18n } = useTranslation('poster');
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
        const results = response.data.map(
          (item: {
            id: string;
            prompt: string;
            status: string;
            error?: string | null;
            lastImageUrl?: string | null;
            createdAt: Date;
          }) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          }),
        );
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
    <div>
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
                    className="size-full cursor-pointer object-cover"
                  />
                  {/* 遮罩和操作按钮 */}
                  <div className="absolute inset-0 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative z-20 flex h-full flex-col justify-between p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs text-white/80">
                          <Calendar className="size-3" />
                          <span>{dateFormatter.format(new Date(poster.createdAt))}</span>
                        </div>
                        <p className="line-clamp-4 text-sm text-white">{poster.prompt}</p>
                      </div>
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
                      <div className="flex justify-end gap-2">
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
                    {(poster.status === PosterGenerationStatus.PENDING ||
                      poster.status === PosterGenerationStatus.PROCESSING) &&
                      new Date(poster.createdAt).getTime() + 1000 * 60 * 5 < Date.now() && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          className="bg-white/10 backdrop-blur-sm"
                          onPress={async () => {
                            toast.loading(t('result_waiter.manual_update_toast'));
                            const response = await updatePosterGeneration(poster.id);
                            if (!response.success || !response.data) {
                              toast.dismiss();
                              toast.error(response.error);
                              return;
                            }
                            toast.dismiss();
                            window.location.reload();
                          }}>
                          <RefreshCcw className="size-4 text-white" />
                        </Button>
                      )}
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

export default function PosterPage() {
  return (
    <div className="space-y-4 p-8">
      <PosterGenerationSection />
      <Divider className="my-4" />
      <GallerySection />
    </div>
  );
}
