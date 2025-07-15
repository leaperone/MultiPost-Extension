import React, { useState, useEffect, useRef } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Tabs, Tab, Card, addToast } from '@heroui/react';
import Image from 'next/image';
import { listAllImages, listAllPosters } from '@/actions/draw/list';
import { useTranslation } from '@/i18n/client';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

interface FileData {
  name: string;
  type: string;
  size: number;
  url: string;
  hash?: string;
  file?: File;
}

interface ImageGenerationItem {
  id: string;
  result: { url: string; revised_prompt: string }[];
  prompt: string;
  createdAt: string;
}

interface PosterItem {
  id: string;
  prompt: string;
  createdAt: string;
  lastImageUrl?: string | null;
  taskId: string;
}

interface LibraryModalProps {
  onSelectImage?: (fileData: FileData) => void;
  existingFiles?: FileData[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const isDuplicateFile = async (file: File, existingFiles: FileData[]): Promise<boolean> => {
  const fileHash = await getFileHash(file);
  return existingFiles.some((existingFile) => existingFile.hash === fileHash);
};

export default function LibraryModal({ onSelectImage, existingFiles = [], isOpen, onOpenChange }: LibraryModalProps) {
  const { t } = useTranslation('publish');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ images: ImageGenerationItem[]; posters: PosterItem[] }>({
    images: [],
    posters: [],
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [imagesRes, postersRes] = await Promise.all([listAllImages(), listAllPosters()]);
        setItems({
          images: (imagesRes?.data || []).map((item) => ({
            id: item.id,
            result: Array.isArray(item.result)
              ? item.result
                  .filter(
                    (r): r is { url: string; revised_prompt: string } =>
                      r !== null && typeof r === 'object' && 'url' in r && 'revised_prompt' in r,
                  )
                  .map((r) => ({
                    url: r.url,
                    revised_prompt: r.revised_prompt,
                  }))
              : [],
            prompt: item.prompt,
            createdAt: new Date(item.createdAt).toISOString(),
          })),
          posters: (postersRes?.data || []).map((item) => ({
            id: item.id,
            prompt: item.prompt,
            lastImageUrl: item.lastImageUrl ?? null,
            createdAt: new Date(item.createdAt).toISOString(),
            taskId: item.taskId ?? '',
          })),
        });
      } catch (error) {
        console.error('Failed to fetch library items:', error);
        addToast({
          title: '加载失败',
          description: '无法加载素材库内容',
          color: 'danger',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  const handleCloseModal = () => {
    setLoading(false);
    setItems({ images: [], posters: [] });
    items.images.forEach((item) =>
      item.result.forEach((r) => {
        if (r.url.startsWith('blob:')) URL.revokeObjectURL(r.url);
      }),
    );
    items.posters.forEach((item) => {
      if (item.lastImageUrl?.startsWith('blob:')) URL.revokeObjectURL(item.lastImageUrl);
    });
    onOpenChange(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) return;

    const newFiles: FileData[] = [];
    const duplicates: string[] = [];

    await Promise.all(
      Array.from(selectedFiles).map(async (file) => {
        if (!file.type.startsWith(fileType + '/')) return;

        const isDuplicate = await isDuplicateFile(file, existingFiles);
        if (isDuplicate) {
          duplicates.push(file.name);
          return;
        }

        const fileHash = await getFileHash(file);
        newFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          hash: fileHash,
          file: file,
        });
      }),
    );

    if (duplicates.length > 0) {
      addToast({
        title: t('upload.duplicateFiles'),
        description: `${t('upload.duplicateFilesDesc')}: ${duplicates.join(', ')}`,
        color: 'warning',
      });
    }

    if (newFiles.length > 0 && fileType === 'image') {
      for (const fileData of newFiles) {
        onSelectImage?.(fileData);
      }
      handleCloseModal();
    }

    event.target.value = '';
  };

  const handleFilesDrop = async (files: File[], type: 'image' | 'video') => {
    if (type !== 'image') return;

    const newFiles: FileData[] = [];
    const duplicates: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const isDuplicate = await isDuplicateFile(file, existingFiles);
      if (isDuplicate) {
        duplicates.push(file.name);
        continue;
      }

      const fileHash = await getFileHash(file);
      newFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        hash: fileHash,
        file: file,
      });
    }

    if (duplicates.length > 0) {
      addToast({
        title: t('upload.duplicateFiles'),
        description: `${t('upload.duplicateFilesDesc')}: ${duplicates.join(', ')}`,
        color: 'warning',
      });
    }

    for (const fileData of newFiles) {
      onSelectImage?.(fileData);
    }

    if (newFiles.length > 0) {
      handleCloseModal();
    }
  };

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const isDuplicate = await isDuplicateFile(file, existingFiles);
            if (isDuplicate) {
              addToast({
                title: t('upload.duplicateFiles'),
                description: `${t('upload.duplicateFilesDesc')}: pasted-image`,
                color: 'warning',
              });
              continue;
            }

