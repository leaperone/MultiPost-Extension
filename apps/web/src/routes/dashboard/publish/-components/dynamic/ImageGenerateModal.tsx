import { Suspense, lazy, useMemo, useState } from 'react';
import { z } from 'zod';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Image, Card, CardBody } from '@heroui/react';
import { GenerationForm } from '../image/GenerationForm';
import { ResultWaiter } from '../image/ResultWaiter';
import { ImageGenerationSchema, ImageGenerationStatus } from '../../../../../actions/draw/image/types';
import { toast } from 'sonner';
import { FileImage, Download } from 'lucide-react';
import { useTranslation } from '@/src/i18n/client';
import { newImageGeneration } from '../../../../../actions/draw/image';

const Viewer = lazy(() => import('react-viewer'));

interface TaskStatus {
  status: string;
  images?: string[];
  error?: string;
}

interface ImageGenerateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImageGenerated: (fileData: { url: string; name: string }) => void;
  title?: string;
  content?: string;
}

export function ImageGenerateModal({
  isOpen,
  onOpenChange,
  onImageGenerated,
  title: draftTitle,
  content: draftContent,
}: ImageGenerateModalProps) {
  const { t } = useTranslation('publish');
  type Step = 'form' | 'generating' | 'result';

  const [step, setStep] = useState<Step>('form');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [leaperOneId, setLeaperOneId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeContent, setIncludeContent] = useState(true);

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

    setTaskStatus(null);
    setGenerationId(null);
    setStep('generating');

    try {
      const createResponse = await newImageGeneration({ data });
      if (!createResponse.success || !createResponse.data?.id || !createResponse.data?.leaperOneId) {
        throw new Error(createResponse.error || t('aiImage.toast.createTaskFailed'));
      }
      setGenerationId(createResponse.data.id);
      setLeaperOneId(createResponse.data.leaperOneId);
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
    setLeaperOneId(null);
    setStep('form');
  };

  const handleInsert = () => {
    if (taskStatus?.images && taskStatus.images.length > 0 && onImageGenerated) {
      onImageGenerated({ url: taskStatus.images[0], name: 'Generated Image' });
      onOpenChange(false);
    }
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      toast.loading('Downloading...');
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
      toast.error('Download failed');
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
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="3xl">
      <ModalContent>
        <ModalHeader>{t('dynamic.aiGenerate', 'AI 生成图片')}</ModalHeader>
        <ModalBody className="max-h-[70vh] overflow-y-auto">
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
              />
            </div>
          )}

          {step === 'generating' && generationId && leaperOneId && (
            <ResultWaiter
              taskId={generationId}
              leaperOneId={leaperOneId}
              onError={handleError}
              onStatusChange={handleStatusChange}
            />
          )}

          {step === 'result' && taskStatus?.status === ImageGenerationStatus.COMPLETED && taskStatus.images && (
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

              <Suspense fallback={null}>
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
              </Suspense>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {step === 'form' && (
            <Button
              variant="light"
              onPress={() => onOpenChange(false)}>
              {t('actions.cancel', '取消')}
            </Button>
          )}
          {step === 'result' && (
            <div className="flex w-full items-center justify-between">
              <Button
                onClick={handleStartOver}
                variant="flat">
                {t('aiImage.generateAgain')}
              </Button>
              <div className="flex gap-2">
                <Button
                  color="primary"
                  onClick={handleInsert}
                  startContent={<FileImage className="size-4" />}
                  isDisabled={!taskStatus?.images || taskStatus.images.length === 0}>
                  {t('dynamic.insertImage', '插入图片')}
                </Button>
                {taskStatus?.images?.map((imageUrl, index) => (
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
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
