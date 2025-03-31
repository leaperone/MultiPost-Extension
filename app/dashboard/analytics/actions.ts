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

interface LinkSocialMediaData {
  provider: string;
  accountId: string;
  username?: string;
  profileUrl?: string;
  avatarUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraData?: any;
}

export async function linkSocialMedia(data: LinkSocialMediaData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('未授权');
  }

  const socialMediaAccount = await multipostDb.socialMediaAccount.upsert({
    where: {
      userId_provider_accountId: {
        userId: session.user.id,
        provider: data.provider,
        accountId: data.accountId,
      },
    },
    create: {
      ...data,
      userId: session.user.id,
    },
    update: {
      username: data.username,
      profileUrl: data.profileUrl,
      avatarUrl: data.avatarUrl,
      extraData: data.extraData,
      updatedAt: new Date(),
    },
  });

  return socialMediaAccount;
}
