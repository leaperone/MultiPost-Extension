import React, { useState, useEffect, useRef } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Link, Tabs, Tab, Card, addToast } from '@heroui/react';
import { PlusIcon, SquareLibraryIcon, ImagePlusIcon, VideoIcon, UploadIcon } from 'lucide-react';
import Image from 'next/image';
import { listAllImages, listAllPosters } from '@/actions/draw/list';
import { useTranslation } from '@/i18n/client';
import { cn } from '@/lib/utils';

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

export default function LibraryModal({ onSelectImage, existingFiles = [] }: LibraryModalProps) {
  const { t } = useTranslation('publish');
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(false);
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

  const renderGrid = (type: 'images' | 'posters') => {
    const data = items[type];
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="text-center text-gray-500">{type === 'images' ? '暂无已生成图片' : '暂无已生成海报'}</div>
          <Button
            as={Link}
            href={`/dashboard/draw/${type === 'images' ? 'image' : 'poster'}`}
            color="primary"
            size="sm">
            {type === 'images' ? '去生成图片' : '去生成海报'}
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        <Card
          isPressable
          as={Link}
          href={`/dashboard/draw/${type === 'images' ? 'image' : 'poster'}`}
          target="_blank"
          className="flex size-full items-center justify-center">
          <PlusIcon className="size-8" />
        </Card>
        {type === 'images'
          ? items.images.map((item) =>
              (item.result || []).map((i, idx) => (
                <Card
                  key={`${item.id}-${idx}`}
                  isPressable={true}
                  onPress={() =>
                    onSelectImage?.({
                      name: `image-${item.id}-${idx}`,
                      url: i.url,
                      type: 'image/png',
                      size: 0,
                    })
                  }
                  className="group flex flex-col items-center overflow-hidden rounded-2xl p-0">
                  <div className="relative aspect-square w-full">
                    <Image
                      src={i.url}
                      alt={item.prompt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="text-sm text-white">点击选择</span>
                    </div>
                  </div>
                </Card>
              )),
            )
          : items.posters.map((item) => (
              <Card
                key={`poster-${item.taskId || item.id}`}
                isPressable={!!item.lastImageUrl}
                onPress={() => {
                  if (item.lastImageUrl) {
                    onSelectImage?.({
                      name: `poster-${item.taskId || item.id}`,
                      url: item.lastImageUrl,
                      type: 'image/png',
                      size: 0,
                    });
                  }
                }}
                className="group flex flex-col items-center overflow-hidden rounded-2xl p-0">
                <div className="relative aspect-square w-full">
                  {item.lastImageUrl ? (
                    <>
                      <Image
                        src={item.lastImageUrl}
                        alt={`Poster ${item.taskId || item.id}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="text-sm text-white">点击选择</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex size-full items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                      无图片
                    </div>
                  )}
                </div>
              </Card>
            ))}
      </div>
    );
  };

  return (
    <>
      <Button
        isIconOnly
        color="primary"
        onPress={() => setIsOpen(true)}>
        <SquareLibraryIcon />
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleCloseModal}
        scrollBehavior="inside"
        size="4xl"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>素材库</ModalHeader>
          <ModalBody>
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col items-center gap-2">
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'image')}
                  className="hidden"
                  multiple
                />
                <Button
                  isIconOnly
                  variant="light"
                  onPress={() => imageInputRef.current?.click()}>
                  <ImagePlusIcon className="size-8 text-gray-600" />
                </Button>
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/*"
                  onChange={(e) => handleFileChange(e, 'video')}
                  className="hidden"
                  multiple
                />
                <Button
                  isIconOnly
                  variant="light"
                  onPress={() => videoInputRef.current?.click()}>
                  <VideoIcon className="size-8 text-gray-600" />
                </Button>
              </div>
              <div
                className={cn(
                  'relative flex min-h-[80px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-all',
                  'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50',
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  const imageFiles = files.filter((file) => file.type.startsWith('image/'));
                  if (imageFiles.length > 0) handleFilesDrop(imageFiles, 'image');
                }}>
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <UploadIcon className="size-8 text-gray-500" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{t('dynamic.tips.dragAndDrop')}</p>
                    <p className="text-xs text-gray-500">{t('dynamic.tips.supportedFiles')}</p>
                  </div>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-gray-400">加载中...</div>
            ) : (
              <Tabs
                variant="underlined"
                classNames={{ tabList: 'gap-6', cursor: 'w-full bg-primary' }}>
                <Tab
                  key="images"
                  title="图片库">
                  {renderGrid('images')}
                </Tab>
                <Tab
                  key="posters"
                  title="海报库"
                  isDisabled>
                  {renderGrid('posters')}
                </Tab>
              </Tabs>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
