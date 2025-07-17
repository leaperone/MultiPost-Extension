'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Spinner, Button, Progress } from '@heroui/react';
import { Image as ImageIcon, Eye, Plus, X, Upload, RefreshCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getUserImageFiles } from '../actions';
import { FileHosting } from '../types';
import { toast } from 'sonner';
import ky from 'ky';
import { useTranslation } from '@/i18n/client';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

interface MediaLibraryProps {
  onSelectImage?: (imageFile: FileHosting) => void;
}

interface ImagePreviewProps {
  imageFile: FileHosting;
  onPreview: () => void;
  onAddToDraft: () => void;
  onDelete: () => void;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

/**
 * Image Preview Component
 * @description Displays a single image with hover overlay and action buttons
 */
function ImagePreview({ imageFile, onPreview, onAddToDraft, onDelete }: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadImageUrl = async () => {
      try {
        setLoading(true);
        const url = await getImageUrl(imageFile);
        setImageUrl(url);
      } catch (error) {
        console.error('Failed to load image URL:', error);
        setImageUrl('');
      } finally {
        setLoading(false);
      }
    };

    loadImageUrl();
  }, [imageFile]);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  return (
    <div className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100">
      {/* Image */}
      {loading ? (
        <div className="flex size-full items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={imageFile.filename || 'Uploaded image'}
          className="size-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02MCA2MEgxNDBWMTQwSDYwVjYwWiIgZmlsbD0iI0Q1RDdEQSIvPgo8cGF0aCBkPSJNODAgODBIOTBMOTUgOTBIMTAwTDEwNSA4MEgxMjBWMTIwSDgwVjgwWiIgZmlsbD0iI0EzQTNBMyIvPgo8Y2lyY2xlIGN4PSI5MCIgY3k9IjkwIiByPSI1IiBmaWxsPSIjQTNBM0EzIi8+Cjwvc3ZnPgo=';
          }}
        />
      )}

      {/* Delete Button - Top Right Corner */}
      <div className="absolute right-1 top-1 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          isLoading={deleting}
          className="border border-red-300 bg-red-500/20 text-red-600 backdrop-blur-sm hover:bg-red-500/30"
          onPress={handleDelete}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 z-10 flex items-end justify-center gap-1 bg-black/50 pb-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {/* Preview Button */}
        <Button
          isIconOnly
          size="lg"
          variant="flat"
          className="border border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
          onPress={onPreview}>
          <Eye className="size-5" />
        </Button>

        {/* Add to Draft Button */}
        <Button
          isIconOnly
          size="lg"
          variant="flat"
          className="border border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
          onPress={onAddToDraft}>
          <Plus className="size-5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Upload Progress Component
 * @description Displays upload progress for individual files
 */
function UploadProgressItem({ uploadItem }: { uploadItem: UploadProgress }) {
  const { t } = useTranslation('draft');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="truncate text-sm font-medium">{uploadItem.file.name}</span>
        <span className="text-xs text-gray-500">
          {uploadItem.status === 'uploading' && `${Math.round(uploadItem.progress)}%`}
          {uploadItem.status === 'success' && t('mediaLibrary.complete')}
          {uploadItem.status === 'error' && t('mediaLibrary.failed')}
        </span>
      </div>
      <Progress
        value={uploadItem.progress}
        color={uploadItem.status === 'error' ? 'danger' : uploadItem.status === 'success' ? 'success' : 'primary'}
        size="sm"
      />
      {uploadItem.status === 'error' && uploadItem.error && (
        <p className="mt-1 text-xs text-red-500">{uploadItem.error}</p>
      )}
    </div>
  );
}

/**
 * Get image URL from file hosting service
 */
async function getImageUrl(imageFile: FileHosting): Promise<string> {
  // Check if preview URL is already available
  if (imageFile.previewUrl) {
    return imageFile.previewUrl;
  }

  try {
    const data = await ky.get(`/api/v1/file/${imageFile.id}/preview`).json<{
      code: number;
      data: {
        previewUrl: string;
      };
    }>();

    if (data.code === 0) {
      return data.data.previewUrl;
    }
  } catch (error) {
    console.error('Failed to fetch preview URL:', error);
  }

  return '';
}

