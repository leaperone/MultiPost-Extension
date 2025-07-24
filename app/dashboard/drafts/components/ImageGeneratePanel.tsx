'use client';

import { useState, useRef } from 'react';
import { z } from 'zod';
import { Button } from '@heroui/react';
import { GenerationForm } from '@/app/dashboard/draw/image/components/GenerationForm';
import { ImageGenerationSchema } from '@/app/api/draw/image/types';
import { useChat } from 'ai/react';
import { toast } from 'sonner';
import { createImageGeneration, getImageGeneration } from '../../draw/image/action';
import { FileImage } from 'lucide-react';
import { useTranslation } from '@/i18n/client';

interface ImageGeneratePanelProps {
  draftTitle?: string;
  draftContent?: string;
  onInsertImage?: (imageUrl: string) => void;
}

export function ImageGeneratePanel({ draftTitle, draftContent, onInsertImage }: ImageGeneratePanelProps) {
  const { t } = useTranslation('draft');
  type Step = 'form' | 'generating' | 'result';

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [generationId, _setGenerationId] = useState<string | null>(null);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeContent, setIncludeContent] = useState(true);

  const generationIdRef = useRef(generationId);
  const setGenerationId = (id: string | null) => {
    generationIdRef.current = id;
    _setGenerationId(id);
  };

  const { messages, append, isLoading } = useChat({
    api: '/api/draw/image',
    onResponse: (response) => {
      if (response.status !== 200) {
        toast.error(t('aiImage.toast.requestFailed'));
        setStep('form');
      }
    },
    onFinish: async () => {
      if (!generationIdRef.current) {
        setStep('form');
        toast.error(t('aiImage.toast.generationFailed'), {
          description: t('aiImage.toast.noId'),
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
            toast.success(t('aiImage.toast.success'));
            return;
          }
          if (result.data.status === 'FAILED') {
            setStep('form');
            toast.error(t('aiImage.toast.generationFailed'), {
              description: result.data.error || t('aiImage.toast.unknownError'),
            });
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      setStep('form');
      toast.error(t('aiImage.toast.timeout'), {
        description: t('aiImage.toast.timeoutDesc'),
      });
    },
    onError: (error) => {
      setStep('form');
      toast.error(t('aiImage.toast.generationFailed'), {
        description: error.message || t('aiImage.toast.unknownError'),
      });
    },
  });

  const handleSubmit = async (data: z.infer<typeof ImageGenerationSchema>) => {
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

    setGeneratedImage(null);
    setGenerationId(null);
    setStep('generating');

    try {
      const createResponse = await createImageGeneration(data);
      if (!createResponse.success || !createResponse.data?.id) {
        throw new Error(createResponse.error || t('aiImage.toast.createTaskFailed'));
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
      toast.error(t('aiImage.toast.submitFailed'), {
        description: error instanceof Error ? error.message : t('aiImage.toast.unknownError'),
      });
    }
  };

  const handleStartOver = () => {
    setGeneratedImage(null);
    setGenerationId(null);
    setStep('form');
  };

  const handleInsert = () => {
    if (generatedImage && onInsertImage) {
      onInsertImage(generatedImage);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
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
              loading={isLoading}
              extraPrompt={`${draftTitle ? `${t('aiImage.titleLabel')} ${draftTitle}` : ''}${
                draftContent ? `${t('aiImage.contentLabel')} ${draftContent}` : ''
              }`}
            />
          </div>
        )}

        {step === 'generating' && (
          <div className="flex min-h-64 flex-col items-center justify-center">
            <div className="size-16 animate-spin rounded-full border-y-2 border-primary"></div>
            <p className="mt-4 text-lg">{t('aiImage.generating')}</p>
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
                  alt={t('aiImage.generatedAlt')}
                  className="h-auto w-full rounded-lg shadow-lg"
                />
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={handleStartOver}
                variant="flat">
                {t('aiImage.generateAgain')}
              </Button>
              {onInsertImage && (
                <Button
                  color="primary"
                  onClick={handleInsert}
                  startContent={<FileImage className="size-4" />}
                  isDisabled={!generatedImage}>
                  {t('aiImage.insertDraft')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
