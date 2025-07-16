'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDraftData, getTaskData, updateTaskStatus } from './action';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileData, funcPublish } from '@/lib/extension';
import { ExtensionTask } from '@/prisma/client_multipost';
import { PublishPostData, TaskStatus, SchedulePublishPostData, TaskType, DraftPostData } from '@/app/api/extension/types';
import { Accordion, AccordionItem } from '@heroui/accordion';
import { useTranslation } from '@/i18n/client';

export default function OnTaskPage() {
  const { t } = useTranslation('on-task');
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [taskData, setTaskData] = useState<ExtensionTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTaskProcessing, setIsTaskProcessing] = useState(false);

  // 格式化倒计时显示
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const taskHandler = async (task: ExtensionTask) => {
    if (!taskId || task?.status !== TaskStatus.PENDING) {
      return;
    }

    await updateTaskStatus(taskId, 'ACTIVE');

    if (task.taskType === TaskType.PUBLISH_POST) {
      await funcPublish(task.taskData as PublishPostData);
      await updateTaskStatus(taskId, TaskStatus.DONE);
      setIsTaskProcessing(true);
    } else if (task.taskType === TaskType.SCHEDULE_PUBLISH_POST) {
      const data = task.taskData as SchedulePublishPostData;
      if (data.timestamp <= new Date().getTime() + 10 * 60 * 1000 && data.timestamp > new Date().getTime()) {
        setTimeout(async () => {
          await funcPublish(data);
          await updateTaskStatus(taskId, TaskStatus.DONE);
          setIsTaskProcessing(true);
        }, data.timestamp - new Date().getTime());
      } else if (data.timestamp <= new Date().getTime()) {
        await funcPublish(data);
        await updateTaskStatus(taskId, TaskStatus.DONE);
        setIsTaskProcessing(true);
      }
    } else if (task.taskType === TaskType.DRAFT_POST) {
      const data = task.taskData as DraftPostData;
      const draft = await getDraftData(data.draftId);
      if (draft) {
        const publishData = {
          platforms: data.platforms,
          isAutoPublish: true,
          data: {
            title: draft.title,
            content: draft.content,
            images: draft.files as unknown as FileData[],
          },
        };
        await funcPublish(publishData as PublishPostData);
        await updateTaskStatus(taskId, TaskStatus.DONE);
        setIsTaskProcessing(true);
      }
    }

    // 开始5分钟倒计时
    setCountdown(300); // 5 minutes = 300 seconds
  };

  // 倒计时效果
  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      window.close();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

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
          {/* 倒计时提示 */}
          {countdown !== null && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {isTaskProcessing ? '任务处理完成' : '任务处理中'}
                  </p>
                  <p className="text-sm text-blue-600">
                    窗口将在 <span className="font-mono text-lg font-bold">{formatCountdown(countdown)}</span>{' '}
                    后自动关闭
                  </p>
                </div>
                <div className="text-blue-500">
                  <svg
                    className="size-6 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
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
