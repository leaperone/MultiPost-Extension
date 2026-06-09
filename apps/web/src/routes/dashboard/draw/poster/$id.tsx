import React from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { getIframeUrl } from '../../../../actions/draw/poster';
import { ExportImageButton } from '../-components/poster/ExportImageButton';
import { ExportHtmlButton } from '../-components/poster/ExportHtmlButton';
import { Spacer } from '@heroui/react';
import { routeMeta } from '../../../../lib/seo';

export const Route = createFileRoute('/dashboard/draw/poster/$id')({
  loader: async ({ params }) => {
    const iframeUrlResult = await getIframeUrl({
      data: {
        id: params.id,
      },
    });

    if (!iframeUrlResult.success || !iframeUrlResult.data) {
      throw notFound();
    }

    return {
      id: params.id,
      iframe: iframeUrlResult.data,
    };
  },
  head: () => ({
    meta: routeMeta({
      title: 'Poster Editor | MultiPost',
      description: 'Edit and export a generated poster',
      robots: 'noindex, nofollow',
    }),
  }),
  component: PosterDetailPage,
});

function PosterDetailPage() {
  const { id, iframe } = Route.useLoaderData();
  const iframeUrlResult = { success: true, data: iframe };
  const { status, error } = iframeUrlResult.data;

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2">
        <ExportImageButton />
        <ExportHtmlButton id={id} />
      </div>
      <Spacer y={4} />
      {status === 'completed' && iframeUrlResult.success && iframeUrlResult.data?.url ? (
        <div className="h-[80vh] w-full overflow-hidden rounded-lg border">
          <iframe
            className="size-full"
            src={iframeUrlResult.data.url}
            frameBorder="0"
            title="海报设计"
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen></iframe>
        </div>
      ) : (
        <div className="flex h-[80vh] w-full items-center justify-center rounded-lg bg-default-50">
          <div className="text-center">
            <p className="mb-2 text-lg text-default-500">
              {status === 'pending' && '正在等待处理...'}
              {status === 'processing' && '正在生成海报...'}
              {status === 'failed' && '海报生成失败'}
              {error && '加载失败: ' + error}
            </p>
            <p className="text-sm text-default-400">状态: {status}</p>
          </div>
        </div>
      )}
    </div>
  );
}
