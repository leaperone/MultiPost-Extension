/**
 * @file 用户详情页
 * @description 展示 URL 查询参数中的 userid 和 email，并查找用户信息
 */
'use client';

import { use, useEffect, useState } from 'react';
import { getUserCreditBalance, searchUser } from './actions';
import type { User } from '../users/actions';

import { Avatar, Link, Divider, CardHeader, CardBody, Card, Chip, Skeleton } from '@heroui/react';
import { CopyButton } from '@/components/CopyButton';
import { EqualIcon, PlusIcon, UserIcon, MailIcon, CalendarIcon, CreditCardIcon } from 'lucide-react';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function UserPage(props: { searchParams: SearchParams }) {
  const searchParams = use(props.searchParams);

  const userid = searchParams.userid?.toString();
  const email = searchParams.email?.toString();

  const [user, setUser] = useState<User | null>(null);
  const [credit, setCredit] = useState(0);
  const [freeCredits, setFreeCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      if (!userid && !email) return;
      setLoading(true);
      setError(null);
      try {
        const res = await searchUser({ id: userid, email });
        if (res.code !== 0) {
          setError(res.msg || '查询失败');
          setUser(null);
        } else {
          setUser(res.data);
        }
      } catch (e) {
        setError((e as Error).message || '请求异常');
        setUser(null);
      } finally {
        setLoading(false);
      }

      try {
        const res = await getUserCreditBalance(userid ?? '');
        if (res.code !== 0) {
          setError(res.msg || '请求异常');
          setCredit(0);
          setFreeCredits(0);
        } else {
          setCredit(res.data.credits);
          setFreeCredits(res.data.freeCredits);
        }
      } catch (e) {
        setError((e as Error).message || '请求异常');
        setUser(null);
      }
    }
    fetchUser();
  }, [userid, email]);

  if (!userid && !email) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardBody className="py-8 text-center">
            <UserIcon className="mx-auto mb-4 size-12 text-default-400" />
            <h3 className="mb-2 text-lg font-semibold">请输入查询条件</h3>
            <p className="text-sm text-default-500">请在URL中提供用户ID或邮箱参数</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <Skeleton className="mb-2 h-7 w-28 rounded-lg sm:h-8 sm:w-32" />
          <Skeleton className="h-4 w-40 rounded-lg sm:h-4 sm:w-48" />
        </div>
        <Card>
          <CardHeader className="gap-4">
            <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start">
              <Skeleton className="size-16 rounded-full sm:size-16" />
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <Skeleton className="mx-auto h-6 w-32 rounded-lg sm:mx-0 sm:h-6 sm:w-32" />
                <Skeleton className="mx-auto h-4 w-48 rounded-lg sm:mx-0 sm:h-4 sm:w-48" />
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            <Skeleton className="h-4 w-64 rounded-lg sm:h-4 sm:w-64" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <Skeleton className="h-16 w-24 rounded-lg sm:h-16 sm:w-24" />
              <Skeleton className="size-6 rounded-lg sm:size-6" />
              <Skeleton className="h-16 w-24 rounded-lg sm:h-16 sm:w-24" />
              <Skeleton className="size-6 rounded-lg sm:size-6" />
              <Skeleton className="h-16 w-24 rounded-lg sm:h-16 sm:w-24" />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border-danger-200 bg-danger-50">
          <CardBody className="py-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-danger-100">
              <UserIcon className="size-6 text-danger-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-danger-800">查询失败</h3>
            <p className="text-sm text-danger-600">{error}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardBody className="py-8 text-center">
            <UserIcon className="mx-auto mb-4 size-12 text-default-400" />
            <h3 className="mb-2 text-lg font-semibold">查无此人</h3>
            <p className="text-sm text-default-500">未找到匹配的用户信息</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">用户信息</h1>
        <p className="text-sm text-default-500">查看和管理用户详细信息</p>
      </div>

      {/* User Info Card */}
      <Card className="shadow-medium">
        <CardHeader className="pb-4">
          <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* User Avatar and Basic Info */}
            <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:items-start sm:gap-6">
              <Avatar
                src={user.image ?? undefined}
                size="lg"
                className="ring-2 ring-default-200 ring-offset-2"
                fallback={<UserIcon className="size-8" />}
              />
              <div className="w-full space-y-3 text-center sm:w-auto sm:text-left">
                {/* User Name and Status */}
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <h2 className="break-words text-xl font-semibold">{user.name || '未命名用户'}</h2>
                    {user.name && (
                      <div className="flex justify-center sm:justify-start">
                        <CopyButton text={user.name} />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center sm:justify-start">
                    <Chip
                      size="sm"
                      variant="flat"
                      color="primary">
                      活跃用户
                    </Chip>
                  </div>
                </div>

                {/* User ID */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-default-500 sm:justify-start">
                    <UserIcon className="size-4 shrink-0" />
                    <span>User ID:</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
                    <code className="max-w-full break-all rounded bg-default-100 px-3 py-2 font-mono text-xs">
                      {user.id}
                    </code>
                    <div className="shrink-0">
                      <CopyButton text={user.id} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Date */}
            <div className="w-full text-center sm:w-auto sm:text-right">
              <div className="flex items-center justify-center gap-2 text-sm text-default-500 sm:justify-end">
                <CalendarIcon className="size-4" />
                <span>注册时间</span>
              </div>
              <div className="mt-1 font-medium">
                {new Date(user.createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </CardHeader>

        <Divider />

        <CardBody className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <MailIcon className="size-4 shrink-0 text-default-400" />
              <span className="text-sm text-default-500">绑定邮箱：</span>
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Link
                href={`mailto:${user.email}`}
                className="break-all text-center font-medium sm:text-left"
                showAnchorIcon>
                {user.email}
              </Link>
              <div className="shrink-0">
                <CopyButton text={user.email} />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Credit Card */}
      <UserCreditCard
        credit={credit}
        freeCredits={freeCredits}
      />
    </div>
  );
}

const UserCreditCard = ({ credit, freeCredits }: { credit: number; freeCredits: number }) => {
  const totalCredits = credit + freeCredits;

  return (
    <Card className="shadow-medium">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-100">
            <CreditCardIcon className="size-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">积分余额</h3>
            <p className="text-sm text-default-500">用户当前可用积分详情</p>
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="pt-6">
        <div className="grid grid-cols-1 gap-6 sm:flex sm:items-center sm:justify-center sm:gap-8">
          {/* Paid Credits */}
          <div className="text-center">
            <div className="mb-2 text-2xl font-bold text-primary-600">{credit.toFixed(2)}</div>
            <div className="mb-2 text-sm text-default-500">付费积分</div>
            <Chip
              size="sm"
              variant="flat"
              color="primary">
              Premium
            </Chip>
          </div>

          {/* Plus Icon */}
          <div className="flex justify-center sm:block">
            <div className="flex size-8 items-center justify-center rounded-full bg-default-100">
              <PlusIcon className="size-4 text-default-400" />
            </div>
          </div>

          {/* Free Credits */}
          <div className="text-center">
            <div className="mb-2 text-2xl font-bold text-success-600">{freeCredits.toFixed(2)}</div>
            <div className="mb-2 text-sm text-default-500">免费积分</div>
            <Chip
              size="sm"
              variant="flat"
              color="success">
              Free
            </Chip>
          </div>

          {/* Equal Icon */}
          <div className="flex justify-center sm:block">
            <div className="flex size-8 items-center justify-center rounded-full bg-default-100">
              <EqualIcon className="size-4 text-default-400" />
            </div>
          </div>

          {/* Total Credits */}
          <div className="text-center">
            <div className="mb-2 text-2xl font-bold text-secondary-600">{totalCredits.toFixed(2)}</div>
            <div className="mb-2 text-sm text-default-500">总积分</div>
            <Chip
              size="sm"
              variant="flat"
              color={totalCredits > 0 ? 'secondary' : 'default'}>
              {totalCredits > 0 ? 'Available' : 'Empty'}
            </Chip>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
