import { createServerFn } from '@tanstack/react-start';
import { SocialMediaAccount } from '@db/schema/schema';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../lib/db';
import { getSession } from '../../lib/session';

const platformAccountSchema = z.object({
  platform: z.string().min(1),
  platformId: z.string().min(1),
});

/**
 * Get all social media accounts for the current user.
 */
export const getSocialMediaAccounts = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const accounts = await db
      .select()
      .from(SocialMediaAccount)
      .where(
        and(
          eq(SocialMediaAccount.userId, session.user.id),
          ne(SocialMediaAccount.platform, 'facebook'),
          eq(SocialMediaAccount.isActive, true),
        ),
      )
      .orderBy(asc(SocialMediaAccount.platform), desc(SocialMediaAccount.createdAt));

    return {
      success: true,
      data: accounts,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch social media accounts',
    };
  }
});

export const getSocialMediaAccountByPlatformId = createServerFn({ method: 'GET' })
  .validator(platformAccountSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    try {
      const [account = null] = await db
        .select({
          id: SocialMediaAccount.id,
          platform: SocialMediaAccount.platform,
          platformId: SocialMediaAccount.platformId,
          displayName: SocialMediaAccount.displayName,
          username: SocialMediaAccount.username,
        })
        .from(SocialMediaAccount)
        .where(
          and(
            eq(SocialMediaAccount.userId, session.user.id),
            eq(SocialMediaAccount.platform, data.platform),
            eq(SocialMediaAccount.platformId, data.platformId),
          ),
        )
        .limit(1);

      return {
        success: true,
        account,
      };
    } catch (error) {
      console.error('Error fetching social media account:', error);
      return {
        success: false,
        error: 'Failed to fetch social media account',
        account: null,
      };
    }
  });
