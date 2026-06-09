import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
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

    const accounts = await multipostDb.socialMediaAccount.findMany({
      where: {
        userId: session.user.id,
        platform: {
          not: 'facebook',
        },
        isActive: true,
      },
      orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }],
    });

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
      const account = await multipostDb.socialMediaAccount.findFirst({
        where: {
          userId: session.user.id,
          platform: data.platform,
          platformId: data.platformId,
        },
        select: {
          id: true,
          platform: true,
          platformId: true,
          displayName: true,
          username: true,
        },
      });

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
