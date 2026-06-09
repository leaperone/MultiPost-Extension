import { createServerFn } from '@tanstack/react-start';

import { multipostDb } from '@/lib/db';
import { getSession } from '../../lib/session';

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
