import { Spacer } from '@heroui/react';
import { createFileRoute } from '@tanstack/react-router';

import { routeMeta } from '../../lib/seo';
import ActivityTaskCard from './activity/-components/ActivityTaskCard';

export const Route = createFileRoute('/_default/activity')({
  loader: async () => {
    try {
      const { getActivityTasks } = await import('../../actions/activity');
      return {
        tasks: await getActivityTasks({ data: {} }),
        error: null,
      };
    } catch (error) {
      console.error(error);
      return {
        tasks: [],
        error: '获取任务列表失败',
      };
    }
  },
  head: () => ({
    meta: routeMeta({
      title: '活动中心',
      description: '参与 MultiPost 活动，完成任务获取免费余额奖励。查看最新的推广活动和奖励信息。',
    }),
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { tasks: activityTasks, error } = Route.useLoaderData();

  return (
    <div className="container mx-auto min-h-dvh py-8">
      <Spacer y={16} />
      <div className="flex flex-col items-center justify-center">
        <h1 className="mb-8 text-3xl font-bold">活动中心</h1>
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : activityTasks.length === 0 ? (
          <div className="py-12 text-center">
            <h2 className="mb-4 text-xl font-semibold">暂无活动</h2>
            <p className="text-muted-foreground">
              目前没有进行中的活动，请稍后再来查看。您也可以关注我们的官方渠道获取最新活动通知。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {activityTasks.map((task) => (
              <ActivityTaskCard
                key={task.id}
                task={task}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
