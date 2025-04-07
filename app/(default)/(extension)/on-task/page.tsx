'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getTaskData, updateTaskStatus } from './action';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { funcPublish } from '@/lib/extension';
import { ExtensionTask } from '@/prisma/client_multipost';
import { PublishPostData, TaskStatus, SchedulePublishPostData, TaskType } from '@/app/api/extension/types';
import { Accordion, AccordionItem } from '@heroui/accordion';
import { useTranslation } from '@/i18n/client';

export default function OnTaskPage() {
  const { t } = useTranslation('on-task');
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [taskData, setTaskData] = useState<ExtensionTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskHandler = async (task: ExtensionTask) => {
    if (!taskId || task?.status !== TaskStatus.PENDING) {
      return;
    }
    await updateTaskStatus(taskId, 'ACTIVE');
    if (task.taskType === TaskType.PUBLISH_POST) {
      await funcPublish(task.taskData as PublishPostData);
      await updateTaskStatus(taskId, TaskStatus.DONE);
    } else if (task.taskType === TaskType.SCHEDULE_PUBLISH_POST) {
      const data = task.taskData as SchedulePublishPostData;
      if (data.timestamp <= new Date().getTime() + 10 * 60 * 1000 && data.timestamp > new Date().getTime()) {
        setTimeout(async () => {
          await funcPublish(data);
          await updateTaskStatus(taskId, TaskStatus.DONE);
        }, data.timestamp - new Date().getTime());
      } else if (data.timestamp <= new Date().getTime()) {
        await funcPublish(data);
        await updateTaskStatus(taskId, TaskStatus.DONE);
      }
    }
  };

  useEffect(() => {
    async function fetchTaskData() {
      if (!taskId) {
        setError(t('error.task_id_required'));
        setLoading(false);
        return;
      }

      try {
        const data = await getTaskData(taskId);
        if (data) {
          const taskData = {
            ...data,
            taskData: data.taskData,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            userId: '',
            targetClientId: '',
          };
          setTaskData(taskData);

          taskHandler(taskData);
        }
      } catch (err) {
        setError(t('error.fetch_failed'));
      } finally {
        setLoading(false);
      }
    }

    fetchTaskData();
  }, [taskId, t]);

  if (loading) {
    return (
      <div className="p-4 pt-16">
        <Card className="mx-auto w-full max-w-3xl">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 pt-16">
        <Card className="mx-auto w-full max-w-3xl border-red-200">
          <CardHeader>
            <CardTitle className="text-red-500">{t('error.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!taskData) {
    return (
      <div className="p-4 pt-16">
        <Card className="mx-auto w-full max-w-3xl">
          <CardHeader>
            <CardTitle>{t('not_found.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('not_found.message', { taskId })}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pt-16">
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{t('task_details.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">{t('task_details.fields.task_id')}</h3>
              <p className="text-sm text-gray-500">{taskData.id}</p>
            </div>
            <div>
              <h3 className="font-medium">{t('task_details.fields.task_type')}</h3>
              <p className="text-sm text-gray-500">{taskData.taskType}</p>
            </div>
            <div>
              <h3 className="font-medium">{t('task_details.fields.status')}</h3>
              <p className="text-sm text-gray-500">{taskData.status}</p>
            </div>

            <div>
              <h3 className="font-medium">{t('task_details.fields.created_at')}</h3>
              <p className="text-sm text-gray-500">{taskData.createdAt.toLocaleString()}</p>
            </div>
            <div>
              <h3 className="font-medium">{t('task_details.fields.updated_at')}</h3>
              <p className="text-sm text-gray-500">{taskData.updatedAt.toLocaleString()}</p>
            </div>
            <Accordion>
              <AccordionItem title={t('task_details.fields.task_data')}>
                <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-sm">
                  {JSON.stringify(taskData.taskData, null, 2)}
                </pre>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
