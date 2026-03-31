import { multipostDb } from '@/lib/db';
import { authKey } from '@/actions/authKey';
import { successResponse } from '@/lib/response';

export async function GET(request: Request) {
  const { userId } = await authKey(request);

  const tasks = await multipostDb.promotionTask.findMany({
    where: {
      expiredAt: {
        gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  if (!userId) {
    return successResponse(
      tasks.map((task) => ({
        ...task,
        reward: task.reward.toString(),
      })),
    );
  }

  const codes = await multipostDb.promotionCode.findMany({
    where: {
      userId,
    },
  });

  const submissions = await multipostDb.promotionSubmission.findMany({
    where: {
      userId,
    },
  });

  return successResponse(
    tasks.map((task) => {
      const code = codes.find((code) => code.taskId === task.id);
      const submission = submissions.find((submission) => submission.taskId === task.id);
      return {
        ...task,
        reward: task.reward.toString(),
        code: code?.code,
        isVerified: submission?.status === 'VERIFIED',
      };
    }),
  );
}
