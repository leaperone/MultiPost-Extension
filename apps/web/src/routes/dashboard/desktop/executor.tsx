import { createFileRoute } from '@tanstack/react-router';
import { Avatar, Button, Card, CardBody, Progress } from '@heroui/react';
import { ClockIcon, HomeIcon } from 'lucide-react';
import { useState } from 'react';

import {
  getDesktopBridge,
  useIsDesktop,
  usePublishProgress,
  type PublishProgressEvent,
} from '@/lib/desktop-bridge';
import { routeMeta } from '../../../lib/seo';
import { DesktopPageShell, DesktopRequiredCard, EmptyState, StatusChip } from './-components';

export const Route = createFileRoute('/dashboard/desktop/executor')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Executor | MultiPost',
      description: 'Track MultiPost Desktop publishing progress.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopExecutorPage,
});

function DesktopExecutorPage() {
  const isDesktop = useIsDesktop();
  const [states, setStates] = useState<PublishProgressEvent[]>([]);
  const [completed, setCompleted] = useState(false);

  usePublishProgress(
    (event) => {
      setStates((previous) => {
        const index = previous.findIndex((state) => state.accountId === event.accountId);
        if (index === -1) return [...previous, event];
        const next = [...previous];
        next[index] = event;
        return next;
      });
    },
    () => setCompleted(true),
  );

  if (!isDesktop) return <DesktopRequiredCard />;

  const doneCount = states.filter((state) =>
    state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled'
  ).length;
  const progress = states.length > 0 ? (doneCount / states.length) * 100 : 0;

  return (
    <DesktopPageShell
      title="Publish Executor"
      description={completed ? 'Publishing completed.' : 'Track active publish progress.'}
      actions={
        completed ? (
          <Button
            color="primary"
            startContent={<HomeIcon className="size-4" />}
            onPress={() => getDesktopBridge()?.navigation.navigateTo('/dashboard')}>
            Dashboard
          </Button>
        ) : null
      }>
      {states.length > 0 ? (
        <Card className="shadow-none border">
          <CardBody className="gap-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overall progress</span>
              <span className="text-sm text-muted-foreground">
                {doneCount} / {states.length}
              </span>
            </div>
            <Progress
              value={progress}
              className="h-2"
            />
          </CardBody>
        </Card>
      ) : null}

      {states.length === 0 ? (
        <EmptyState
          title="No active publish tasks"
          description="Start a Desktop publish task to see progress here."
        />
      ) : (
        <div className="grid gap-3">
          {states.map((state) => (
            <Card
              key={state.accountId}
              className="shadow-none border">
              <CardBody className="flex flex-row items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    name={state.accountId}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{state.accountId}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {state.platform}
                      {state.message ? ` · ${state.message}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {state.progress != null ? (
                    <span className="text-sm text-muted-foreground">{state.progress}%</span>
                  ) : null}
                  <StatusChip status={state.status} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!completed && states.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClockIcon className="size-4" />
          Waiting for Desktop publish events.
        </p>
      ) : null}
    </DesktopPageShell>
  );
}
