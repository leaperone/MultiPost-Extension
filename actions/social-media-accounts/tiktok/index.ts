'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { refreshTikTokToken, revokeTikTokToken, generateTikTokAuthUrl } from './oauth';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';

export async function getTikTokAccounts() {
  const session = await auth();
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
}

export async function disconnectTikTokAccount(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const account = await prisma.socialMediaAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      platform: 'tiktok',
    },
  });

  if (!account) {
    throw new Error('TikTok account not found');
  }

  // Revoke the token on TikTok's side first
  try {
    await revokeTikTokToken(account.accessToken);
  } catch (error) {
    console.error('Failed to revoke TikTok token:', error);
    // Continue with local disconnect even if revocation fails
  }

  // Mark account as inactive in our database
  await prisma.socialMediaAccount.update({
    where: { id: accountId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/settings/social-media-accounts');
}

export async function refreshTikTokAccountToken(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const account = await prisma.socialMediaAccount.findFirst({
    where: {
      id: accountId,
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
      where: { id: accountId },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    revalidatePath('/dashboard/settings/social-media-accounts');
    return { success: true };
  } catch (error) {
    console.error('Failed to refresh TikTok token:', error);
    throw new Error('Failed to refresh TikTok token');
  }
}

export async function getTikTokAccountById(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return await prisma.socialMediaAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      platform: 'tiktok',
      isActive: true,
    },
  });
}

export async function initiateTikTokAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Generate a state parameter for security
  const state = nanoid(32);

  // Generate TikTok authorization URL
  const authUrl = generateTikTokAuthUrl(state);

  return {
    authUrl,
    state,
  };
}
