import { createServerFn } from '@tanstack/react-start';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { getSession } from '../../../lib/session';
import { generateTikTokAuthUrl, refreshTikTokToken, revokeTikTokToken } from './oauth';

const accountIdSchema = z.object({
  accountId: z.string().min(1),
});

export const getTikTokAccounts = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return await prisma.socialMediaAccount.findMany({
    where: {
      userId: session.user.id,
      platform: 'tiktok',
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
});

export const disconnectTikTokAccount = createServerFn({ method: 'POST' })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const account = await prisma.socialMediaAccount.findFirst({
      where: {
        id: data.accountId,
        userId: session.user.id,
        platform: 'tiktok',
      },
    });

    if (!account) {
      throw new Error('TikTok account not found');
    }

    try {
      await revokeTikTokToken(account.accessToken);
    } catch (error) {
      console.error('Failed to revoke TikTok token:', error);
    }

    await prisma.socialMediaAccount.update({
      where: { id: data.accountId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Client caller invalidates /dashboard/settings/social-media-accounts after mutation.
  });

export const refreshTikTokAccountToken = createServerFn({ method: 'POST' })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const account = await prisma.socialMediaAccount.findFirst({
      where: {
        id: data.accountId,
        userId: session.user.id,
        platform: 'tiktok',
        isActive: true,
      },
    });

    if (!account || !account.refreshToken) {
      throw new Error('TikTok account not found or no refresh token available');
    }

    try {
      const tokenData = await refreshTikTokToken(account.refreshToken);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      await prisma.socialMediaAccount.update({
        where: { id: data.accountId },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          expiresAt,
          updatedAt: new Date(),
        },
      });

      // Client caller invalidates /dashboard/settings/social-media-accounts after mutation.
      return { success: true };
    } catch (error) {
      console.error('Failed to refresh TikTok token:', error);
      throw new Error('Failed to refresh TikTok token');
    }
  });

export const getTikTokAccountById = createServerFn({ method: 'GET' })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    return await prisma.socialMediaAccount.findFirst({
      where: {
        id: data.accountId,
        userId: session.user.id,
        platform: 'tiktok',
        isActive: true,
      },
    });
  });

export const initiateTikTokAuth = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const state = nanoid(32);
  const authUrl = generateTikTokAuthUrl(state);

  return {
    authUrl,
    state,
  };
});
