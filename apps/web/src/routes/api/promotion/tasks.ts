import { createFileRoute } from '@tanstack/react-router';

import { multipostDb } from '../../../lib/db';
import { successResponse } from '../../../lib/response';

export const Route = createFileRoute('/api/promotion/tasks')({
  server: {
    handlers: {
      GET,
    },
  },
});

async function GET({ request }: { request: Request }) {
  const session = request.headers.get('cookie')
    ? await import('../../../lib/session').then(({ getSessionFromRequest }) =>
        getSessionFromRequest(request),
      )
    : null;
  const userId = session?.user?.id;

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
      const code = codes.find((item) => item.taskId === task.id);
      const submission = submissions.find((item) => item.taskId === task.id);
      return {
        ...task,
        reward: task.reward.toString(),
        code: code?.code,
        isVerified: submission?.status === 'VERIFIED',
      };
    }),
  );
}
