import { type ClientPromotionTask } from '@/app/api/promotion/types';
import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { ActivityTaskCard } from './ActivityTaskCard';

export default async function ActivityList() {
  try {
    const session = await auth();
    const tasks = await multipostDb.promotionTask.findMany({ where: { expiredAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } });
    const userId = session?.user?.id;
    const activityTasks: ClientPromotionTask[] = !userId
      ? tasks.map((task) => ({
          ...task,
          reward: task.reward.toString(),
        }))
      : await (async () => {
          const [codes, submissions] = await Promise.all([
            multipostDb.promotionCode.findMany({ where: { userId } }),
            multipostDb.promotionSubmission.findMany({ where: { userId } }),
          ]);
          return tasks.map((task) => {
            const code = codes.find((code) => code.taskId === task.id);
            const submission = submissions.find((submission) => submission.taskId === task.id);
            return {
              ...task,
              reward: task.reward.toString(),
              code: code?.code,
              isVerified: submission?.status === 'VERIFIED',
            };
          });
        })();
    if (activityTasks.length === 0) {
      return (
        <div className="py-12 text-center">
          <h2 className="mb-4 text-xl font-semibold">暂无活动</h2>
          <p className="text-muted-foreground">
            目前没有进行中的活动，请稍后再来查看。您也可以关注我们的官方渠道获取最新活动通知。
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {activityTasks.map((task) => (
          <ActivityTaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  } catch (error) {
    console.error(error);
    return <div className="text-red-500">获取任务列表失败</div>;
  }
}
