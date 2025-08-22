'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { refreshXToken, revokeXToken, generateXAuthUrl, generatePKCE } from './oauth';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';

export async function getXAccounts() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return await prisma.socialMediaAccount.findMany({
    where: {
      userId: session.user.id,
      platform: 'x',
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function disconnectXAccount(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const account = await prisma.socialMediaAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      platform: 'x',
    },
  });

  if (!account) {
    throw new Error('X account not found');
  }

  // Revoke the token on X's side first
  try {
    await revokeXToken(account.accessToken);
  } catch (error) {
    console.error('Failed to revoke X token:', error);
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

export async function refreshXAccountToken(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const account = await prisma.socialMediaAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      platform: 'x',
      isActive: true,
    },
  });

  if (!account || !account.refreshToken) {
    throw new Error('X account not found or no refresh token available');
  }

  try {
    const tokenData = await refreshXToken(account.refreshToken);

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
    console.error('Failed to refresh X token:', error);
    throw new Error('Failed to refresh X token');
  }
}

export async function getXAccountById(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return await prisma.socialMediaAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      platform: 'x',
      isActive: true,
    },
  });
}

/**
 * 初始化X OAuth授权流程
 */
export async function initiateXAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Generate a state parameter for security
  const state = nanoid(32);

  // Generate PKCE parameters (使用固定的codeVerifier)
  const { codeChallenge } = generatePKCE();

  // Generate X authorization URL
  const authUrl = generateXAuthUrl(state, codeChallenge);

  return {
    authUrl,
    state,
  };
}
