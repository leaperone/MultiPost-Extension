'use server';

import { Card, CardBody, CardHeader } from '@heroui/react';
import Link from 'next/link';
import { BarChart3Icon } from 'lucide-react';
import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';

export async function WebsiteList() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('未授权');
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
    return <div className="text-center text-gray-500">还没有添加任何网站，点击右上角的按钮添加一个吧！</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {websites.map((website) => (
        <Link
          key={website.id}
          href={`/dashboard/webtrace/website/${website.id}`}>
          <Card className="cursor-pointer transition-all hover:scale-[1.02]">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3Icon className="size-5" />
                <h3 className="text-lg font-semibold">{website.name}</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {website.domain && <p className="text-sm text-gray-500">{website.domain}</p>}
                <p className="text-sm text-gray-500">创建于 {new Date(website.createdAt).toLocaleDateString()}</p>
              </div>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
