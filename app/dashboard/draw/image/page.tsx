'use client';

import { useState, Fragment, useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { Button, Tabs, Tab, Skeleton, Divider } from '@heroui/react';
import { GenerationForm } from './components/GenerationForm';
import { ImageGenerationSchema, ImageGenerationStatus } from '@/app/api/draw/image/types';
import { useChat } from 'ai/react';
import { getImageGenerations, createImageGeneration, getImageGeneration } from './action';
import { ImageIcon, Download, Calendar, Maximize2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/i18n/client';
import { toast } from 'sonner';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

function ImageGenerationSection() {
  const { t } = useTranslation('images');
  const stepsConfig = [
    { id: 'form', title: t('generation_flow.stepper.form') },
    { id: 'generating', title: t('generation_flow.stepper.generating') },
    { id: 'result', title: t('generation_flow.stepper.result') },
  ];
  type Step = 'form' | 'generating' | 'result';

  const Stepper = ({ currentStepId }: { currentStepId: Step }) => {
    const currentStepIndex = stepsConfig.findIndex((s) => s.id === currentStepId);

    return (
      <div className="mb-8 flex w-full items-start">
        {stepsConfig.map((step, index) => (
          <Fragment key={step.id}>
            <div className="flex flex-col items-center text-center">
              <div
                className={`flex size-10 items-center justify-center rounded-full text-lg font-bold ${
                  index <= currentStepIndex ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                {index + 1}
              </div>
              <p
                className={`mt-2 w-24 text-sm ${
                  index <= currentStepIndex ? 'font-semibold text-primary' : 'text-gray-500'
                }`}>
                {step.title}
              </p>
            </div>

            {index < stepsConfig.length - 1 && (
              <div
                className={`mx-4 mt-5 h-1 flex-1 rounded-full ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </Fragment>
        ))}
      </div>
    );
  };

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [generationId, _setGenerationId] = useState<string | null>(null);
  const generationIdRef = useRef(generationId);
  const setGenerationId = (id: string | null) => {
    generationIdRef.current = id;
    _setGenerationId(id);
  };

  const { isLoading, append, messages } = useChat({
    api: '/api/draw/image',
    onResponse: (response) => {
      if (response.status !== 200) {
        toast.error(t('generation_flow.toasts.generate_failed_title'), {
          description: t('generation_flow.toasts.generate_failed_request_desc'),
        });
        setStep('form');
      }
    },
    onFinish: async () => {
      if (!generationIdRef.current) {
        setStep('form');
        toast.error(t('generation_flow.toasts.generate_failed_title'), {
          description: t('generation_flow.toasts.generate_failed_no_id_desc', '没有获取到有效的任务 ID。'),
        });
        return;
      }

      // To handle race conditions, we'll poll for the result a few times.
      const maxRetries = 10;
      const retryDelay = 2000;
      const currentGenerationId = generationIdRef.current;

      for (let i = 0; i < maxRetries; i++) {
        const result = await getImageGeneration(currentGenerationId);
        if (result.success && result.data) {
          if (result.data.status === 'DONE' && result.data.imageUrl) {
            setGeneratedImage(result.data.imageUrl);
            setStep('result');
            toast.success(t('generation_flow.toasts.generate_success_title'), {
              description: t('generation_flow.toasts.generate_success_desc'),
            });
            return;
          }
          if (result.data.status === 'FAILED') {
            setStep('form');
            toast.error(t('generation_flow.toasts.generate_failed_title'), {
              description: result.data.error || t('result_waiter.unknown_error', '未知错误'),
            });
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      setStep('form');
      toast.error(t('generation_flow.toasts.timeout_error_title', '获取图片结果超时'), {
        description: t('generation_flow.toasts.timeout_error_desc', '请稍后在历史记录中查看。'),
      });
    },
    onError: (error) => {
      setStep('form');
      toast.error(t('generation_flow.toasts.generate_failed_title'), {
        description: error.message || t('generation_flow.toasts.generate_failed_unknown_desc'),
      });
    },
  });

  const handleSubmit = async (data: z.infer<typeof ImageGenerationSchema>) => {
    setGeneratedImage(null);
    setGenerationId(null);
    setStep('generating');

    try {
      const createResponse = await createImageGeneration(data);
      if (!createResponse.success || !createResponse.data?.id) {
        throw new Error(
          createResponse.error || t('generation_flow.toasts.create_task_failed_desc', '创建图片生成任务失败'),
        );
      }
      const newGenerationId = createResponse.data.id;
      setGenerationId(newGenerationId);

      await append(
        {
          role: 'user',
          content: data.prompt,
        },
        {
          body: {
            id: newGenerationId,
          },
        },
      );
    } catch (error) {
      setStep('form');
      toast.error(t('generation_flow.toasts.submit_failed_title'), {
        description: error instanceof Error ? error.message : t('generation_flow.toasts.generate_failed_unknown_desc'),
      });
    }
  };

  const handleStartOver = () => {
    setGeneratedImage(null);
    setGenerationId(null);
    setStep('form');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <Stepper currentStepId={step} />

        <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {step === 'form' && (
            <GenerationForm
              onSubmit={handleSubmit}
              loading={isLoading}
            />
          )}

          {step === 'generating' && (
            <div className="flex min-h-64 flex-col items-center justify-center">
              <div className="size-16 animate-spin rounded-full border-y-2 border-primary"></div>
              <p className="mt-4 text-lg">{t('generation_flow.generating_text')}</p>
              {messages.length > 0 &&
                messages[messages.length - 1].role === 'assistant' &&
                (() => {
                  const content = messages[messages.length - 1].content;
                  const cleanedContent = content
                    .replace(/```json[\s\S]*?```/g, '')
                    .replace(/!\[.*?\]\(.*?\)/g, '')
                    .replace(/\[100\]\(.*?\)/g, '')
                    .trim();

                  if (cleanedContent) {
                    return (
                      <p className="mt-2 w-full max-w-md break-words text-center text-sm text-gray-500">
                        {cleanedContent}
                      </p>
                    );
                  }
                  return null;
                })()}
            </div>
          )}

          {step === 'result' && (
            <div className="flex flex-col items-center gap-4">
              {generatedImage && (
                <div className="w-full">
                  <img
                    src={generatedImage}
                    alt="生成的图片"
                    className="h-auto w-full rounded-lg shadow-lg"
                  />
                </div>
              )}
              <Button
                onClick={handleStartOver}
                className="mt-4">
                {t('generation_flow.generate_again')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ImageGeneration {
  id: string;
  prompt: string;
  status: string;
  error?: string | null;
  imageUrl?: string | null;
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

  const viewerImages = useMemo(() => {
    return images
      .filter(
        (image): image is ImageGeneration & { imageUrl: string } =>
          image.status === ImageGenerationStatus.DONE && !!image.imageUrl,
      )
      .map((image) => ({
        src: image.imageUrl,
        alt: image.prompt,
        downloadUrl: image.imageUrl,
        description: `${dateFormatter.format(new Date(image.createdAt))}\n${image.prompt}`,
      }));
  }, [images, dateFormatter]);

  const fetchImages = async (status: string) => {
    try {
      setLoading(true);
      const response = await getImageGenerations(status);
      if (!response.success) {
        throw new Error(response.error);
      }
      if (response.data) {
        setImages(response.data);
        console.log(response.data);
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
    const doneImages = images.filter(
      (img): img is ImageGeneration & { imageUrl: string } =>
        img.status === ImageGenerationStatus.DONE && !!img.imageUrl,
    );
    const actualIndex = images.indexOf(doneImages[index]);
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
        return t('gallery_page.status.failed', { error: image.error || t('result_waiter.unknown_error') });
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
              {image.status === ImageGenerationStatus.DONE && image.imageUrl ? (
                <div className="group relative aspect-square overflow-hidden">
                  <img
                    src={image.imageUrl}
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
                          onPress={() => handleDownload(image.imageUrl || '')}>
                          <Download className="size-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
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
