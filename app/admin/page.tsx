/**
 * @file Admin page
 * @description Basic admin page UI placeholder
 * @author harrywong
 * @date 2024-06-09
 */

import React from 'react';
import { Button } from '@heroui/react';
import { CreditCardIcon, UserIcon } from 'lucide-react';
import { Link } from '@heroui/react';

export default function AdminPage() {
  return (
    <div className="flex w-full max-w-7xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">管理后台</h1>
        <div className="flex-1" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/users"
          className="w-full">
          <Button
            className="h-24 w-full text-lg"
            startContent={<UserIcon className="size-6" />}>
            用户管理
          </Button>
        </Link>
        <Link
          href="/admin/recharge"
          className="w-full">
          <Button
            className="h-24 w-full text-lg"
            startContent={<CreditCardIcon className="size-6" />}>
            充值管理
          </Button>
        </Link>
        <Link
          href="/admin/activity"
          className="w-full">
          <Button className="h-24 w-full text-lg">活动管理</Button>
        </Link>
      </div>
    </div>
  );
}
