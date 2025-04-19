'use server';

import { multipostDb } from '@/lib/db';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { PromotionSubmissionStatus, PromotionTaskType } from '@/app/api/promotion/types';
import { RechargeType, RechargeStatus } from '@/actions/credit/types';
import { fetchTikhub } from '@/lib/tikhub';
import { auth } from '@/auth';
const getCodeSchema = z.object({
  taskId: z.string(),
});

export async function getPromotionCode(taskId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('请先登录');
  }

  if (!session.user.id) {
    throw new Error('请先登录, 获取用户ID失败');
  }

  try {
    const validatedData = getCodeSchema.parse({ taskId });

    const task = await multipostDb.promotionTask.findUnique({
      where: {
        id: validatedData.taskId,
      },
    });

    if (!task) {
      throw new Error('任务不存在');
    }

    const existingCode = await multipostDb.promotionCode.findFirst({
      where: {
        taskId: validatedData.taskId,
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
        taskId: validatedData.taskId,
        userId: session.user.id,
        code: nanoid(6),
      },
    });

    return {
      code: code.code,
    };
  } catch (error) {
    throw error;
  }
}

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

export async function verifyPromotionTask(taskId: string, link: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('请先登录');
  }

  if (!session.user.id) {
    throw new Error('请先登录, 获取用户ID失败');
  }

  try {
    const validatedData = verifySchema.parse({ taskId, link });

    const tweetId = validatedData.link.split('/').pop();
    if (!tweetId) {
      throw new Error('帖子ID不存在');
    }

    const task = await multipostDb.promotionTask.findUnique({
      where: { id: validatedData.taskId },
    });

    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.link && task.link === validatedData.link) {
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
        link: validatedData.link,
      },
    });

    if (existingSubmissionByLink) {
      throw new Error('链接已提交过');
    }

    const tweetData = await fetchTikhub('GET', FETCH_TWEET_ENDPOINT + '?' + new URLSearchParams({ tweet_id: tweetId }));

    if (tweetData.data.status !== 'active') {
      throw new Error('帖子不存在');
    }

    if (!tweetData.data.text.includes(code.code) && !tweetData.data.display_text.includes(code.code)) {
      throw new Error('帖子内容不包含推广码');
    }

    if (
      task.keywords &&
      !task.keywords.some((keyword) => {
        // TODO 如果是英文关键词，忽略大小写
        return tweetData.data.text.includes(keyword);
      })
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
      if (!session.user.id) {
        throw new Error('请先登录, 获取用户ID失败');
      }
      await tx.promotionSubmission.create({
        data: {
          taskId: task.id,
          userId: session.user.id,
          link: validatedData.link,
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

      await tx.credit.update({
        where: { userId: session.user.id },
        data: {
          freeCredits: { increment: task.reward },
        },
      });
    });

    return {
      success: true,
      data: {
        ...task,
        reward: task.reward.toString(),
      },
    };
  } catch (error) {
    throw error;
  }
}