            const fileHash = await getFileHash(file);
            const fileData: FileData = {
              name: `pasted-image-${Date.now()}.${item.type.split('/')[1]}`,
              type: item.type,
              size: file.size,
              url: URL.createObjectURL(file),
              hash: fileHash,
              file,
            };
            onSelectImage?.(fileData);
            handleCloseModal();
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingFiles, onSelectImage, t]);

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    await handleFilesDrop(droppedFiles, 'image');
  };

  const renderGrid = (type: 'images' | 'posters') => {
    const data = type === 'images' ? items.images : items.posters;

    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <Card
          isPressable
          className="group relative flex aspect-square items-center justify-center bg-content2"
          onPress={() => {
            router.push(type === 'images' ? '/dashboard/draw/image' : '/dashboard/draw/poster');
            handleCloseModal();
          }}>
          <div className="flex flex-col items-center gap-2 text-foreground-500">
            <Plus size={48} />
          </div>
        </Card>
        {data.map((item) => (
          <Card
            isPressable
            key={item.id}
            className="group relative aspect-square"
            onPress={() => {
              const urlToUse =
                type === 'images' ? (item as ImageGenerationItem).result[0]?.url : (item as PosterItem).lastImageUrl;
              if (urlToUse) {
                fetch(urlToUse)
                  .then((res) => res.blob())
                  .then(async (blob) => {
                    const file = new File([blob], 'image.png', { type: blob.type });
                    const fileHash = await getFileHash(file);
                    const isDuplicate = existingFiles.some((ef) => ef.hash === fileHash);

                    if (isDuplicate) {
                      addToast({
                        title: t('upload.duplicateFiles'),
                        description: t('upload.duplicateFilesDesc'),
                        color: 'warning',
                      });
                      return;
                    }

                    onSelectImage?.({
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      url: urlToUse,
                      hash: fileHash,
                      file,
                    });
                    handleCloseModal();
                  });
              }
            }}>
            <Image
              src={
                (type === 'images'
                  ? (item as ImageGenerationItem).result[0]?.url
                  : (item as PosterItem).lastImageUrl) || '/placeholder.png'
              }
              alt={item.prompt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <p className="line-clamp-2 text-xs">{item.prompt}</p>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => handleFileChange(e, 'image')}
      />
      <input
        type="file"
        ref={videoInputRef}
        className="hidden"
        accept="video/*"
        multiple
        onChange={(e) => handleFileChange(e, 'video')}
      />

      <Modal
        size="5xl"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        scrollBehavior="inside"
        onClose={handleCloseModal}>
        <ModalContent
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}>
          <ModalHeader className="flex flex-col gap-1">{t('library.title')}</ModalHeader>
          <ModalBody>
            <Tabs aria-label="Library tabs">
              <Tab
                key="images"
                title={t('library.images')}>
                {loading ? <p>{t('library.loading')}</p> : renderGrid('images')}
              </Tab>
              <Tab
                key="posters"
                title={t('library.posters')}>
                {loading ? <p>{t('library.loading')}</p> : renderGrid('posters')}
              </Tab>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
