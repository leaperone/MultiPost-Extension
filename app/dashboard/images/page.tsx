'use client';

import { Card, CardBody, Tabs, Tab, Button, Skeleton, Divider } from '@heroui/react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { ImageGenerationSchema, ImageGenerationStatus } from './types';
import { generateImage, getImageGeneration, getImageGenerations } from './action';
import { GenerationForm } from './components/GenerationForm';
import { EditsForm } from './components/EditsForm';
import { ResultWaiter } from './components/ResultWaiter';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';
import { ImageIcon, Download, Calendar, Maximize2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

// 生成图片部分
function ImageGenerationSection() {
  const { t } = useTranslation('images');
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selected, setSelected] = useState('generation');
  const [editImages, setEditImages] = useState<string[]>([]);
  const isVertical = true;

  const handleGenerate = async (data: z.infer<typeof ImageGenerationSchema>) => {
    try {
      setLoading(true);
      const response = await generateImage(data);
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

  const handleContinueEdit = (images: string[]) => {
    setEditImages(images);
    setSelected('edits');
    setTaskId(null);
  };

  useEffect(() => {
    if (editId) {
      (async () => {
        const result = await getImageGeneration(editId);
        if (result.success && result.data) {
          if (result.data.status === ImageGenerationStatus.DONE) {
            const resultData = result.data.result as { url: string }[];
            const imageUrls = resultData.map((item) => item.url);
            handleContinueEdit(imageUrls);
          }
        }
      })();
    }
  }, [editId]);

  return (
    <div
      className={cn(
        'flex w-full flex-col transition-all duration-500',
        !taskId && !loading ? 'justify-center' : 'justify-start',
      )}
      id="image-generation-section">
      <Card className="mx-auto mb-8 w-full max-w-3xl">
        <CardBody className="space-y-6">
          <div className="flex gap-4">
            <Tabs
              selectedKey={selected}
              onSelectionChange={(key) => setSelected(key as string)}
              color="primary"
              isVertical={isVertical}
              className="min-w-fit"
              classNames={{
                tabList: 'gap-2',
                cursor: 'w-full',
                tab: 'flex h-12 w-full items-center justify-start px-4',
              }}>
              <Tab
                key="generation"
                title={t('generate')}
              />
              <Tab
                key="edits"
                title={t('edit')}
              />
            </Tabs>
            <div className="flex-1">
              {selected === 'generation' && (
                <GenerationForm
                  onSubmit={handleGenerate}
                  loading={loading}
                />
              )}
              {selected === 'edits' && (
                <EditsForm
                  onSubmit={handleGenerate}
                  loading={loading}
                  images={editImages}
                />
              )}
            </div>
          </div>
        </CardBody>
      </Card>
      {/* 生成结果展示 */}
      {taskId && (
        <div className="mx-auto w-full max-w-7xl space-y-4 px-6 py-8 animate-in fade-in slide-in-from-bottom-4">
          <ResultWaiter
            taskId={taskId}
            onError={handleError}
            onContinueEdit={handleContinueEdit}
          />
        </div>
      )}
    </div>
  );
}

// gallery 部分
interface ImageGeneration {
  id: string;
  prompt: string;
  status: string;
  content?: string;
  result?: { url: string }[];
  createdAt: string;
}

function GallerySection() {
  const { t, i18n } = useTranslation('images');
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
    { key: ImageGenerationStatus.DONE, label: t('gallery_page.tabs.done') },
    { key: ImageGenerationStatus.PENDING, label: t('gallery_page.tabs.pending') },
    { key: ImageGenerationStatus.PROCESSING, label: t('gallery_page.tabs.processing') },
    { key: ImageGenerationStatus.FAILED, label: t('gallery_page.tabs.failed') },
  ] as const;
  type StatusType = (typeof STATUS_TABS)[number]['key'];
  const [images, setImages] = useState<ImageGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(ImageGenerationStatus.DONE);

  // 计算所有可以查看的图片
  const viewerImages = useMemo(() => {
    return images
      .filter((img) => img.status === ImageGenerationStatus.DONE && img.result)
      .flatMap((img) =>
        img.result!.map((r) => ({
          src: r.url,
          alt: img.prompt,
          downloadUrl: r.url,
          description: `${dateFormatter.format(new Date(img.createdAt))}\n${img.prompt}`,
        })),
      );
  }, [images, dateFormatter]);

  const fetchImages = async (status: string) => {
    try {
      setLoading(true);
      const response = await getImageGenerations(status);
      if (!response.success) {
        throw new Error(response.error);
      }
      if (response.data) {
        const results = response.data.map(
          (item: {
            id: string;
            prompt: string;
            status: string;
            content?: string;
            result?: { url: string }[];
            createdAt: Date;
            response?: { content: string };
          }) => ({
            ...item,
            content: (item.response as { content: string })?.content,
            result: item.result as { url: string }[],
            createdAt: item.createdAt.toISOString(),
          }),
        );
        setImages(results);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('gallery_page.get_image_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(selectedStatus);
  }, [selectedStatus]);

  const handleImageClick = (index: number) => {
    // 计算在所有图片中的实际索引
    let actualIndex = 0;
    let count = 0;
    for (const img of images) {
      if (img.status === ImageGenerationStatus.DONE && img.result) {
        if (count === index) {
          actualIndex = count;
          break;
        }
        count += img.result.length;
      }
    }
    setActiveIndex(actualIndex);
    setVisible(true);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const getStatusDisplay = (image: ImageGeneration) => {
    switch (image.status) {
      case ImageGenerationStatus.PENDING:
        return t('result_waiter.pending');
      case ImageGenerationStatus.PROCESSING:
        return t('result_waiter.processing');
      case ImageGenerationStatus.FAILED:
        return `${t('result_waiter.failed')}: ${image.content || t('result_waiter.unknown_error')}`;
      default:
        return t('result_waiter.loading');
    }
  };

  // 滚动到顶部生成区
  const scrollToGeneration = () => {
    const el = document.getElementById('image-generation-section');

    if (el) el.scrollIntoView({ behavior: 'smooth' });
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
      ) : images.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <ImageIcon className="size-12 text-default-300" />
          <p className="text-default-600">{t('gallery_page.empty.title')}</p>
          <Button
            color="primary"
            variant="flat"
            onPress={scrollToGeneration}>
            {t('gallery_page.empty.action')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative overflow-hidden rounded-lg bg-default-50">
              {image.status === ImageGenerationStatus.DONE && image.result ? (
                <div className="group relative aspect-square overflow-hidden">
                  <img
                    src={image.result[0].url}
                    alt={image.prompt}
                    className="size-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* 遮罩和操作按钮 */}
                  <div className="absolute inset-0 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative z-20 flex h-full flex-col justify-between p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs text-white/80">
                          <Calendar className="size-3" />
                          <span>{dateFormatter.format(new Date(image.createdAt))}</span>
                        </div>
                        <p className="line-clamp-4 text-sm text-white">{image.prompt}</p>
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
                          onPress={() => handleDownload(image.result![0].url)}>
                          <Download className="size-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    {image.status !== ImageGenerationStatus.FAILED && (
                      <div className="loading loading-spinner loading-md" />
                    )}
                    <p
                      className={cn(
                        'text-sm text-center px-4',
                        image.status === ImageGenerationStatus.FAILED ? 'text-danger' : 'text-default-600',
                      )}>
                      {getStatusDisplay(image)}
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

export default function ImagesPage() {
  return (
    <div className="space-y-4 p-8">
      <ImageGenerationSection />
      <Divider className="my-4" />
      <GallerySection />
    </div>
  );
}
