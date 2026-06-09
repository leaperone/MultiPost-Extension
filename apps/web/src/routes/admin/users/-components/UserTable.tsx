import {
  Avatar,
  Button,
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
import { EyeIcon } from 'lucide-react';
import { useState } from 'react';

import { CopyButton } from '@/components/CopyButton';
import type { AsyncListLoadOptions } from '@react-stately/data';
import { getUsers, type AdminUser } from '../../../../actions/admin/users';
import { useTranslation } from '../../../../i18n/client';

export default function UserTable() {
  const { t } = useTranslation('admin');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const list = useAsyncList<AdminUser, string>({
    async load({ cursor }: AsyncListLoadOptions<AdminUser, string>) {
      if (cursor) setIsLoading(false);
      const resp = await getUsers({ data: { cursor, limit: 20 } });
      setHasMore(!!resp.data.nextCursor);
      return {
        items: resp.data.users,
        cursor: resp.data.nextCursor,
      };
    },
  });

  const [loaderRef, scrollerRef] = useInfiniteScroll({
    hasMore,
    onLoadMore: list.loadMore,
  });

  return (
    <Table
      isHeaderSticky
      isStriped
      aria-label={t('users.table_label')}
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
        <TableColumn key="name">{t('users.columns.user')}</TableColumn>
        <TableColumn key="email">{t('users.columns.email')}</TableColumn>
        <TableColumn key="createdAt">{t('users.columns.created_at')}</TableColumn>
        <TableColumn key="actions">-</TableColumn>
      </TableHeader>
      <TableBody
        isLoading={isLoading}
        items={list.items}
        loadingContent={<Spinner color="white" />}
        emptyContent={t('users.no_users')}>
        {(user: AdminUser) => (
          <TableRow key={user.id}>
            <TableCell className="flex items-center gap-2">
              <Avatar
                src={user.image ?? undefined}
                size="sm"
              />
              <Chip>{user.name}</Chip>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <CopyButton text={user.email} />
                <Link href={`mailto:${user.email}`}>{user.email}</Link>
              </div>
            </TableCell>
            <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
            <TableCell>
              <Link
                href={`/admin/user?userid=${user.id}`}
                target="_blank">
                <Button
                  variant="flat"
                  size="sm"
                  isIconOnly>
                  <EyeIcon />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