/**
 * Upload single file to server
 */
async function uploadSingleFile(file: File, onProgress: (progress: number) => void): Promise<void> {
  try {
    // Step 1: Create file record and get upload URL
    const createResponse = await ky
      .post('/api/v1/file/create', {
        json: {
          filename: file.name,
        },
      })
      .json<{
        code: number;
        data: {
          fileId: string;
          url: string;
        };
      }>();

    if (createResponse.code !== 0) {
      throw new Error('Failed to create file record');
    }

    const { fileId, url: uploadUrl } = createResponse.data;

    // Step 2: Upload file to presigned URL
    const xhr = new XMLHttpRequest();

    await new Promise<void>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 80; // 80% for upload
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(80);
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    // Step 3: Get preview URL for image files
    if (file.type.startsWith('image/')) {
      onProgress(90);
      try {
        const previewResponse = await ky.get(`/api/v1/file/${fileId}/preview`).json<{
          code: number;
          data: {
            previewUrl: string;
          };
        }>();

        if (previewResponse.code !== 0) {
          console.warn('Failed to get preview URL, but upload succeeded');
        }
      } catch (error) {
        console.warn('Failed to get preview URL:', error);
      }
    }

    onProgress(100);
  } catch (error) {
    throw error;
  }
}

/**
 * Media Library Component
 * @description Displays user uploaded image files with infinite scroll
 */
