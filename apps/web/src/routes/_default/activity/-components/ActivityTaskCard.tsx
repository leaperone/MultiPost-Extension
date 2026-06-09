import { Badge, Card, CardBody } from '@heroui/react';

import {
  PromotionTaskType,
  PromotionTaskTypeLabelMap,
  type ClientPromotionTask,
} from '../../../../actions/activity';

export default function ActivityTaskCard({ task }: { task: ClientPromotionTask }) {
  return (
    <Card
      isPressable
      as="a"
      href={`/activity/${task.id}`}
      target="_blank"
      className="group cursor-pointer overflow-hidden border border-border/50 transition-all duration-200 hover:border-primary/20 hover:shadow-[0_0_0_1px_rgba(var(--primary),0.1)]">
      <CardBody className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-medium">{task.title}</h3>
          <Badge
            color="primary"
            variant="flat"
            className="shrink-0">
            {PromotionTaskTypeLabelMap[task.taskType as PromotionTaskType]}
          </Badge>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">{task.description}</p>

        <div className="grid gap-2 rounded-lg bg-muted/30 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">奖励:</span>
            <span className="font-medium text-primary">$ {task.reward} 免费余额</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">有效期至:</span>
            <time
              dateTime={new Date(task.expiredAt).toISOString()}
              suppressHydrationWarning>
              {new Date(task.expiredAt).toLocaleDateString()}
            </time>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
