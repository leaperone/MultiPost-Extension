import {
  Avatar,
  Chip,
  Link,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { useInfiniteScroll } from '@heroui/use-infinite-scroll';
import { useAsyncList } from '@react-stately/data';
import { DollarSignIcon } from 'lucide-react';
import { useState } from 'react';

import { CopyButton } from '@/components/CopyButton';
import type { AsyncListLoadOptions } from '@react-stately/data';
import { getCreditUsages, type CreditUsage } from '../../../../actions/admin/usage';
import { useTranslation } from '../../../../i18n/client';

export default function CreditUsageTable() {
  const { t } = useTranslation('admin');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const list = useAsyncList<CreditUsage, string>({
    async load({ cursor }: AsyncListLoadOptions<CreditUsage, string>) {
      if (cursor) setIsLoading(false);
      const resp = await getCreditUsages({ data: { cursor, limit: 20 } });
      setHasMore(!!resp.data.nextCursor);
      return {
        items: resp.data.creditUsages,
        cursor: resp.data.nextCursor,
      };
    },
  });

  const [loaderRef, scrollerRef] = useInfiniteScroll({
    hasMore,
    onLoadMore: list.loadMore,
  });

  const formatAmount = (amount: string) => Number.parseFloat(amount).toFixed(6);

  const getTypeColor = (type: string) => {
    const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
      image_generation: 'primary',
      poster_generation: 'secondary',
      social_search: 'success',
      file_upload: 'warning',
      api_call: 'danger',
    };
    return typeColors[type] || 'default';
  };

  return (
    <Table
      isHeaderSticky
      isStriped
      aria-label={t('usage.table_label')}
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
        <TableColumn key="user">{t('usage.columns.user')}</TableColumn>
        <TableColumn key="type">{t('usage.columns.type')}</TableColumn>
        <TableColumn key="amount">{t('usage.columns.amount')}</TableColumn>
        <TableColumn key="isFree">{t('usage.columns.free')}</TableColumn>
        <TableColumn key="createdAt">{t('usage.columns.created_at')}</TableColumn>
      </TableHeader>
      <TableBody
        isLoading={isLoading}
        items={list.items}
        loadingContent={<Spinner color="white" />}
        emptyContent={t('usage.no_records')}>
        {(creditUsage: CreditUsage) => (
          <TableRow key={creditUsage.id}>
            <TableCell className="flex items-center gap-2">
              <Avatar
                src={creditUsage.user.image ?? undefined}
                size="sm"
              />
              <div className="flex flex-col">
                <Chip size="sm">{creditUsage.user.name}</Chip>
                <div className="flex items-center gap-1">
                  <CopyButton text={creditUsage.user.email} />
                  <Link
                    href={`mailto:${creditUsage.user.email}`}
                    className="text-xs text-gray-500">
                    {creditUsage.user.email}
                  </Link>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Chip
                color={getTypeColor(creditUsage.type)}
                variant="flat"
                size="sm">
                {creditUsage.type}
              </Chip>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <DollarSignIcon size={16} />
                <span className="font-mono">{formatAmount(creditUsage.amount)}</span>
              </div>
            </TableCell>
            <TableCell>
              <Chip
                color={creditUsage.isFree ? 'success' : 'default'}
                variant="flat"
                size="sm">
                {creditUsage.isFree ? t('usage.balance.free') : t('usage.balance.paid')}
              </Chip>
            </TableCell>
            <TableCell>
              <div className="text-sm">{new Date(creditUsage.createdAt).toLocaleString()}</div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
