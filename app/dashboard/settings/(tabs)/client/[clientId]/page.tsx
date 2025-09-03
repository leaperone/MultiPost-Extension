import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Card, CardHeader, CardBody, Button } from '@heroui/react';
import { Loader2, Router, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { notFound, redirect } from 'next/navigation';
import TasksTable from './TasksTable';

interface ClientDetailsPageProps {
  params: {
    clientId: string;
  };
}

async function ClientInfo({ clientId }: { clientId: string }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const client = await prisma.extensionClient.findFirst({
    where: {
      id: clientId,
      userId: session.user.id,
      deletedAt: null,
    },
  });

  if (!client) {
    notFound();
  }

  return (
    <Card className="border border-default-200 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <Router className="size-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">{client.name}</h2>
            <p className="text-sm text-foreground/60">
              Last seen {formatDistanceToNow(client.updatedAt, { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-6 pt-0">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-default-50 p-4">
            <p className="mb-1 text-sm text-foreground/60">Client ID</p>
            <p className="break-all font-mono text-sm text-foreground">{client.id}</p>
          </div>
          <div className="rounded-lg bg-default-50 p-4">
            <p className="mb-1 text-sm text-foreground/60">Extension Version</p>
            <p className="text-sm text-foreground">{client.extensionVersion}</p>
          </div>
          <div className="rounded-lg bg-default-50 p-4">
            <p className="mb-1 text-sm text-foreground/60">Created At</p>
            <p className="text-sm text-foreground">
              {client.createdAt.toLocaleDateString()} {client.createdAt.toLocaleTimeString()}
            </p>
          </div>
          <div className="rounded-lg bg-default-50 p-4">
            <p className="mb-1 text-sm text-foreground/60">Last Updated</p>
            <p className="text-sm text-foreground">
              {client.updatedAt.toLocaleDateString()} {client.updatedAt.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

async function TasksList({ clientId }: { clientId: string }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const tasks = await prisma.extensionTask.findMany({
    where: {
      targetClientId: clientId,
      userId: session.user.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Helper function to get task display info
  const getTaskDisplayInfo = async (task: { taskType: string; taskData: unknown }) => {
    const taskData = task.taskData as Record<string, unknown>;

    // For draft tasks, try to get the draft title
    if (task.taskType === 'DRAFT_POST' && taskData?.draftId) {
      try {
        const draft = await prisma.draft.findFirst({
          where: {
            id: taskData.draftId,
            userId: session.user.id,
          },
          select: {
            title: true,
          },
        });
        return {
          title: draft?.title || 'Untitled Draft',
          timestamp: taskData?.timestamp as number | undefined,
        };
      } catch (error) {
        return {
          title: 'Draft Task',
          timestamp: taskData?.timestamp as number | undefined,
        };
      }
    }

    // For publish/schedule tasks, try to get title from data
    if (taskData?.data && typeof taskData.data === 'object' && 'title' in taskData.data) {
      return {
        title: (taskData.data as { title: string }).title,
        timestamp: taskData?.timestamp as number | undefined,
      };
    }

    // Fallback
    return {
      title: `${task.taskType.replace(/_/g, ' ')} Task`,
      timestamp: taskData?.timestamp as number | undefined,
    };
  };

  // Get display info for all tasks
  const tasksWithDisplayInfo = await Promise.all(
    tasks.map(async (task) => ({
      ...task,
      displayInfo: await getTaskDisplayInfo(task),
    })),
  );

  if (tasksWithDisplayInfo.length === 0) {
    return (
      <Card className="border border-default-200 shadow-none">
        <CardBody className="py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-default-100">
              <Calendar className="size-8 text-default-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">No Tasks</h3>
              <p className="mt-1 text-sm text-foreground/60">This client has no tasks assigned.</p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return <TasksTable tasks={tasksWithDisplayInfo} />;
}

export default async function ClientDetailsPage({ params }: ClientDetailsPageProps) {
  const session = await auth();
  const { clientId } = await params;

  if (!session?.user?.id) {
    redirect('/login');
  }

  const client = await prisma.extensionClient.findFirst({
    where: {
      id: clientId,
      userId: session.user.id,
      deletedAt: null,
    },
  });

  if (!client) {
    notFound();
  }

  const taskCount = await prisma.extensionTask.count({
    where: {
      targetClientId: clientId,
      userId: session.user.id,
    },
  });

  return (
    <div className="size-full overflow-y-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Details</h1>
          <p className="mt-2 text-foreground/60">View detailed information about this extension client</p>
        </div>
        <Button
          as="a"
          href="/dashboard/settings/client"
          variant="bordered"
          size="sm">
          Back to Clients
        </Button>
      </div>

      <div className="space-y-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin" />
            </div>
          }>
          <ClientInfo clientId={clientId} />
        </Suspense>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Tasks ({taskCount})</h2>
          </div>

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            }>
            <TasksList clientId={clientId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
