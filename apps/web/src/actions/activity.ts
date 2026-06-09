import { createServerFn } from '@tanstack/react-start';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { PromotionTask } from '@/prisma/client_multipost';
import { RechargeStatus, RechargeType } from './credit/types';

type MultipostDb = typeof import('../lib/db')['multipostDb'];

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
  PromotionTask,
  'reward' | 'expiredAt' | 'createdAt' | 'updatedAt'
> & {
  reward: string;
  expiredAt: string;
  createdAt: string;
  updatedAt: string;
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
  task: PromotionTask,
  additions: Pick<ClientPromotionTask, 'code' | 'isVerified'> = {},
): ClientPromotionTask {
  return {
    ...task,
    reward: task.reward.toString(),
    expiredAt: task.expiredAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    ...additions,
  };
}

async function getActivityServerDeps() {
  const [{ multipostDb }, { getSession }] = await Promise.all([
    import('../lib/db'),
    import('../lib/session'),
  ]);

  return { multipostDb, getSession };
}

async function userTaskAdditions(
  multipostDb: MultipostDb,
  userId: string,
  taskIds: string[],
) {
  const [codes, submissions] = await Promise.all([
    multipostDb.promotionCode.findMany({
      where: {
        userId,
        taskId: { in: taskIds },
      },
    }),
    multipostDb.promotionSubmission.findMany({
      where: {
        userId,
        taskId: { in: taskIds },
      },
    }),
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
    const { multipostDb, getSession } = await getActivityServerDeps();
    const session = await getSession();
    const tasks = await multipostDb.promotionTask.findMany({
      where: {
        expiredAt: {
          gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const userId = session?.user?.id;
    if (!userId) {
      return tasks.map((task) => serializeTask(task));
    }

    const additions = await userTaskAdditions(
      multipostDb,
      userId,
      tasks.map((task) => task.id),
    );

    return tasks.map((task) => serializeTask(task, additions.get(task.id)));
  });

export const getActivityTaskDetail = createServerFn({ method: 'GET' })
  .validator(taskDetailSchema)
  .handler(async ({ data }): Promise<ClientPromotionTask | null> => {
    const { multipostDb, getSession } = await getActivityServerDeps();
    const session = await getSession();
    const task = await multipostDb.promotionTask.findUnique({
      where: { id: data.id },
    });

    if (!task) return null;

    const userId = session?.user?.id;
    if (!userId) {
      return serializeTask(task);
    }

    const additions = await userTaskAdditions(multipostDb, userId, [task.id]);
    return serializeTask(task, additions.get(task.id));
  });

export const getPromotionCode = createServerFn({ method: 'POST' })
  .validator(taskIdSchema)
  .handler(async ({ data }) => {
    const { multipostDb, getSession } = await getActivityServerDeps();
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('请先登录');
    }

    const task = await multipostDb.promotionTask.findUnique({
      where: {
        id: data.taskId,
      },
    });

    if (!task) {
      throw new Error('任务不存在');
    }

    const existingCode = await multipostDb.promotionCode.findFirst({
      where: {
        taskId: data.taskId,
        userId: session.user.id,
      },
    });

    if (existingCode) {
      return {
        code: existingCode.code,
      };
    }

    const code = await multipostDb.promotionCode.create({
      data: {
        taskId: data.taskId,
        userId: session.user.id,
        code: nanoid(6),
      },
    });

    return {
      code: code.code,
    };
  });

export const verifyPromotionTask = createServerFn({ method: 'POST' })
  .validator(verifySchema)
  .handler(async ({ data }) => {
    const { multipostDb, getSession } = await getActivityServerDeps();
    const [{ fetchTikhub }, { addCredit }] = await Promise.all([
      import('@/lib/tikhub'),
      import('./credit/_core'),
    ]);
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('请先登录');
    }

    const tweetId = data.link.split('/').pop();
    if (!tweetId) {
      throw new Error('帖子ID不存在');
    }

    const task = await multipostDb.promotionTask.findUnique({
      where: { id: data.taskId },
    });

    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.link && task.link === data.link) {
      throw new Error('帖子链接与任务链接相同');
    }

    const code = await multipostDb.promotionCode.findFirst({
      where: {
        taskId: task.id,
        userId: session.user.id,
      },
    });

    if (!code) {
      throw new Error('推广码不存在');
    }

    const existingSubmission = await multipostDb.promotionSubmission.findFirst({
      where: {
        taskId: task.id,
        userId: session.user.id,
      },
    });

    if (existingSubmission) {
      throw new Error('您已经提交过该任务');
    }

    const existingSubmissionByLink = await multipostDb.promotionSubmission.findFirst({
      where: {
        link: data.link,
      },
    });

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

    await multipostDb.$transaction(async (tx) => {
      await tx.promotionSubmission.create({
        data: {
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
        },
      });

      await tx.rechargeCredit.create({
        data: {
          userId: session.user.id,
          amount: task.reward,
          orderId: `MP-${nanoid(32)}`,
          type: RechargeType.PROMOTION,
          status: RechargeStatus.SUCCESS,
        },
      });

      await addCredit(session.user.id, task.reward, true);
    });

    return {
      success: true,
      data: serializeTask(task),
    };
  });
