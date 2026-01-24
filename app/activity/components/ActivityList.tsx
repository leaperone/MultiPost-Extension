'use client';

import { useState, useEffect } from 'react';
import { type ClientPromotionTask, PromotionTaskTypeLabelMap, PromotionTaskType } from '@/app/api/promotion/types';
import { Badge, Card, CardBody } from '@heroui/react';

export default function ActivityList() {
  const [tasks, setTasks] = useState<ClientPromotionTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/promotion/tasks');
        const data = await res.json();
        setTasks(data.data);
      } catch (err) {
        setError('获取任务列表失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (tasks.length === 0) {
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
      {tasks.map((task: ClientPromotionTask) => (
        <Card
          key={task.id}
          isPressable
          as="a"
          href={`/activity/${task.id}`}
          target="_blank"
          className="group cursor-pointer overflow-hidden border border-border/50 transition-all duration-200 hover:border-primary/20 hover:shadow-[0_0_0_1px_rgba(var(--primary),0.1)]">
          <CardBody className="space-y-4 p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-medium">{task.title}</h3>
              <Badge
                color="primary"
                variant="flat"
                className="shrink-0">
                {PromotionTaskTypeLabelMap[task.taskType as PromotionTaskType]}
              </Badge>
            </div>

            {/* Description */}
            <p className="line-clamp-2 text-sm text-muted-foreground">{task.description}</p>

            {/* Task Info */}
            <div className="grid gap-2 rounded-lg bg-muted/30 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">奖励:</span>
                <span className="font-medium text-primary">$ {task.reward} 免费余额</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">有效期至:</span>
                <span>{new Date(task.expiredAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
