'use client';

import { useState, useMemo } from 'react';
import { z } from 'zod';
import { Button, Image } from '@heroui/react';
import { GenerationForm } from '@/app/dashboard/draw/image/components/GenerationForm';
import { ResultWaiter } from '@/app/dashboard/draw/image/components/ResultWaiter';
import { ImageGenerationSchema, ImageGenerationStatus } from '@/actions/draw/image/types';
import { toast } from 'sonner';
import { Eye, Plus } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import { useDraftStore } from '@/store/draft.store';
import { newImageGeneration } from '@/actions/draw/image';
import dynamic from 'next/dynamic';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

interface TaskStatus {
  status: string;
  images?: string[];
  error?: string;
}

interface ImageGeneratePanelProps {
  draftTitle?: string;
  draftContent?: string;
  onInsertImage?: (imageUrl: string) => void;
}

export function ImageGeneratePanel({ draftTitle, draftContent, onInsertImage }: ImageGeneratePanelProps) {
  const { t } = useTranslation('draft');
  const { lastImagePrompt, setLastImagePrompt } = useDraftStore();
  type Step = 'form' | 'generating' | 'result';

  const [step, setStep] = useState<Step>('form');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeContent, setIncludeContent] = useState(true);

  const handleSubmit = async (data: z.infer<typeof ImageGenerationSchema>) => {
    // Save the prompt to store
    setLastImagePrompt(data.prompt);

    const prefixParts: string[] = [];
    if (includeTitle && draftTitle) {
      prefixParts.push(`${t('aiImage.titleLabel')} ${draftTitle}`);
    }
    if (includeContent && draftContent) {
      const contentSnippet = draftContent.length > 200 ? `${draftContent.substring(0, 200)}...` : draftContent;
      prefixParts.push(`${t('aiImage.contentLabel')} ${contentSnippet}`);
    }

    const promptPrefix = prefixParts.join('\n\n');
    if (promptPrefix) {
      data.prompt = `${promptPrefix}\n\n---\n\n${data.prompt}`;
    }

    setTaskStatus(null);
    setGenerationId(null);
    setStep('generating');

    try {
      const createResponse = await newImageGeneration(data);
      if (!createResponse.success || !createResponse.data?.id) {
        throw new Error(createResponse.error || t('aiImage.toast.createTaskFailed'));
      }
      const newGenerationId = createResponse.data.id;
      setGenerationId(newGenerationId);
    } catch (error) {
      setStep('form');
      toast.error(t('aiImage.toast.submitFailed'), {
        description: error instanceof Error ? error.message : t('aiImage.toast.unknownError'),
      });
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
    setStep('form');
  };

  const handleStatusChange = (status: TaskStatus) => {
    setTaskStatus(status);
    if (status.status === ImageGenerationStatus.COMPLETED) {
      setStep('result');
    } else if (status.status === ImageGenerationStatus.FAILED) {
      setStep('form');
    }
  };

  const handleStartOver = () => {
    setTaskStatus(null);
    setGenerationId(null);
    setStep('form');
  };

  const handleInsertSpecific = (url: string) => {
    if (onInsertImage) {
      onInsertImage(url);
    }
  };

  // Removed download handler per requirement: no download button

  const viewerImages = useMemo(() => {
    return (
      taskStatus?.images?.map((url, index) => ({
        src: url,
        alt: `Generated image ${index + 1}`,
      })) || []
    );
  }, [taskStatus?.images]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mt-8 rounded-lg border bg-white p-6 shadow-xs dark:border-gray-700 dark:bg-gray-900">
        {step === 'form' && (
          <div>
            {(draftTitle || draftContent) && (
              <div className="mb-4 space-y-2 rounded-md border bg-default-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('aiImage.attachPrompt')}</p>
                {draftTitle && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeTitle}
                      onChange={(e) => setIncludeTitle(e.target.checked)}
                      className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-primary-600"
                    />
                    <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                      {t('aiImage.titleLabel')} {draftTitle}
                    </span>
                  </label>
                )}
                {draftContent && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeContent}
                      onChange={(e) => setIncludeContent(e.target.checked)}
                      className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-primary-600"
                    />
                    <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                      {t('aiImage.contentLabel')} {draftContent.substring(0, 50)}...
                    </span>
                  </label>
                )}
              </div>
            )}
            <GenerationForm
              onSubmit={handleSubmit}
              loading={false}
              initPrompt={lastImagePrompt}
              extraPrompt={`${draftTitle ? `${t('aiImage.titleLabel')} ${draftTitle}` : ''}${
                draftContent ? `${t('aiImage.contentLabel')} ${draftContent}` : ''
              }`}
            />
          </div>
        )}

        {step === 'generating' && generationId && (
          <ResultWaiter
            taskId={generationId}
            onError={handleError}
            onStatusChange={handleStatusChange}
          />
        )}

        {step === 'result' && taskStatus?.status === ImageGenerationStatus.COMPLETED && taskStatus.images && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {taskStatus.images.map((imageUrl, index) => (
                <div
                  key={index}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100">
                  {/* Image */}
                  <Image
                    src={imageUrl}
                    alt={`Generated image ${index + 1}`}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                    radius="none"
                  />

                  {/* Hover Overlay Actions */}
                  <div className="absolute inset-0 z-10 flex items-end justify-center gap-2 bg-black/0 pb-3 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                    <Button
                      isIconOnly
                      size="lg"
                      variant="flat"
                      className="border border-white/30 bg-white/20 text-white backdrop-blur-xs hover:bg-white/30"
                      onPress={() => {
                        setActiveIndex(index);
                        setViewerVisible(true);
                      }}>
                      <Eye className="size-5" />
                    </Button>

                    {onInsertImage && (
                      <Button
                        isIconOnly
                        size="lg"
                        variant="flat"
                        className="border border-white/30 bg-white/20 text-white backdrop-blur-xs hover:bg-white/30"
                        onPress={() => handleInsertSpecific(imageUrl)}>
                        <Plus className="size-5" />
                      </Button>
                    )}

                    {/* Download button removed */}
                  </div>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleStartOver}
                variant="flat">
                {t('aiImage.generateAgain')}
              </Button>
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
              rotatable={false}
              showTotal
            />
          </div>
        )}
      </div>
    </div>
  );
}
