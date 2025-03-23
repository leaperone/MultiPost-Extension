'use server';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';

interface CreateWebsiteData {
  name: string;
  domain?: string;
}

export async function createWebsite(data: CreateWebsiteData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('未授权');
  }

  const website = await multipostDb.website.create({
    data: {
      name: data.name,
      domain: data.domain,
      userId: session.user.id,
    },
  });

  return website;
}
