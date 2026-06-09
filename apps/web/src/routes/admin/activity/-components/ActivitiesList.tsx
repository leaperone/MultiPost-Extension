import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from '@heroui/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

import {
  PromotionTaskType,
  PromotionTaskTypeLabelMap,
  type ClientPromotionTask,
} from '../../../../actions/activity';
import { EditActivityModal } from './EditActivityModal';

interface ClientActivityListProps {
  tasks: ClientPromotionTask[];
}

export function ActivitiesList({ tasks }: ClientActivityListProps) {
  const [editTask, setEditTask] = useState<ClientPromotionTask | undefined>();

  return (
    <>
      <div className="flex w-full flex-col gap-8">
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="border-2 border-foreground-200 shadow-xs">
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Chip
                    size="sm"
                    variant="flat"
                    color={task.taskType === 'PUBLISH_POST' ? 'primary' : 'secondary'}
                    className="text-sm">
                    {PromotionTaskTypeLabelMap[task.taskType as PromotionTaskType]}
                  </Chip>
                  <h3 className="text-xl font-semibold">{task.title}</h3>
                </div>
                <p className="text-muted-foreground">
                  奖励: <span className="font-semibold text-primary">$ {task.reward} 免费余额</span>
                </p>
                <Button
                  startContent={<Pencil className="size-4" />}
                  onPress={() => setEditTask(task)}>
                  编辑
                </Button>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground">{task.description}</p>
                  <div className="flex items-center gap-2"></div>
                </div>
              </CardBody>
              <CardFooter className="flex items-center justify-between">
                <div className="flex gap-2">
                  {task.keywords.map((keyword) => (
                    <Chip
                      key={keyword}
                      size="sm"
                      variant="flat"
                      className="text-sm">
                      {keyword}
                    </Chip>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  有效期至: {new Date(task.expiredAt).toLocaleDateString()}
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {editTask && (
        <EditActivityModal
          isOpen={!!editTask}
          onOpenChange={() => setEditTask(undefined)}
          initialData={editTask}
        />
      )}
    </>
  );
}
