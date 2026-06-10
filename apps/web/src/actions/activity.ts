import { createServerFn } from '@tanstack/react-start';
import { fromDecimal } from '@db/helpers';
import {
  PromotionCode,
  PromotionSubmission,
  PromotionTask,
  RechargeCredit,
} from '@db/schema/schema';
import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { RechargeStatus, RechargeType } from './credit/types';
import { addCreditInTransaction } from './credit/_core';
import { db } from '../lib/db';
import { getSession } from '../lib/session';

type PromotionTaskRow = typeof PromotionTask.$inferSelect;

export enum PromotionSubmissionStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum PromotionTaskType {
  PUBLISH_POST = 'PUBLISH_POST',
  COMMENT_POST = 'COMMENT_POST',
}

export const PromotionTaskTypeLabelMap = {
  [PromotionTaskType.PUBLISH_POST]: '发布帖子',
  [PromotionTaskType.COMMENT_POST]: '评论帖子',
} as const;

export type ClientPromotionTask = Omit<
  PromotionTaskRow,
  'reward' | 'expiredAt' | 'createdAt' | 'updatedAt' | 'keywords' | 'examples'
> & {
  reward: string;
  expiredAt: string;
  createdAt: string;
  updatedAt: string;
  keywords: string[];
  examples: string[];
  code?: string;
  isVerified?: boolean;
};

const emptySchema = z.object({});

const taskIdSchema = z.object({
  taskId: z.string(),
});

const taskDetailSchema = z.object({
  id: z.string(),
});

const verifySchema = z.object({
  taskId: z.string(),
  link: z
    .string()
    .url('请输入有效的 URL')
    .regex(
      /^https:\/\/x\.com\/[a-zA-Z0-9_]+\/status\/\d+$/,
      '目前仅支持 X (Twitter) 帖子链接，例如: https://x.com/username/status/123456789',
    ),
});

const FETCH_TWEET_ENDPOINT = '/v1/twitter/web/fetch_tweet_detail';

function serializeTask(
  task: PromotionTaskRow,
  additions: Pick<ClientPromotionTask, 'code' | 'isVerified'> = {},
): ClientPromotionTask {
  return {
    ...task,
    keywords: task.keywords ?? [],
    examples: task.examples ?? [],
    reward: task.reward.toString(),
    expiredAt: task.expiredAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    ...additions,
  };
}

async function userTaskAdditions(
  userId: string,
  taskIds: string[],
) {
  if (taskIds.length === 0) {
    return new Map<string, Pick<ClientPromotionTask, 'code' | 'isVerified'>>();
  }

  const [codes, submissions] = await Promise.all([
    db
      .select()
      .from(PromotionCode)
      .where(and(eq(PromotionCode.userId, userId), inArray(PromotionCode.taskId, taskIds))),
    db
      .select()
      .from(PromotionSubmission)
      .where(and(eq(PromotionSubmission.userId, userId), inArray(PromotionSubmission.taskId, taskIds))),
  ]);

  return new Map(
    taskIds.map((taskId) => {
      const code = codes.find((item) => item.taskId === taskId);
      const submission = submissions.find((item) => item.taskId === taskId);
      return [
        taskId,
        {
          code: code?.code,
          isVerified: submission?.status === PromotionSubmissionStatus.VERIFIED,
        },
      ];
    }),
  );
}

export const getActivityTasks = createServerFn({ method: 'GET' })
  .validator(emptySchema)
  .handler(async (): Promise<ClientPromotionTask[]> => {
    const session = await getSession();
    const tasks = await db
      .select()
      .from(PromotionTask)
      .where(gt(PromotionTask.expiredAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
      .orderBy(desc(PromotionTask.createdAt));

    const userId = session?.user?.id;
    if (!userId) {
      return tasks.map((task) => serializeTask(task));
    }

    const additions = await userTaskAdditions(
      userId,
      tasks.map((task) => task.id),
    );

    return tasks.map((task) => serializeTask(task, additions.get(task.id)));
  });

export const getActivityTaskDetail = createServerFn({ method: 'GET' })
  .validator(taskDetailSchema)
  .handler(async ({ data }): Promise<ClientPromotionTask | null> => {
    const session = await getSession();
    const [task] = await db.select().from(PromotionTask).where(eq(PromotionTask.id, data.id)).limit(1);

    if (!task) return null;

    const userId = session?.user?.id;
    if (!userId) {
      return serializeTask(task);
    }

    const additions = await userTaskAdditions(userId, [task.id]);
    return serializeTask(task, additions.get(task.id));
  });

export const getPromotionCode = createServerFn({ method: 'POST' })
  .validator(taskIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('请先登录');
    }

    const [task] = await db.select().from(PromotionTask).where(eq(PromotionTask.id, data.taskId)).limit(1);

    if (!task) {
      throw new Error('任务不存在');
    }

    const [existingCode] = await db
      .select()
      .from(PromotionCode)
      .where(and(eq(PromotionCode.taskId, data.taskId), eq(PromotionCode.userId, session.user.id)))
      .limit(1);

    if (existingCode) {
      return {
        code: existingCode.code,
      };
    }

    const [code] = await db
      .insert(PromotionCode)
      .values({
        taskId: data.taskId,
        userId: session.user.id,
        code: nanoid(6),
      })
      .returning();

    return {
      code: code.code,
    };
  });

