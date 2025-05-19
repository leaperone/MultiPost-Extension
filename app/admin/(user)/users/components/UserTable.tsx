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
  Button,
  Chip,
} from '@heroui/react';
import { useInfiniteScroll } from '@heroui/use-infinite-scroll';
import { useAsyncList } from '@react-stately/data';
import { User } from '../actions';
import { CopyButton } from '@/components/CopyButton';
import type { AsyncListLoadOptions } from '@react-stately/data';
import { getUsers } from '../actions';
import { EyeIcon } from 'lucide-react';

export default function UserTable() {
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [hasMore, setHasMore] = React.useState<boolean>(false);

  const list = useAsyncList<User, string>({
    async load({ cursor }: AsyncListLoadOptions<User, string>) {
      if (cursor) setIsLoading(false);
      const resp = await getUsers({ cursor, limit: 20 });
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
    <>
      <Table
        isHeaderSticky
        isStriped
        aria-label="用户列表"
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
          <TableColumn key="name">用户</TableColumn>
          <TableColumn key="email">邮箱</TableColumn>
          <TableColumn key="createdAt">创建时间</TableColumn>
          <TableColumn key="actions">操作</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={isLoading}
          items={list.items}
          loadingContent={<Spinner color="white" />}
          emptyContent={'没有用户'}>
          {(user: User) => (
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
                <Button
                  as={Link}
                  href={`/admin/user?userid=${user.id}`}
                  target="_blank"
                  variant="flat"
                  size="sm"
                  isIconOnly>
                  <EyeIcon />
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
