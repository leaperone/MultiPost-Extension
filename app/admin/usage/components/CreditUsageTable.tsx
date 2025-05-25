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
import { CreditUsage } from '../actions';
import { CopyButton } from '@/components/CopyButton';
import type { AsyncListLoadOptions } from '@react-stately/data';
import { getCreditUsages } from '../actions';
import { DollarSignIcon } from 'lucide-react';
import { Decimal } from '@prisma/client/runtime/library';

export default function CreditUsageTable() {
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [hasMore, setHasMore] = React.useState<boolean>(false);

  const list = useAsyncList<CreditUsage, string>({
    async load({ cursor }: AsyncListLoadOptions<CreditUsage, string>) {
      if (cursor) setIsLoading(false);
      const resp = await getCreditUsages({ cursor, limit: 20 });
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

  const formatAmount = (amount: Decimal) => {
    return parseFloat(amount.toString()).toFixed(6);
  };

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
    <>
      <Table
        isHeaderSticky
        isStriped
        aria-label="信用使用记录列表"
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
          <TableColumn key="user">用户</TableColumn>
          <TableColumn key="type">类型</TableColumn>
          <TableColumn key="amount">金额</TableColumn>
          <TableColumn key="isFree">免费</TableColumn>
          <TableColumn key="createdAt">创建时间</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={isLoading}
          items={list.items}
          loadingContent={<Spinner color="white" />}
          emptyContent={'没有信用使用记录'}>
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
                  {creditUsage.isFree ? '免费' : '付费'}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="text-sm">{new Date(creditUsage.createdAt).toLocaleString()}</div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
