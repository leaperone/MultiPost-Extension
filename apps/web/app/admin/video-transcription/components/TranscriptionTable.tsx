'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableRow,
  TableBody,
  TableCell,
  Avatar,
  Link,
  Spinner,
  Chip,
} from '@heroui/react';
import { useInfiniteScroll } from '@heroui/use-infinite-scroll';
import { useAsyncList } from '@react-stately/data';
import { VideoTranscriptionRecord } from '../actions';
import { CopyButton } from '@/components/CopyButton';
import type { AsyncListLoadOptions } from '@react-stately/data';
import { getVideoTranscriptions } from '../actions';
import { ClockIcon, LinkIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';

export default function TranscriptionTable() {
  const { t } = useTranslation('admin');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [hasMore, setHasMore] = React.useState<boolean>(false);

  const list = useAsyncList<VideoTranscriptionRecord, string>({
    async load({ cursor }: AsyncListLoadOptions<VideoTranscriptionRecord, string>) {
      if (cursor) setIsLoading(false);
      const resp = await getVideoTranscriptions({ cursor, limit: 20 });
      setHasMore(!!resp.data.nextCursor);
      return {
        items: resp.data.transcriptions,
        cursor: resp.data.nextCursor,
      };
    },
  });

  const [loaderRef, scrollerRef] = useInfiniteScroll({
    hasMore,
    onLoadMore: list.loadMore,
  });

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      completed: 'success',
      processing: 'warning',
      failed: 'danger',
      pending: 'default',
    };
    return statusColors[status] || 'default';
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Table
        isHeaderSticky
        isStriped
        aria-label={t('transcription.table_label')}
        baseRef={scrollerRef}
        bottomContent={
          hasMore ? (
            <div className="flex w-full justify-center">
              <Spinner
                ref={loaderRef}
                color="white"
              />
            </div>
          ) : null
        }
        classNames={{
          base: 'max-h-full overflow-scroll',
          table: 'min-h-full',
        }}>
        <TableHeader>
          <TableColumn key="user">{t('transcription.columns.user')}</TableColumn>
          <TableColumn key="platform">{t('transcription.columns.platform')}</TableColumn>
          <TableColumn key="videoUrl">{t('transcription.columns.video_url')}</TableColumn>
          <TableColumn key="status">{t('transcription.columns.status')}</TableColumn>
          <TableColumn key="duration">{t('transcription.columns.duration')}</TableColumn>
          <TableColumn key="createdAt">{t('transcription.columns.created_at')}</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={isLoading}
          items={list.items}
          loadingContent={<Spinner color="white" />}
          emptyContent={t('transcription.no_records')}>
          {(record: VideoTranscriptionRecord) => (
            <TableRow key={record.id}>
              <TableCell className="flex items-center gap-2">
                <Avatar
                  src={record.user.image ?? undefined}
                  size="sm"
                />
                <div className="flex flex-col">
                  <Chip size="sm">{record.user.name}</Chip>
                  <div className="flex items-center gap-1">
                    <CopyButton text={record.user.email} />
                    <Link
                      href={`mailto:${record.user.email}`}
                      className="text-xs text-gray-500">
                      {record.user.email}
                    </Link>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Chip
                  variant="flat"
                  size="sm">
                  {record.platform || '-'}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="flex max-w-[200px] items-center gap-1">
                  <LinkIcon className="size-4 shrink-0" />
                  <Link
                    href={record.videoUrl}
                    isExternal
                    showAnchorIcon
                    className="truncate text-xs">
                    {record.videoUrl}
                  </Link>
                </div>
              </TableCell>
              <TableCell>
                <Chip
                  color={getStatusColor(record.status)}
                  variant="flat"
                  size="sm">
                  {t(`transcription.status.${record.status}`)}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <ClockIcon className="size-4" />
                  <span className="font-mono text-sm">{formatDuration(record.duration)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{new Date(record.createdAt).toLocaleString()}</div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
