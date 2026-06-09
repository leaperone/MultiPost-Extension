import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '@/lib/db';
import { getSession } from '../../lib/session';

const createPublishTaskSchema = z.object({
  draftId: z.string().optional(),
  publishedAt: z.string().optional(),
  selectedAccountIds: z.array(z.string()).optional(),
});

export const createPublishTask = createServerFn({ method: 'POST' })
  .validator(createPublishTaskSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      const userId = session.user.id;
      const { draftId, publishedAt, selectedAccountIds } = data;

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

      const publishTime = new Date(publishedAt);
      if (publishTime.getTime() <= Date.now()) {
        return {
          success: false,
          error: 'Publish time must be in the future',
        };
      }

      const result = await multipostDb.$transaction(async (tx) => {
        const publishTask = await tx.publishTask.create({
          data: {
            userId,
            draftId,
            publishedAt: publishTime,
            status: 'pending',
          },
        });

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
  });
