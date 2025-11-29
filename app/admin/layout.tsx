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
import { createTranslation } from '@/i18n/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const { t } = await createTranslation('admin');

  if (!session) {
    redirect('/signin');
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return <div>{t('not_admin')}</div>;
  }

  return <main className="flex h-screen w-full overflow-y-auto bg-background">{children}</main>;
}
