/**
 * @file 用户详情页
 * @description 展示 URL 查询参数中的 userid 和 email，并查找用户信息
 */
'use client';

import { use, useEffect, useState } from 'react';
import { getUserCreditBalance, searchUser } from './actions';
import type { User } from '../users/actions';

import { Avatar, Link, Divider, CardHeader, CardBody, Card } from '@heroui/react';
import { CopyButton } from '@/components/CopyButton';
import { EqualIcon, PlusIcon } from 'lucide-react';

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
    return <div className="text-gray-500">请输入用户ID或邮箱</div>;
  }

  if (loading) {
    return <div className="text-blue-500">加载中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!user) {
    return <div className="text-gray-500">查无此人</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl gap-4 p-6">
      <h1 className="mb-4 text-2xl font-bold">用户信息</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src={user.image ?? undefined}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-1">
                <div className="text-lg font-bold">{user.name || '未命名用户'}</div>
                {user.name && <CopyButton text={user.name} />}
              </div>
              <p className="flex flex-row items-center gap-1">
                <span className="text-sm text-foreground-400">User ID:</span>
                <span className="text-sm text-foreground">{user.id}</span>
                <CopyButton text={user.id} />
              </p>
            </div>
          </div>
          <div>
            <div className="text-sm text-foreground-300">注册时间：</div>
            <div>{new Date(user.createdAt).toLocaleString()}</div>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex items-center gap-2">
            <div className="text-sm text-foreground-400">绑定邮箱：</div>
            <Link href={`mailto:${user.email}`}>{user.email}</Link>
            <CopyButton text={user.email} />
          </div>
        </CardBody>
      </Card>
      <UserCreditCard
        credit={credit}
        freeCredits={freeCredits}
      />
    </div>
  );
}

const UserCreditCard = ({ credit, freeCredits }: { credit: number; freeCredits: number }) => {
  return (
    <Card className="w-fit">
      <CardBody className="flex flex-row items-center gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xl font-medium text-foreground">{credit.toFixed(2)}</p>
          <p className="text-sm text-foreground-400">付费积分</p>
        </div>
        <PlusIcon className="size-6 text-foreground-400" />
        <div className="flex flex-col gap-2">
          <p className="text-xl font-medium text-foreground">{freeCredits.toFixed(2)}</p>
          <p className="text-sm text-foreground-400">免费积分</p>
        </div>
        <EqualIcon className="size-6 text-foreground-400" />
        <div className="flex flex-col gap-2">
          <p className="text-xl font-medium text-foreground">{credit + freeCredits}</p>
          <p className="text-sm text-foreground-400">总积分</p>
        </div>
      </CardBody>
    </Card>
  );
};
