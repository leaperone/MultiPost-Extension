'use client';

import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { Button, Tabs, Tab, Skeleton, Divider, Card, CardBody, Image } from '@heroui/react';
import { GenerationForm } from './components/GenerationForm';
import { ResultWaiter } from './components/ResultWaiter';
import {
  ImageGenerationSchema,
  ImageGenerationStatus,
  ImageGeneration,
  ImageGenerationLog,
} from '@/actions/draw/image/types';
import { listAllImages, newImageGeneration } from '@/actions/draw/image';
import { ImageIcon, Download, Calendar, Maximize2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/i18n/client';
import { toast } from 'sonner';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

/**
 * 获取 ImageGenerationLog 的预览 URL
 * 优先级: previewUrl > fileHosting.previewUrl > null
 */
function getLogPreviewUrl(log: ImageGenerationLog): string | null {
  if (log.previewUrl) return log.previewUrl;
  if (log.fileHosting?.previewUrl) return log.fileHosting.previewUrl;
  return null;
}

/**
 * 获取 ImageGenerationLog 的下载 URL (原始 URL)
 * 优先级: url > fileHosting.previewUrl > null
 */
function getLogDownloadUrl(log: ImageGenerationLog): string | null {
  if (log.url) return log.url;
  if (log.fileHosting?.previewUrl) return log.fileHosting.previewUrl;
  return null;
}

/**
 * 检查 log 是否有有效的图片 URL
 */
function hasValidImageUrl(log: ImageGenerationLog): boolean {
  return !!(log.previewUrl || log.fileHosting?.previewUrl);
}

interface TaskStatus {
  status: string;
  images?: string[];
  error?: string;
}

function ImageGenerationSection() {
  const { t } = useTranslation('images');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [leaperOneId, setLeaperOneId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleGenerate = async (data: z.infer<typeof ImageGenerationSchema>) => {
    try {
      setLoading(true);
      const response = await newImageGeneration(data);
      if (!response.success || !response.data) {
        throw new Error(response.error || t('generation_flow.toasts.submit_failed'));
      }
      setTaskId(response.data.id);
      setLeaperOneId(response.data.leaperOneId);
      setTaskStatus(null); // 重置状态
      if (response.message) {
        toast.success(response.message);
      } else {
        toast.success(t('generation_flow.toasts.task_submitted'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('generation_flow.toasts.submit_failed');
      toast.error(errorMessage);
      console.error('handleGenerate error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  const handleStatusChange = (status: TaskStatus) => {
    setTaskStatus(status);
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      toast.loading(t('gallery_page.download.loading'));
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = `image-${index + 1}-${new Date().getTime()}.webp`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.dismiss();
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(t('gallery_page.download.failed'));
    }
  };

  const viewerImages = useMemo(() => {
    return (
      taskStatus?.images?.map((url, index) => ({
        src: url,
        alt: `Generated image ${index + 1}`,
      })) || []
    );
  }, [taskStatus?.images]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {!taskId && (
          <Card className="mx-auto w-full max-w-3xl">
            <CardBody className="space-y-6">
              <GenerationForm
                onSubmit={handleGenerate}
                loading={loading}
              />
            </CardBody>
          </Card>
        )}
        {taskId && leaperOneId && (
          <div className="mx-auto w-full max-w-7xl space-y-4 px-6 py-8">
            {!taskStatus ||
            taskStatus.status === ImageGenerationStatus.PENDING ||
            taskStatus.status === ImageGenerationStatus.PROCESSING ? (
              <ResultWaiter
                taskId={taskId}
                leaperOneId={leaperOneId}
                onError={handleError}
                onStatusChange={handleStatusChange}
              />
            ) : taskStatus.status === ImageGenerationStatus.FAILED ? (
              <Card className="mx-auto w-full max-w-3xl">
                <CardBody className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-danger">
                      {t('result_waiter.failed')}: {taskStatus.error || t('result_waiter.unknown_error')}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ) : taskStatus.status === ImageGenerationStatus.COMPLETED && taskStatus.images ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {taskStatus.images.map((imageUrl, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer transition-transform hover:scale-[1.02]"
                      isPressable
                      onPress={() => {
                        setActiveIndex(index);
                        setViewerVisible(true);
                      }}>
                      <CardBody className="p-0">
                        <Image
                          alt={`Generated image ${index + 1}`}
                          className="aspect-square w-full object-cover"
                          src={imageUrl}
                        />
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-center gap-4">
                  {taskStatus.images.map((imageUrl, index) => (
                    <Button
                      key={index}
                      color="primary"
                      variant="flat"
                      size="sm"
                      startContent={<Download className="size-4" />}
                      onPress={() => handleDownload(imageUrl, index)}>
                      Download {index + 1}
                    </Button>
                  ))}
                </div>

                <Viewer
                  visible={viewerVisible}
                  onClose={() => setViewerVisible(false)}
                  onMaskClick={() => setViewerVisible(false)}
                  images={viewerImages}
                  activeIndex={activeIndex}
                  zIndex={9999}
                  noNavbar={false}
                  scalable
                  downloadable
                  rotatable={false}
                  showTotal
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
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
    { key: ImageGenerationStatus.COMPLETED, label: t('gallery_page.tabs.done') },
    { key: ImageGenerationStatus.PENDING, label: t('gallery_page.tabs.pending') },
    { key: ImageGenerationStatus.PROCESSING, label: t('gallery_page.tabs.processing') },
    { key: ImageGenerationStatus.FAILED, label: t('gallery_page.tabs.failed') },
  ] as const;
  type StatusType = (typeof STATUS_TABS)[number]['key'];
  const [images, setImages] = useState<ImageGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(ImageGenerationStatus.COMPLETED);

  const viewerImages = useMemo(() => {
    return images
      .filter((image) => image.status === ImageGenerationStatus.COMPLETED && !!image.ImageGenerationLog?.length)
      .flatMap((image) =>
        image.ImageGenerationLog.filter((log: ImageGenerationLog) => hasValidImageUrl(log)).map(
          (log: ImageGenerationLog, index: number) => ({
            src: getLogPreviewUrl(log)!,
            alt: `${image.prompt} - ${index + 1}`,
            downloadUrl: getLogDownloadUrl(log)!,
            description: `${dateFormatter.format(new Date(image.createdAt))}\n${image.prompt}`,
          }),
        ),
      );
  }, [images, dateFormatter]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await listAllImages();
      if (!response.success) {
        throw new Error(response.error || t('gallery_page.get_image_failed'));
      }
      if (response.data) {
        const mappedData = response.data.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })) as ImageGeneration[];
        setImages(mappedData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('gallery_page.get_image_failed');
      toast.error(errorMessage);
      console.error('fetchImages error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  const handleImageClick = (imageIndex: number, logIndex: number = 0) => {
    const doneImages = images.filter(
      (img) => img.status === ImageGenerationStatus.COMPLETED && !!img.ImageGenerationLog?.length,
    );
    let actualIndex = 0;
    for (let i = 0; i < imageIndex; i++) {
      if (doneImages[i]?.ImageGenerationLog) {
        actualIndex += doneImages[i].ImageGenerationLog.filter(
          (log: ImageGenerationLog) => hasValidImageUrl(log),
        ).length;
      }
    }
    actualIndex += logIndex;
    setActiveIndex(actualIndex);
    setVisible(true);
  };

  const handleDownload = async (url: string) => {
    try {
      toast.loading(t('gallery_page.download.loading'));
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = `image-${new Date().getTime()}.webp`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.dismiss();
    } catch (error) {
      console.error('下载失败:', error);
      toast.error(t('gallery_page.download.failed'));
    }
  };

  const getStatusDisplay = (image: ImageGeneration) => {
    switch (image.status) {
      case ImageGenerationStatus.PENDING:
        return t('gallery_page.tabs.pending');
      case ImageGenerationStatus.PROCESSING:
        return t('gallery_page.tabs.processing');
      case ImageGenerationStatus.FAILED:
        return `${t('gallery_page.status.failed')}: ${image.error || image.message || t('result_waiter.unknown_error')}`;
      default:
        return t('gallery_page.status.loading');
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
        <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg bg-default-50">
              <Skeleton className="aspect-square w-full" />
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <ImageIcon className="size-12 text-default-300" />
          <p className="text-default-600">{t('gallery_page.empty.title')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative overflow-hidden rounded-lg bg-default-50">
              {image.status === ImageGenerationStatus.COMPLETED && image.ImageGenerationLog?.length ? (
                <div className="space-y-2">
                  {image.ImageGenerationLog.filter((log: ImageGenerationLog) => hasValidImageUrl(log))
                    .slice(0, 1)
                    .map((log: ImageGenerationLog, logIndex: number) => (
                      <div
                        key={logIndex}
                        className="group relative aspect-square overflow-hidden">
                        <img
                          src={getLogPreviewUrl(log)!}
                          alt={image.prompt}
                          className="size-full cursor-pointer object-cover"
                        />
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
                                className="bg-white/20 backdrop-blur-xs hover:bg-white/40"
                                onPress={() => handleImageClick(index, logIndex)}>
                                <Maximize2 className="size-6 text-white" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/80">
                                {image.ImageGenerationLog?.filter(
                                  (log: ImageGenerationLog) => hasValidImageUrl(log),
                                ).length || 0}{' '}
                                images
                              </span>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                className="bg-white/10 backdrop-blur-xs"
                                onPress={() => handleDownload(getLogDownloadUrl(log)!)}>
                                <Download className="size-4 text-white" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {image.status !== ImageGenerationStatus.FAILED && (
                      <div className="size-8 animate-spin rounded-full border-y-2 border-primary"></div>
                    )}
                    <p
                      className={`text-sm ${
                        image.status === ImageGenerationStatus.FAILED ? 'text-danger' : 'text-default-600'
                      }`}>
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

export default function ImagePage() {
  return (
    <div className="space-y-8 p-4 md:p-8">
      <ImageGenerationSection />
      <Divider className="my-6" />
      <GallerySection />
    </div>
  );
}
