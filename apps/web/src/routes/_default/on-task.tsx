import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, CheckCircle2, Circle, Clock3, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useTranslation } from '@/i18n/client';
import { funcPublish } from '@/lib/extension';
import { routeMeta } from '@/lib/seo';
import {
  draftPostSchema,
  fileDataSchema,
  publishPostSchema,
  schedulePublishPostSchema,
  TaskStatus,
  TaskType,
  type PublishPostData,
} from '@/routes/api/extension/-types';

import {
  claimExtensionTask,
  getExtensionTask,
  getExtensionTaskDraft,
  updateExtensionTaskStatus,
  type ExtensionTaskData,
} from './on-task/-server';

type ProcessingPhase = 'loading' | 'waiting' | 'publishing' | 'done' | 'failed' | 'already-handled';

type ErrorReason =
  | 'TASK_ID_REQUIRED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INVALID_TASK'
  | 'DRAFT_NOT_FOUND'
  | 'EXTENSION_NOT_INSTALLED'
  | 'EXTENSION_TIMEOUT'
  | 'PUBLISH_FAILED'
  | 'STATUS_UPDATE_FAILED'
  | 'FETCH_FAILED';

interface TaskExecutionError extends Error {
  reason: ErrorReason;
}

function createTaskExecutionError(reason: ErrorReason): TaskExecutionError {
  const error = new Error(reason) as TaskExecutionError;
  error.name = 'TaskExecutionError';
  error.reason = reason;
  return error;
}

function isTaskExecutionError(error: unknown): error is TaskExecutionError {
  return error instanceof Error && error.name === 'TaskExecutionError' && 'reason' in error;
}

