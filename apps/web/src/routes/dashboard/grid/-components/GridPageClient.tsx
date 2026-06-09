import { Button, Card, Image, Switch } from '@heroui/react';
import { DownloadIcon, ImagePlusIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

import { useTranslation } from '../../../../i18n/client';

export default function GridPageClient() {
  const { t } = useTranslation('publish');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [gridImages, setGridImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [trimEdges, setTrimEdges] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setSelectedImage(imageUrl);
        setGridImages([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateGridImages = useCallback(async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      const img = document.createElement('img');
      img.src = selectedImage;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image failed to load'));
      });

      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to create canvas context');

      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);

      const gridSize = size / 3;
      const trimSize = trimEdges ? Math.ceil(gridSize * 0.01) : 0;
      const newGridImages: string[] = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const gridCanvas = document.createElement('canvas');
          const gridCtx = gridCanvas.getContext('2d');
          if (!gridCtx) continue;

          const finalGridSize = gridSize - (trimEdges ? trimSize * 2 : 0);
          gridCanvas.width = finalGridSize;
          gridCanvas.height = finalGridSize;

          const sourceX = col * gridSize + (trimEdges ? trimSize : 0);
          const sourceY = row * gridSize + (trimEdges ? trimSize : 0);
          const sourceWidth = gridSize - (trimEdges ? trimSize * 2 : 0);
          const sourceHeight = gridSize - (trimEdges ? trimSize * 2 : 0);

          gridCtx.drawImage(
            canvas,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            finalGridSize,
            finalGridSize,
          );

          newGridImages.push(gridCanvas.toDataURL('image/jpeg', 0.95));
        }
      }

      setGridImages(newGridImages);
    } catch (error) {
      console.error('Failed to generate grid images:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, trimEdges]);

  const handleDownload = useCallback(async () => {
    if (gridImages.length === 0) return;

    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const promises = gridImages.map(async (dataUrl, index) => {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        zip.file(`grid_${String(index + 1).padStart(2, '0')}.jpg`, blob);
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'grid_images.zip');
    } catch (error) {
      console.error('Failed to download grid images:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [gridImages]);

  return (
    <div className="h-screen overflow-y-auto bg-background p-6 sm:p-8 lg:p-10">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="grid-image-upload"
            />
            <label
              htmlFor="grid-image-upload"
              className="flex cursor-pointer flex-col items-center space-y-2">
              <ImagePlusIcon className="size-12 text-gray-400" />
              <span className="text-sm text-gray-500">{t('grid.uploadImage')}</span>
            </label>
          </div>

          {selectedImage && (
            <div className="mt-4">
              <div className="flex flex-col items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-medium">{t('grid.preview')}</h3>
                  <div className="relative mx-auto aspect-square w-full max-w-md">
                    <Image
                      src={selectedImage}
                      alt="Selected image"
                      className="rounded-lg object-cover"
                      width={400}
                      height={400}
                    />
                  </div>
                </div>
                <div className="flex w-full flex-row items-center justify-between pt-10">
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      isSelected={trimEdges}
                      onValueChange={setTrimEdges}
                    />
                    <span className="text-sm text-gray-600">{t('grid.trimEdges')}</span>
                  </div>
                  <Button
                    color="primary"
                    isDisabled={!selectedImage || isProcessing}
                    isLoading={isProcessing}
                    onPress={generateGridImages}>
                    {t('grid.generate')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {gridImages.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-lg font-medium">{t('grid.result')}</h3>
              <div className="mx-auto grid max-w-md grid-cols-3 gap-0.5">
                {gridImages.map((src, index) => (
                  <div
                    key={index}
                    className="relative aspect-square">
                    <Image
                      src={src}
                      alt={`Grid image ${index + 1}`}
                      className="rounded-none object-cover"
                      width={133}
                      height={133}
                    />
                    <div className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-xs text-white">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center">
                <Button
                  color="secondary"
                  size="lg"
                  className="min-w-40"
                  isDisabled={isDownloading}
                  isLoading={isDownloading}
                  onPress={handleDownload}
                  startContent={<DownloadIcon className="size-4" />}>
                  {t('grid.download')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
