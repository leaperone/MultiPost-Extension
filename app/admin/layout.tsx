/**
 * @file Admin layout
 * @description Common layout for admin pages
 * @author harrywong
 * @date 2024-06-09
 */

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import React from 'react';
import { isAdmin } from '@/actions/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return <div>您不是管理员</div>;
  }

  return <main className="flex min-h-screen flex-col items-center bg-background p-4">{children}</main>;
}