export const Route = createFileRoute('/_default/on-task')({
  validateSearch: (search) => ({
    taskId: typeof search.taskId === 'string' ? search.taskId : undefined,
    handoffToken: typeof search.handoffToken === 'string' ? search.handoffToken : undefined,
  }),
  head: () => ({
    meta: routeMeta({
      title: 'Extension Task - MultiPost',
      description: 'Process a MultiPost browser extension task handoff.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: OnTaskPage,
});

function getErrorReason(error: unknown): ErrorReason {
  if (isTaskExecutionError(error)) {
    return error.reason;
  }

  return 'FETCH_FAILED';
}

function getPublishErrorReason(error?: string): ErrorReason {
  if (error === 'extension_not_installed') {
    return 'EXTENSION_NOT_INSTALLED';
  }

  if (error?.toLowerCase().includes('timeout')) {
    return 'EXTENSION_TIMEOUT';
  }

  return 'PUBLISH_FAILED';
}

function waitUntil(timestamp: number) {
  const delay = Math.max(0, timestamp - Date.now());
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delay);
  });
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function OnTaskPage() {
  const { t } = useTranslation('on-task');
  const { taskId, handoffToken } = Route.useSearch();
  const executionRef = useRef<string | null>(null);
  const [task, setTask] = useState<ExtensionTaskData | null>(null);
  const [phase, setPhase] = useState<ProcessingPhase>('loading');
  const [errorReason, setErrorReason] = useState<ErrorReason | null>(null);
  const [scheduledAt, setScheduledAt] = useState<number | null>(null);
  const [secondsUntilPublish, setSecondsUntilPublish] = useState(0);

  useEffect(() => {
    if (scheduledAt === null) {
      setSecondsUntilPublish(0);
      return;
    }

    const updateCountdown = () => {
      setSecondsUntilPublish(Math.max(0, Math.ceil((scheduledAt - Date.now()) / 1000)));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [scheduledAt]);

  useEffect(() => {
    if (!taskId) {
      setErrorReason('TASK_ID_REQUIRED');
      setPhase('failed');
      return;
    }

    const executionKey = `${taskId}:${handoffToken ?? ''}`;
    if (executionRef.current === executionKey) {
      return;
    }
    executionRef.current = executionKey;

    const access = {
      taskId,
      handoffToken,
    };
    let hasClaimedTask = false;

    const updateLocalStatus = (status: string) => {
      setTask((currentTask) =>
        currentTask
          ? {
              ...currentTask,
              status,
              updatedAt: new Date().toISOString(),
            }
          : currentTask,
      );
    };

    const finalizeTask = async (status: typeof TaskStatus.DONE | typeof TaskStatus.FAILED) => {
      const result = await updateExtensionTaskStatus({
        data: {
          ...access,
          status,
        },
      });

      if (!result.success || !result.updated) {
        throw createTaskExecutionError('STATUS_UPDATE_FAILED');
      }

      updateLocalStatus(status);
    };

    const waitForScheduledTime = async (timestamp: number) => {
      if (timestamp <= Date.now()) {
        return;
      }

      setScheduledAt(timestamp);
      setPhase('waiting');
      await waitUntil(timestamp);
      setScheduledAt(null);
    };

    const preparePublishData = async (currentTask: ExtensionTaskData): Promise<PublishPostData> => {
      if (currentTask.taskType === TaskType.PUBLISH_POST) {
        const result = publishPostSchema.safeParse(currentTask.taskData);
        if (!result.success) {
          throw createTaskExecutionError('INVALID_TASK');
        }
        return result.data;
      }

      if (currentTask.taskType === TaskType.SCHEDULE_PUBLISH_POST) {
        const result = schedulePublishPostSchema.safeParse(currentTask.taskData);
        if (!result.success) {
          throw createTaskExecutionError('INVALID_TASK');
        }

        await waitForScheduledTime(result.data.timestamp);
        return result.data;
      }

      if (currentTask.taskType === TaskType.DRAFT_POST) {
        const taskDataResult = draftPostSchema.safeParse(currentTask.taskData);
        if (!taskDataResult.success) {
          throw createTaskExecutionError('INVALID_TASK');
        }

        await waitForScheduledTime(taskDataResult.data.timestamp);

        const draftResult = await getExtensionTaskDraft({ data: access });
        if (!draftResult.success) {
          throw createTaskExecutionError(draftResult.error === 'DRAFT_NOT_FOUND' ? 'DRAFT_NOT_FOUND' : 'INVALID_TASK');
        }

        const filesResult = fileDataSchema.array().safeParse(draftResult.draft.files ?? []);
        if (!filesResult.success) {
          throw createTaskExecutionError('INVALID_TASK');
        }

        const publishDataResult = publishPostSchema.safeParse({
          platforms: taskDataResult.data.platforms,
          isAutoPublish: true,
          data: {
            title: draftResult.draft.title ?? '',
            content: draftResult.draft.content ?? '',
            images: filesResult.data.filter((file) => file.type?.startsWith('image')),
            videos: filesResult.data.filter((file) => file.type?.startsWith('video')),
          },
        });

        if (!publishDataResult.success) {
          throw createTaskExecutionError('INVALID_TASK');
        }

        return publishDataResult.data;
      }

      throw createTaskExecutionError('INVALID_TASK');
    };

    const processTask = async () => {
      setPhase('loading');
      setErrorReason(null);

      try {
        const taskResult = await getExtensionTask({ data: access });
        if (!taskResult.success) {
          throw createTaskExecutionError(taskResult.error === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'NOT_FOUND');
        }

        const currentTask = taskResult.task;
        setTask(currentTask);

        if (currentTask.status === TaskStatus.DONE) {
          setPhase('done');
          return;
        }

        if (currentTask.status === TaskStatus.FAILED) {
          setErrorReason('PUBLISH_FAILED');
          setPhase('failed');
          return;
        }

        if (currentTask.status !== TaskStatus.PENDING) {
          setPhase('already-handled');
          return;
        }

        const claimResult = await claimExtensionTask({ data: access });
        if (!claimResult.success) {
          throw createTaskExecutionError(claimResult.error === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'NOT_FOUND');
        }

        if (!claimResult.claimed) {
          const latestTaskResult = await getExtensionTask({ data: access });
          if (latestTaskResult.success) {
            setTask(latestTaskResult.task);
          }
          setPhase('already-handled');
          return;
        }

        hasClaimedTask = true;
        updateLocalStatus(TaskStatus.ACTIVE);

        const publishData = await preparePublishData(currentTask);
        setPhase('publishing');

        const publishResult = await funcPublish(publishData);
        if (!publishResult.success) {
          throw createTaskExecutionError(getPublishErrorReason(publishResult.error));
        }

        await finalizeTask(TaskStatus.DONE);
        setPhase('done');
      } catch (error) {
        console.error('Failed to process extension task:', error);
        const reason = getErrorReason(error);

        if (hasClaimedTask) {
          try {
            await finalizeTask(TaskStatus.FAILED);
          } catch (statusError) {
            console.error('Failed to mark extension task as failed:', statusError);
            setErrorReason('STATUS_UPDATE_FAILED');
            setPhase('failed');
            return;
          }
        }

        setErrorReason(reason);
        setPhase('failed');
      }
    };

    void processTask();
  }, [handoffToken, taskId]);

  const phaseContent = {
    loading: {
      icon: <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />,
      title: t('states.loading.title'),
      description: t('states.loading.description'),
    },
    waiting: {
      icon: <Clock3 className="size-5" />,
      title: t('states.waiting.title'),
      description: t('states.waiting.description', {
        countdown: formatCountdown(secondsUntilPublish),
      }),
    },
    publishing: {
      icon: <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />,
      title: t('states.publishing.title'),
      description: t('states.publishing.description'),
    },
    done: {
      icon: <CheckCircle2 className="size-5" />,
      title: t('states.done.title'),
      description: t('states.done.description'),
    },
    failed: {
      icon: <XCircle className="size-5 text-destructive" />,
      title: t('states.failed.title'),
      description: t(`errors.${errorReason ?? 'FETCH_FAILED'}`),
    },
    'already-handled': {
      icon: <Circle className="size-5" />,
      title: t('states.already_handled.title'),
      description: t('states.already_handled.description'),
    },
  } satisfies Record<ProcessingPhase, { icon: ReactNode; title: string; description: string }>;

  const content = phaseContent[phase];

  return (
    <div className="px-4 py-16 sm:px-6">
      <section
        aria-live="polite"
        className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-xl bg-card p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">{content.icon}</div>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-semibold text-balance">{content.title}</h1>
            <p className="max-w-[65ch] text-sm text-muted-foreground text-pretty">{content.description}</p>
          </div>
        </div>

        {task ? (
          <dl className="grid gap-4 rounded-lg bg-muted p-4 text-sm sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">{t('task_details.fields.task_id')}</dt>
              <dd
                className="truncate font-mono text-xs"
                title={task.id}
              >
                {task.id}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">{t('task_details.fields.task_type')}</dt>
              <dd>{task.taskType}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">{t('task_details.fields.status')}</dt>
              <dd>{task.status}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">{t('task_details.fields.created_at')}</dt>
              <dd>{new Date(task.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        ) : null}

        {phase === 'failed' ? (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-sm">
            <AlertCircle className="size-5 shrink-0 text-destructive" />
            <p>{t('states.failed.next_step')}</p>
          </div>
        ) : null}

        {task ? (
          <details className="group text-sm">
            <summary className="cursor-pointer rounded-md px-2 py-1.5 font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {t('task_details.fields.task_data')}
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(task.taskData, null, 2)}
            </pre>
          </details>
        ) : null}
      </section>
    </div>
  );
}