export default function MediaLibrary({ onSelectImage }: MediaLibraryProps) {
  const { t } = useTranslation('draft');
  const [imageFiles, setImageFiles] = useState<FileHosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState<Array<{ src: string; alt: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch image files on component mount
  useEffect(() => {
    fetchImageFiles();
  }, []);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!containerRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    const sentinel = containerRef.current.querySelector('.scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore]);

  /**
   * Fetch user's image files from server
   */
  const fetchImageFiles = async () => {
    try {
      setLoading(true);
      const response = await getUserImageFiles();

      if (response.success && response.data) {
        setImageFiles(response.data);
        // For now, we'll assume all files are loaded at once
        // In a real implementation with pagination, you'd set hasMore based on response
        setHasMore(false);
      } else {
        toast.error(response.error || t('mediaLibrary.loadImagesFailed'));
      }
    } catch (error) {
      toast.error(t('mediaLibrary.loadImagesError'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load more images (for future pagination implementation)
   */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      // Here you would implement actual pagination
      // For now, we just simulate it
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHasMore(false);
    } catch (error) {
      toast.error(t('mediaLibrary.loadMoreFailed'));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  /**
   * Handle image preview with react-viewer
   */
  const handlePreviewImage = async (imageFile: FileHosting, index: number) => {
    try {
      // Prepare all images for viewer
      const images = await Promise.all(
        imageFiles.map(async (file) => {
          const url = await getImageUrl(file);
          return {
            src: url,
            alt: file.filename || 'Uploaded image',
          };
        }),
      );

      setViewerImages(images);
      setActiveIndex(index);
      setViewerVisible(true);
    } catch (error) {
      console.error('Failed to prepare images for viewer:', error);
      toast.error(t('mediaLibrary.previewFailed'));
    }
  };

  /**
   * Handle add image to draft
   */
  const handleAddToDraft = (imageFile: FileHosting) => {
    if (onSelectImage) {
      onSelectImage(imageFile);
    }
  };

  /**
   * Handle delete image
   */
  const handleDeleteImage = async (imageFile: FileHosting) => {
    try {
      const response = await ky.post(`/api/v1/file/${imageFile.id}/delete`).json<{
        code: number;
        message?: string;
      }>();

      if (response.code === 0) {
        // Remove image from local state
        setImageFiles((prev) => prev.filter((file) => file.id !== imageFile.id));
        toast.success(t('mediaLibrary.deleteSuccess'));
      } else {
        throw new Error(response.message || t('mediaLibrary.deleteFailed'));
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error(t('mediaLibrary.deleteFailed'));
    }
  };

  /**
   * Handle file selection for upload
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error(t('mediaLibrary.selectImageFiles'));
      return;
    }

    handleUpload(imageFiles);
    // Reset input value
    event.target.value = '';
  };

  /**
   * Handle batch upload
   */
  const handleUpload = async (files: File[]) => {
    if (uploading) return;

    setUploading(true);

    // Initialize upload progress for all files
    const initialProgress: UploadProgress[] = files.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }));
    setUploadProgress(initialProgress);

    let successCount = 0;
    const uploadPromises = files.map(async (file, index) => {
      try {
        await uploadSingleFile(file, (progress) => {
          setUploadProgress((prev) => prev.map((item, i) => (i === index ? { ...item, progress } : item)));
        });

        // Mark as success
        setUploadProgress((prev) =>
          prev.map((item, i) => (i === index ? { ...item, status: 'success', progress: 100 } : item)),
        );
        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Mark as error
        setUploadProgress((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  status: 'error',
                  error: error instanceof Error ? error.message : '上传失败',
                }
              : item,
          ),
        );
      }
    });

    await Promise.all(uploadPromises);

    // Show result notification
    if (successCount === files.length) {
      toast.success(t('mediaLibrary.uploadSuccessAll', { count: successCount }));
    } else if (successCount > 0) {
      toast.success(
        t('mediaLibrary.uploadSuccessPartial', {
          success: successCount,
          failed: files.length - successCount,
        }),
      );
    } else {
      toast.error(t('mediaLibrary.uploadFailedAll'));
    }

    // Clear upload progress after 3 seconds
    setTimeout(() => {
      setUploadProgress([]);
    }, 3000);

    setUploading(false);

    // Always refresh image list after all files are processed (success or failed)
    // This ensures we show any successfully uploaded images
    if (successCount > 0) {
      await fetchImageFiles();
    }
  };

  return (
    <div
      className="space-y-4"
      ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-center">
        {/* <div className="flex items-center gap-2">
          <ImageIcon className="size-5" />
          <h3 className="text-lg font-semibold">{t('mediaLibrary.title')}</h3>
          <span className="text-sm text-gray-500">({t('mediaLibrary.imageCount', { count: imageFiles.length })})</span>
        </div> */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            startContent={<Upload className="size-4" />}
            isLoading={uploading}
            onPress={() => fileInputRef.current?.click()}>
            {/* {t('mediaLibrary.uploadImages')} */}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => fetchImageFiles()}
            startContent={<RefreshCcw className="size-4" />}
            isLoading={loading}>
            {/* {t('mediaLibrary.refresh')} */}
          </Button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('mediaLibrary.uploadProgress')}</h4>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {uploadProgress.map((item, index) => (
              <UploadProgressItem
                key={index}
                uploadItem={item}
              />
            ))}
          </div>
        </div>
      )}

      {/* Image Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : imageFiles.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <ImageIcon className="mx-auto mb-4 size-12 opacity-50" />
          <p>{t('mediaLibrary.noImages')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {imageFiles.map((imageFile, index) => (
              <ImagePreview
                key={imageFile.id}
                imageFile={imageFile}
                onPreview={() => handlePreviewImage(imageFile, index)}
                onAddToDraft={() => handleAddToDraft(imageFile)}
                onDelete={() => handleDeleteImage(imageFile)}
              />
            ))}
          </div>

          {/* Loading more indicator */}
          {hasMore && !loading && (
            <div className="scroll-sentinel flex justify-center py-4">{loadingMore && <Spinner size="sm" />}</div>
          )}
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* React Viewer */}
      {viewerVisible && (
        <Viewer
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          images={viewerImages}
          activeIndex={activeIndex}
          onChange={(_, index) => setActiveIndex(index)}
        />
      )}
    </div>
  );
}
