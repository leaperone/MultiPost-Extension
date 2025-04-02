'use server';

import { Card, CardBody, CardHeader, Chip, Tooltip } from '@heroui/react';
import Link from 'next/link';
import { BarChart3Icon } from 'lucide-react';
import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { Icon } from '@iconify/react/dist/iconify.js';

export async function WebsiteList() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const websites = await multipostDb.website.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!websites?.length) {
    return (
      <div className="flex w-full flex-col items-center justify-center text-center">
        <Icon
          icon="openmoji:index-pointing-up"
          className="size-20 place-self-end"
        />
        <Icon
          icon="openmoji:japanese-free-of-charge-button"
          className="size-20 place-self-center"
        />
        <p className="text-3xl text-foreground">一片旷野，点击右上角的按钮添加站点吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {websites.map((website) => (
        <Link
          key={website.id}
          href={`/dashboard/analytics/web/${website.id}`}>
          <Card className="w-full cursor-pointer transition-all hover:bg-muted/50">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3Icon className="size-5" />
                <Tooltip content={website.domain}>
                  <h3 className="font-semibold">{website.name}</h3>
                </Tooltip>
              </div>
              <Chip
                variant="flat"
                color="default"
                size="sm">
                创建于
                {new Date(website.createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </Chip>
            </CardHeader>
            <CardBody className="flex justify-between p-4">
              <div className="grid w-full grid-cols-4 gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-500">今日访问</span>
                  <span className="font-semibold">238</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-500">本周访问</span>
                  <span className="font-semibold">1,893</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-500">跳出率</span>
                  <span className="font-semibold">32.4%</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-500">平均停留</span>
                  <span className="font-semibold">4m 26s</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
