'use client';

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Textarea,
  Select,
  SelectItem,
  Card,
  CardBody,
  Link,
} from '@heroui/react';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/client';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ImageGenerationSchema,
  ImageSize,
  Style,
  Color,
  ImageGenerationStatus,
} from '@/app/dashboard/draw/image/types';
import { generateImage, getImageGeneration } from '@/app/dashboard/draw/image/action';
import type { FileData } from '@/lib/extension';
import { ExternalLinkIcon, ImageIcon, XIcon } from 'lucide-react';
import { BalanceButtonClient } from '@/app/dashboard/components/BalanceButtonClient';

interface ImageGenerationModalProps {
  onImageGenerated: (imageData: FileData) => void;
  initialPromptBasis: {
    title: string;
    content: string;
  };
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface TaskResultState {
  status: keyof typeof ImageGenerationStatus;
  response?: string;
  images?: { url: string }[];
  error?: string;
}

export function ImageGenerationModal({
  onImageGenerated,
  initialPromptBasis,
  isOpen,
  onOpenChange,
}: ImageGenerationModalProps) {
  const { t } = useTranslation('publish');
  const { t: tImage } = useTranslation('images');

  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskResult, setTaskResult] = useState<TaskResultState | null>(null);

  const [customPrompt, setCustomPrompt] = useState('');
  const [imageStyle, setImageStyle] = useState<string | undefined>(undefined);
  const [imageColor, setImageColor] = useState<string | undefined>(undefined);

  const basePrompt = `${initialPromptBasis.title}\n\n${initialPromptBasis.content}`;
  const finalPromptForApi = `${basePrompt}${customPrompt ? `\n\n${customPrompt}` : ''}`;

