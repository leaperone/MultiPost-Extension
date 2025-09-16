'use server';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';

/**
 * Get all social media accounts for the current user
 * @description Retrieves all social media accounts for publishing
 * @returns Promise with success status and accounts array
 */
export async function getSocialMediaAccounts() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const accounts = await multipostDb.socialMediaAccount.findMany({
      where: {
        userId: session.user.id,
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
}

/**
 * Create a new publish task with associated publish task logs
 * @description Creates a publish task and logs for selected social media accounts
 * @param {object} data - The publish task data
 * @returns Promise with success status and task data
 */
export async function createPublishTask(data: { draftId: string; publishedAt: string; selectedAccountIds: string[] }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const userId = session.user.id;
    const { draftId, publishedAt, selectedAccountIds } = data;

    // Validate required fields
    if (!draftId || !publishedAt || !selectedAccountIds || !Array.isArray(selectedAccountIds)) {
      return {
        success: false,
        error: 'Missing required fields: draftId, publishedAt, selectedAccountIds',
      };
    }

    if (selectedAccountIds.length === 0) {
      return {
        success: false,
        error: 'At least one social media account must be selected',
      };
    }

    // Validate that the draft exists and belongs to the user
    const draft = await multipostDb.draft.findFirst({
      where: {
        id: draftId,
        userId,
      },
    });

    if (!draft) {
      return {
        success: false,
        error: 'Draft not found or unauthorized',
      };
    }

    // Validate that all selected accounts exist and belong to the user
    const accounts = await multipostDb.socialMediaAccount.findMany({
      where: {
        id: { in: selectedAccountIds },
        userId,
        isActive: true,
      },
    });

    if (accounts.length !== selectedAccountIds.length) {
      return {
        success: false,
        error: 'Some selected accounts are invalid or inactive',
      };
    }

    // Validate publish time is in the future
    const publishTime = new Date(publishedAt);
    if (publishTime.getTime() <= Date.now()) {
      return {
        success: false,
        error: 'Publish time must be in the future',
      };
    }

    // Create the publish task and logs in a transaction
    const result = await multipostDb.$transaction(async (tx) => {
      // Create the publish task
      const publishTask = await tx.publishTask.create({
        data: {
          userId,
          draftId: draftId,
          publishedAt: publishTime,
          status: 'pending',
        },
      });

      // Create publish task logs for each selected account
      const publishTaskLogs = await Promise.all(
        accounts.map((account) =>
          tx.publishTaskLog.create({
            data: {
              publishTaskId: publishTask.id,
              userId,
              platform: account.platform,
              platformId: account.platformId,
              status: 'pending',
            },
          }),
        ),
      );

      return {
        publishTask,
        publishTaskLogs,
      };
    });

    return {
      success: true,
      data: {
        publishTask: result.publishTask,
        logsCount: result.publishTaskLogs.length,
        platforms: accounts.map((a) => a.platform),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create publish task',
    };
  }
}
