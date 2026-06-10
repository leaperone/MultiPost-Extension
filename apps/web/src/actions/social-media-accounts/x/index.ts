import { createServerFn } from '@tanstack/react-start';
import { SocialMediaAccount } from '@db/schema/schema';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { db } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { generatePKCE, generateXAuthUrl, refreshXToken, revokeXToken } from './oauth';

const accountIdSchema = z.object({
  accountId: z.string().min(1),
});

export const getXAccounts = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return await db
    .select()
    .from(SocialMediaAccount)
    .where(
      and(
        eq(SocialMediaAccount.userId, session.user.id),
        eq(SocialMediaAccount.platform, 'x'),
        eq(SocialMediaAccount.isActive, true),
      ),
    )
    .orderBy(desc(SocialMediaAccount.createdAt));
});

export const disconnectXAccount = createServerFn({ method: 'POST' })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const [account] = await db
      .select()
      .from(SocialMediaAccount)
      .where(
        and(
          eq(SocialMediaAccount.id, data.accountId),
          eq(SocialMediaAccount.userId, session.user.id),
          eq(SocialMediaAccount.platform, 'x'),
        ),
      )
      .limit(1);

    if (!account) {
      throw new Error('X account not found');
    }

    try {
      await revokeXToken(account.accessToken);
    } catch (error) {
      console.error('Failed to revoke X token:', error);
    }

    await db
      .update(SocialMediaAccount)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(SocialMediaAccount.id, data.accountId));

    // Client caller invalidates /dashboard/settings/social-media-accounts after mutation.
  });

export const refreshXAccountToken = createServerFn({ method: 'POST' })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const [account] = await db
      .select()
      .from(SocialMediaAccount)
      .where(
        and(
          eq(SocialMediaAccount.id, data.accountId),
          eq(SocialMediaAccount.userId, session.user.id),
          eq(SocialMediaAccount.platform, 'x'),
          eq(SocialMediaAccount.isActive, true),
        ),
      )
      .limit(1);

    if (!account || !account.refreshToken) {
      throw new Error('X account not found or no refresh token available');
    }

    try {
      const tokenData = await refreshXToken(account.refreshToken);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      await db
        .update(SocialMediaAccount)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(SocialMediaAccount.id, data.accountId));

      // Client caller invalidates /dashboard/settings/social-media-accounts after mutation.
      return { success: true };
    } catch (error) {
      console.error('Failed to refresh X token:', error);
      throw new Error('Failed to refresh X token');
    }
  });

export const getXAccountById = createServerFn({ method: 'GET' })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    return (
      (
        await db
          .select()
          .from(SocialMediaAccount)
          .where(
            and(
              eq(SocialMediaAccount.id, data.accountId),
              eq(SocialMediaAccount.userId, session.user.id),
              eq(SocialMediaAccount.platform, 'x'),
              eq(SocialMediaAccount.isActive, true),
            ),
          )
          .limit(1)
      )[0] ?? null
    );
  });

export const initiateXAuth = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const state = nanoid(32);
  const { codeChallenge } = generatePKCE();
  const authUrl = generateXAuthUrl(state, codeChallenge);

  return {
    authUrl,
    state,
  };
});
