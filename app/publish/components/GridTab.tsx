'use client';

import React, { useState, useCallback } from 'react';
import { Card, Button, Image, Switch } from '@heroui/react';
import { ImagePlusIcon, DownloadIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function GridTab() {
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
        setGridImages([]); // 清空之前的九宫格
      };
      reader.readAsDataURL(file);
    }
  };

  const generateGridImages = useCallback(async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      // 创建原始图片对象
      const img = document.createElement('img');
      img.src = selectedImage;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
      });

      // 计算裁剪尺寸
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;

      // 创建临时画布
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建 canvas context');

      // 设置画布大小为正方形
      canvas.width = size;
      canvas.height = size;

      // 将图片绘制到画布上，并裁剪为正方形
      ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);

      // 计算每个格子的大小和边缘裁剪量
      const gridSize = size / 3;
      const trimSize = trimEdges ? Math.ceil(gridSize * 0.01) : 0; // 将裁剪比例从 2% 减小到 1%
      const newGridImages: string[] = [];

      // 生成9个格子
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          // 创建新的画布用于存储单个格子
          const gridCanvas = document.createElement('canvas');
          const gridCtx = gridCanvas.getContext('2d');
          if (!gridCtx) continue;

          // 设置格子画布的大小（考虑边缘裁剪）
          const finalGridSize = gridSize - (trimEdges ? trimSize * 2 : 0);
          gridCanvas.width = finalGridSize;
          gridCanvas.height = finalGridSize;

          // 计算源图像区域（添加边缘裁剪）
          const sourceX = col * gridSize + (trimEdges ? trimSize : 0);
          const sourceY = row * gridSize + (trimEdges ? trimSize : 0);
          const sourceWidth = gridSize - (trimEdges ? trimSize * 2 : 0);
          const sourceHeight = gridSize - (trimEdges ? trimSize * 2 : 0);

          // 将对应区域的图像绘制到格子画布上
          gridCtx.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, finalGridSize, finalGridSize);

          // 将格子转换为 base64 图片
          newGridImages.push(gridCanvas.toDataURL('image/jpeg', 0.95));
        }
      }

      setGridImages(newGridImages);
    } catch (error) {
      console.error('生成九宫格失败:', error);
      // 这里可以添加错误提示
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
        // 将 base64 转换为 Blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        // 添加到 zip，使用从1开始的序号
        zip.file(`grid_${String(index + 1).padStart(2, '0')}.jpg`, blob);
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'grid_images.zip');
    } catch (error) {
      console.error('下载失败:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [gridImages]);

  return (
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
  );
}