export const verifyPromotionTask = createServerFn({ method: 'POST' })
  .validator(verifySchema)
  .handler(async ({ data }) => {
    const { fetchTikhub } = await import('@/lib/tikhub');
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('请先登录');
    }

    const tweetId = data.link.split('/').pop();
    if (!tweetId) {
      throw new Error('帖子ID不存在');
    }

    const [task] = await db.select().from(PromotionTask).where(eq(PromotionTask.id, data.taskId)).limit(1);

    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.link && task.link === data.link) {
      throw new Error('帖子链接与任务链接相同');
    }

    const [code] = await db
      .select()
      .from(PromotionCode)
      .where(and(eq(PromotionCode.taskId, task.id), eq(PromotionCode.userId, session.user.id)))
      .limit(1);

    if (!code) {
      throw new Error('推广码不存在');
    }

    const [existingSubmission] = await db
      .select()
      .from(PromotionSubmission)
      .where(and(eq(PromotionSubmission.taskId, task.id), eq(PromotionSubmission.userId, session.user.id)))
      .limit(1);

    if (existingSubmission) {
      throw new Error('您已经提交过该任务');
    }

    const [existingSubmissionByLink] = await db
      .select()
      .from(PromotionSubmission)
      .where(eq(PromotionSubmission.link, data.link))
      .limit(1);

    if (existingSubmissionByLink) {
      throw new Error('链接已提交过');
    }

    const tweetData = await fetchTikhub(
      'GET',
      `${FETCH_TWEET_ENDPOINT}?${new URLSearchParams({ tweet_id: tweetId })}`,
    );

    if (tweetData.data.status !== 'active') {
      throw new Error('帖子不存在');
    }

    if (!tweetData.data.text.includes(code.code) && !tweetData.data.display_text.includes(code.code)) {
      throw new Error('帖子内容不包含推广码');
    }

    if (
      task.keywords &&
      !task.keywords.some((keyword) => tweetData.data.text.includes(keyword))
    ) {
      throw new Error('帖子内容必须包含至少一个关键词');
    }

    if (task.taskType === PromotionTaskType.PUBLISH_POST && tweetData.data.reply_to) {
      throw new Error('帖子是回复帖子，请发布新的帖子');
    }

    if (task.taskType === PromotionTaskType.COMMENT_POST) {
      if (!tweetData.data.reply_to) {
        throw new Error('帖子不是回复帖子，请发布回复帖子');
      }

      const taskTweetId = task.link?.split('/').pop();
      if (!taskTweetId) {
        throw new Error('服务器内部错误');
      }

      if (tweetData.data.reply_to !== taskTweetId) {
        throw new Error('帖子回复的帖子不正确');
      }
    }

    await db.transaction(async (tx) => {
      await tx.insert(PromotionSubmission).values({
        taskId: task.id,
        userId: session.user.id,
        link: data.link,
        scrapedData: tweetData.data,
        verifiedData: {
          status: PromotionSubmissionStatus.VERIFIED,
          text: tweetData.data.text,
          reply_to: tweetData.data.reply_to,
          author: tweetData.data.author,
          likes: tweetData.data.likes,
          comments: tweetData.data.comments,
          retweets: tweetData.data.retweets,
          views: tweetData.data.views,
          bookmarks: tweetData.data.bookmarks,
          created_at: tweetData.data.created_at,
        },
        status: PromotionSubmissionStatus.VERIFIED,
      });

      await tx.insert(RechargeCredit).values({
        userId: session.user.id,
        amount: fromDecimal(task.reward),
        orderId: `MP-${nanoid(32)}`,
        type: RechargeType.PROMOTION,
        status: RechargeStatus.SUCCESS,
      });

      const result = await addCreditInTransaction(tx, session.user.id, task.reward, true);
      if (!result.success) {
        throw new Error(result.error || 'Failed to grant promotion credit');
      }
    });

    return {
      success: true,
      data: serializeTask(task),
    };
  });
