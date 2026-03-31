'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Button, Image } from '@heroui/react';
import { GenerationForm } from '@/app/dashboard/draw/poster/components/GenerationForm';
import { PosterGenerationSchema } from '@/actions/draw/poster/types';
import { generatePoster, getPosterGeneration } from '@/actions/draw/poster';
import { ResultWaiter } from '@/app/dashboard/draw/poster/components/ResultWaiter';
import { FileImage } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import { useDraftStore } from '@/store/draft.store';
import { toast } from 'sonner';

interface PosterGeneratePanelProps {
  draftTitle?: string;
  draftContent?: string;
  onInsertImage?: (imageUrl: string) => void;
}

export function PosterGeneratePanel({ draftTitle, draftContent, onInsertImage }: PosterGeneratePanelProps) {
  const { t } = useTranslation('draft');
  const { lastPosterForm, setLastPosterForm } = useDraftStore();
  type Step = 'form' | 'generating' | 'result';

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeContent, setIncludeContent] = useState(true);

  // Monitor task completion
  useEffect(() => {
    if (!taskId) return;

    const checkStatus = async () => {
      const result = await getPosterGeneration(taskId);
      if (result.success && result.data) {
        if (result.data.status === 'done' && result.data.lastImageUrl) {
          setGeneratedImage(result.data.lastImageUrl);
          setStep('result');
        } else if (result.data.status === 'failed') {
          setStep('form');
          setTaskId(null);
        }
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [taskId]);

  const handleSubmit = async (data: z.infer<typeof PosterGenerationSchema>) => {
    // Save the prompt to store
    setLastPosterForm(data);

    const prefixParts: string[] = [];
    if (includeTitle && draftTitle) {
      prefixParts.push(`${t('aiPoster.titleLabel')} ${draftTitle}`);
    }
    if (includeContent && draftContent) {
      const contentSnippet = draftContent.length > 200 ? `${draftContent.substring(0, 200)}...` : draftContent;
      prefixParts.push(`${t('aiPoster.contentLabel')} ${contentSnippet}`);
    }

    const promptPrefix = prefixParts.join('\n\n');
    if (promptPrefix) {
      data.prompt = `${promptPrefix}\n\n---\n\n${data.prompt}`;
    }

    setGeneratedImage(null);
    setTaskId(null);
    setStep('generating');
    setLoading(true);

    try {
      const response = await generatePoster(data);
      if (!response.success || !response.data) {
        throw new Error(response.error);
      }
      setTaskId(response.data.id);
      toast.success(t('aiPoster.taskSubmitted'));
    } catch (error) {
      setStep('form');
      setLoading(false);
      toast.error(error instanceof Error ? error.message : t('aiPoster.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setGeneratedImage(null);
    setTaskId(null);
    setStep('form');
  };

  const handleError = (error: string) => {
    toast.error(error);
    setStep('form');
    setTaskId(null);
  };

  const handleInsert = () => {
    if (generatedImage && onInsertImage) {
      onInsertImage(generatedImage);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mt-8 rounded-lg border bg-white p-6 shadow-xs dark:border-gray-700 dark:bg-gray-900">
        {step === 'form' && (
          <div>
            {(draftTitle || draftContent) && (
              <div className="mb-4 space-y-2 rounded-md border bg-default-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('aiPoster.attachPrompt')}</p>
                {draftTitle && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeTitle}
                      onChange={(e) => setIncludeTitle(e.target.checked)}
                      className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-primary-600"
                    />
                    <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                      {t('aiPoster.titleLabel')} {draftTitle}
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
                      {t('aiPoster.contentLabel')} {draftContent.substring(0, 50)}...
                    </span>
                  </label>
                )}
              </div>
            )}
            <GenerationForm
              onSubmit={handleSubmit}
              loading={loading}
              initialValues={lastPosterForm}
              extraPrompt={`${draftTitle ? `${t('aiImage.titleLabel')} ${draftTitle}` : ''}${
                draftContent ? `${t('aiImage.contentLabel')} ${draftContent}` : ''
              }`}
            />
          </div>
        )}

        {step === 'generating' && taskId && (
          <ResultWaiter
            taskId={taskId}
            onError={handleError}
          />
        )}

        {step === 'result' && (
          <div className="flex flex-col items-center gap-4">
            {generatedImage && (
              <div className="w-full">
                <Image
                  src={generatedImage}
                  alt="Generated poster"
                  className="h-auto w-full rounded-lg shadow-lg"
                  radius="lg"
                  shadow="md"
                />
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={handleStartOver}
                variant="flat">
                {t('aiPoster.startOver')}
              </Button>
              {onInsertImage && (
                <Button
                  color="primary"
                  onClick={handleInsert}
                  startContent={<FileImage className="size-4" />}
                  isDisabled={!generatedImage}>
                  {t('aiPoster.insertToDraft')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
