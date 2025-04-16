'use client';

import { Button, Card, CardBody, Input, Image, Skeleton } from '@heroui/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRightIcon, GlobeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/i18n/client';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

interface ScrapedData {
  content: string;
  title: string;
  description: string;
  images: Record<string, string>;
  links: Record<string, string>;
  url: string;
}

interface ApiResponse {
  success: boolean;
  data: ScrapedData;
  meta: {
    credits: number;
  };
  error?: string;
}

export default function WebScraperPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [visible, setVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { t } = useTranslation('scraper');

  const formatUrl = (inputUrl: string) => {
    // 移除首尾空格
    let formattedUrl = inputUrl.trim();

    // 如果 URL 不是以 http:// 或 https:// 开头，添加 https://
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    return formattedUrl;
  };

  const handleScrape = async () => {
    if (!url) {
      toast.error(t('url_required'));
      return;
    }

    const formattedUrl = formatUrl(url);

    try {
      setLoading(true);
      const response = await fetch('/api/v1/reader', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          returnFormat: 'markdown',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setResult(data);
      toast.success(t('scrape_success'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('scrape_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-[80vh] w-full flex-col transition-all duration-500',
        !result && !loading ? 'justify-center' : 'justify-start',
      )}>
      <div
        className={cn('mx-auto w-full max-w-3xl transition-all duration-500', !result && !loading ? 'mb-20' : 'mb-6')}>
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('url_placeholder')}
            value={url}
            size="lg"
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            startContent={<GlobeIcon className="size-4" />}
            classNames={{
              input: 'rounded-full bg-white/80 backdrop-blur-sm',
              inputWrapper: 'rounded-full shadow-lg',
            }}
          />
          <Button
            isIconOnly
            color="primary"
            isLoading={loading}
            onPress={handleScrape}
            className="rounded-full shadow-lg">
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      {(loading || result) && (
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 animate-in fade-in slide-in-from-bottom-4 lg:grid-cols-[1fr,1.5fr]">
          {/* 左侧列：基本信息、图片预览、链接列表 */}
          <div className="space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardBody>
                <h3 className="mb-4 text-lg font-medium">{t('basic_info')}</h3>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                ) : (
                  result && (
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">{t('title')}: </span>
                        {result.data.title}
                      </div>
                      <div>
                        <span className="font-medium">{t('description')}: </span>
                        {result.data.description}
                      </div>
                    </div>
                  )
                )}
              </CardBody>
            </Card>

            {/* 图片预览 */}
            <Card className="h-[400px]">
              <CardBody className="h-full p-6">
                <div className="flex h-full flex-col">
                  <h3 className="mb-4 text-lg font-medium">{t('image_preview')}</h3>
                  {loading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton
                          key={i}
                          className="aspect-video w-full rounded-lg"
                        />
                      ))}
                    </div>
                  ) : (
                    result &&
                    Object.entries(result.data.images).length > 0 && (
                      <ScrollArea className="flex-1">
                        <div className="grid grid-cols-2 gap-4 pr-4">
                          {Object.entries(result.data.images).map(([name, url], index) => (
                            <div
                              key={name}
                              className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border"
                              onClick={() => {
                                setActiveImageIndex(index);
                                setVisible(true);
                              }}>
                              <Image
                                src={url}
                                alt={name}
                                className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )
                  )}
                </div>
              </CardBody>
            </Card>

            {/* 链接列表 */}
            <Card className="h-[400px]">
              <CardBody className="h-full p-6">
                <div className="flex h-full flex-col">
                  <h3 className="mb-4 text-lg font-medium">{t('link_list')}</h3>
                  {loading ? (
                    <div className="grid gap-2">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton
                          key={i}
                          className="h-10 w-full rounded-lg"
                        />
                      ))}
                    </div>
                  ) : (
                    result &&
                    Object.entries(result.data.links).length > 0 && (
                      <ScrollArea className="flex-1">
                        <div className="grid gap-2 pr-4">
                          {Object.entries(result.data.links).map(([name, url]) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate rounded-lg border p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                              {name || url}
                            </a>
                          ))}
                        </div>
                      </ScrollArea>
                    )
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 右侧列：正文内容 */}
          <Card className="h-[calc(100vh-12rem)]">
            <CardBody className="h-full p-6">
              <div className="flex h-full flex-col">
                <h3 className="mb-4 text-lg font-medium">{t('content')}</h3>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-4 w-full"
                      />
                    ))}
                  </div>
                ) : (
                  result && (
                    <ScrollArea className="flex-1">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap pr-4 dark:prose-invert">
                        {result.data.content}
                      </div>
                    </ScrollArea>
                  )
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {result && (
        <Viewer
          visible={visible}
          onClose={() => setVisible(false)}
          images={Object.entries(result.data.images).map(([name, url]) => ({
            src: url,
            alt: name,
          }))}
          activeIndex={activeImageIndex}
          onMaskClick={() => setVisible(false)}
        />
      )}
    </div>
  );
}