  const handleGenerate = async () => {
    if (!finalPromptForApi.trim()) {
      toast.error(tImage('generation_page.prompt_required', 'Prompt is required.'));
      return;
    }
    const generationData = {
      prompt: finalPromptForApi,
      number: 1,
      size: ImageSize.SQUARE,
      quality: 'auto',
      style: imageStyle,
      color: imageColor,
      composition: undefined,
    } as z.infer<typeof ImageGenerationSchema>;

    try {
      setLoading(true);
      setTaskResult(null);
      const response = await generateImage(generationData);
      if (!response.success || !response.data) {
        throw new Error(response.error || tImage('result_waiter.submit_failed'));
      }
      setTaskId(response.data.id);
      toast.success(tImage('result_waiter.task_submitted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tImage('result_waiter.submit_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleErrorFromPolling = (errorMsg: string) => {
    toast.error(errorMsg);
    setTaskResult({ status: ImageGenerationStatus.FAILED, error: errorMsg });
    setTaskId(null);
  };

  const closeModal = () => {
    onOpenChange(false);
    if (taskId) {
      setTaskId(null);
    }
    setTaskResult(null);
  };

  useEffect(() => {
    if (isOpen) {
      setCustomPrompt('');
      setImageStyle(undefined);
      setImageColor(undefined);
      setLoading(false);
    } else {
      if (taskId) setTaskId(null);
      setTaskResult(null);
    }
  }, [isOpen, initialPromptBasis.title, initialPromptBasis.content, taskId]);

  useEffect(() => {
    if (!taskId) return;
    let timeoutId: NodeJS.Timeout;
    let isActive = true;

    const checkResult = async () => {
      if (!isActive) return;
      try {
        const response = await getImageGeneration(taskId);

        if (!isActive) return;

        if (!response.success || !response.data) {
          throw new Error(response.error || tImage('result_waiter.unknown_error'));
        }

        const currentResultData = response.data;
        const currentStatus = currentResultData.status as keyof typeof ImageGenerationStatus;
        const textualResponse = (currentResultData.response as { content: string })?.content;

        const imagesFromResult = currentResultData.result;
        let typedImages: { url: string }[] | undefined = undefined;
        if (Array.isArray(imagesFromResult)) {
          typedImages = imagesFromResult.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (item: unknown): item is { url: string } =>
              typeof item === 'object' &&
              item !== null &&
              Object.prototype.hasOwnProperty.call(item, 'url') &&
              typeof (item as { url?: unknown }).url === 'string',
          );
        }

        setTaskResult({
          status: currentStatus,
          response: textualResponse,
          images: typedImages,
        });

        if (currentStatus === ImageGenerationStatus.DONE) {
          isActive = false;
          if (typedImages && typedImages.length > 0) {
            const firstImageUrl = typedImages[0].url;
            const imageName = `ai_generated_${new Date().getTime()}.webp`;
            const newImageData: FileData = {
              name: imageName,
              type: 'image/webp',
              size: 0,
              url: firstImageUrl,
            };
            handleInternalImageGenerated(newImageData);
            toast.success(
              t(
                'dynamic.aiImageGenerationModal.autoUploadSuccess',
                'Image generated and added. You can now close this window.',
              ),
            );
          } else {
            toast.error(
              t('dynamic.aiImageGenerationModal.noImageGenerated', 'No image was generated despite success status.'),
            );
          }
          setTaskId(null);
          return;
        }

        if (currentStatus === ImageGenerationStatus.FAILED) {
          isActive = false;
          handleErrorFromPolling(textualResponse || tImage('result_waiter.unknown_error'));
          return;
        }

        if (isActive) {
          timeoutId = setTimeout(checkResult, 5000);
        }
      } catch (error) {
        if (isActive) {
          handleErrorFromPolling(error instanceof Error ? error.message : tImage('result_waiter.unknown_error'));
        }
      }
    };

    setTaskResult({ status: ImageGenerationStatus.PENDING });
    checkResult();

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, onImageGenerated, t, tImage, initialPromptBasis.title, initialPromptBasis.content]);

  const handleInternalImageGenerated = (imageData: FileData) => {
    onImageGenerated(imageData);
  };

  const renderModalContent = () => {
    if (taskId && taskResult) {
      if (
        taskResult.status === ImageGenerationStatus.PENDING ||
        taskResult.status === ImageGenerationStatus.PROCESSING
      ) {
        return (
          <Card className="mx-auto w-full max-w-md">
            <CardBody className="flex flex-col items-center justify-center space-y-3 py-8">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="text-default-600">
                {taskResult.status === ImageGenerationStatus.PENDING
                  ? tImage('result_waiter.pending', 'Task is pending...')
                  : tImage('result_waiter.processing', 'Processing image...')}
              </p>
              {taskResult.status === ImageGenerationStatus.PROCESSING && taskResult.response && (
                <p className="text-sm text-default-500">{taskResult.response}</p>
              )}
              <p className="text-sm text-default-400">
                {tImage('result_waiter.processing_description', 'Please wait.')}
              </p>
            </CardBody>
          </Card>
        );
      }
    }

    if (!taskId && taskResult && taskResult.status === ImageGenerationStatus.FAILED) {
      return (
        <Card className="mx-auto w-full max-w-md">
          <CardBody className="flex flex-col items-center justify-center space-y-2 py-8">
            <p className="text-danger">{tImage('result_waiter.failed', 'Failed')}:</p>
            <p className="text-danger-light text-sm">
              {taskResult.error || taskResult.response || tImage('result_waiter.unknown_error')}
            </p>
            <Button
              variant="light"
              onPress={() => setTaskResult(null)}
              className="mt-4">
              {tImage('common.try_again', 'Try Again')}
            </Button>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <Textarea
          label="Base Prompt"
          isReadOnly
          value={basePrompt}
          minRows={3}
        />
        <Textarea
          label="Custom Details"
          placeholder="e.g., vibrant"
          value={customPrompt}
          onValueChange={setCustomPrompt}
          minRows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={tImage('generation_page.style.label', 'Style')}
            selectedKeys={imageStyle ? new Set([imageStyle]) : new Set([''])}
            onSelectionChange={(keys) =>
              setImageStyle((Array.from(keys)[0] as string) === '' ? undefined : (Array.from(keys)[0] as string))
            }
            disabled={loading}
            size="sm">
            <SelectItem
              key=""
              textValue="None">
              {tImage('generation_page.style.none', 'None')}
            </SelectItem>
            <SelectItem
              key={Style.Anime}
              textValue={Style.Anime}>
              {tImage('generation_page.style.anime', Style.Anime)}
            </SelectItem>
            <SelectItem
              key={Style.Cartoon}
              textValue={Style.Cartoon}>
              {tImage('generation_page.style.cartoon', Style.Cartoon)}
            </SelectItem>
            <SelectItem
              key={Style.Realistic}
              textValue={Style.Realistic}>
              {tImage('generation_page.style.realistic', Style.Realistic)}
            </SelectItem>
            <SelectItem
              key={Style.Vintage}
              textValue={Style.Vintage}>
              {tImage('generation_page.style.vintage', Style.Vintage)}
            </SelectItem>
          </Select>

          <Select
            label={tImage('generation_page.color.label', 'Color')}
            selectedKeys={imageColor ? new Set([imageColor]) : new Set([''])}
            onSelectionChange={(keys) =>
              setImageColor((Array.from(keys)[0] as string) === '' ? undefined : (Array.from(keys)[0] as string))
            }
            disabled={loading}
            size="sm">
            <SelectItem
              key=""
              textValue="None">
              {tImage('generation_page.color.none', 'None')}
            </SelectItem>
            <SelectItem
              key={Color.Neutral}
              textValue={Color.Neutral}>
              {tImage('generation_page.color.neutral', Color.Neutral)}
            </SelectItem>
            <SelectItem
              key={Color.Cold}
              textValue={Color.Cold}>
              {tImage('generation_page.color.cold', Color.Cold)}
            </SelectItem>
            <SelectItem
              key={Color.Warm}
              textValue={Color.Warm}>
              {tImage('generation_page.color.warm', Color.Warm)}
            </SelectItem>
            <SelectItem
              key={Color.Monochrome}
              textValue={Color.Monochrome}>
              {tImage('generation_page.color.monochrome', Color.Monochrome)}
            </SelectItem>
          </Select>
        </div>
        <Button
          color="primary"
          size="lg"
          isLoading={loading}
          fullWidth
          onPress={handleGenerate}
          startContent={!loading && <ImageIcon />}>
          {loading
            ? tImage('generation_page.button.generating', 'Generating...')
            : tImage('generation_page.button.generate', 'Generate')}
        </Button>
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          isDismissable={false}
          hideCloseButton
          size="3xl"
          scrollBehavior="inside">
          <ModalContent>
            <ModalHeader className="flex items-center justify-between">
              <h1>{t('dynamic.aiImageGenerationModal.title')}</h1>
              <div className="flex items-center gap-2">
                <BalanceButtonClient alert={0.1} />
                <Button
                  as={Link}
                  href="https://docs.multipost.app/docs/user-guide/ai-draw"
                  target="_blank"
                  size="sm"
                  endContent={<ExternalLinkIcon />}>
                  Learn more
                </Button>
                <Button
                  onPress={closeModal}
                  size="sm"
                  color="danger"
                  isIconOnly>
                  <XIcon />
                </Button>
              </div>
            </ModalHeader>
            <ModalBody className="space-y-6">{renderModalContent()}</ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
