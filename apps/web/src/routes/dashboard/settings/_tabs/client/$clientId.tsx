import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  type Selection,
} from '@heroui/react';
import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Loader2, Router, Trash2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { deleteBatchTasks, deleteTask, getClientDetails } from '../../-server';

export const Route = createFileRoute('/dashboard/settings/_tabs/client/$clientId')({
  loader: async ({ params }) => {
    const data = await getClientDetails({ data: { clientId: params.clientId } });
    if (!data) {
      throw notFound();
    }
    return data;
  },
  component: ClientDetailsPage,
});

interface Task {
  id: string;
  status: string;
  taskType: string;
  createdAt: string;
  updatedAt: string;
  displayInfo: {
    title: string;
    timestamp?: number;
  };
}

function ClientDetailsPage() {
  const { client, taskCount, tasks } = Route.useLoaderData();

  return (
    <div className="size-full overflow-y-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Details</h1>
          <p className="mt-2 text-foreground/60">View detailed information about this extension client</p>
        </div>
        <Link to="/dashboard/settings/client">
          <Button
            variant="bordered"
            size="sm">
            Back to Clients
          </Button>
        </Link>
      </div>

      <div className="space-y-8">
        <Card className="border border-default-200 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Router className="size-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">{client.name}</h2>
                <p className="text-sm text-foreground/60">
                  Last seen {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true })}
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
                  {new Date(client.createdAt).toLocaleDateString()}{' '}
                  {new Date(client.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="rounded-lg bg-default-50 p-4">
                <p className="mb-1 text-sm text-foreground/60">Last Updated</p>
                <p className="text-sm text-foreground">
                  {new Date(client.updatedAt).toLocaleDateString()}{' '}
                  {new Date(client.updatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Tasks ({taskCount})</h2>
          </div>

          {tasks.length === 0 ? (
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
          ) : (
            <TasksTable tasks={tasks} />
          )}
        </div>
      </div>
    </div>
  );
}

function TasksTable({ tasks }: { tasks: Task[] }) {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);
  const router = useRouter();
  const rowsPerPage = 25;
  const pages = Math.ceil(tasks.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return tasks.slice(start, end);
  }, [page, tasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'success';
      case 'ACTIVE':
        return 'primary';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'Done';
      case 'ACTIVE':
        return 'Active';
      case 'PENDING':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const handleDeleteSelected = async () => {
    const selectedIds =
      selectedKeys === 'all'
        ? tasks.map((task) => task.id)
        : Array.from(selectedKeys as Set<string>).map(String);

    if (selectedIds.length === 0) return;

    setIsDeletePopoverOpen(false);
    setIsBatchDeleting(true);
    try {
      await deleteBatchTasks({ data: { taskIds: selectedIds } });
      setSelectedKeys(new Set([]));
      await router.invalidate();
    } catch (error) {
      console.error('Failed to delete tasks:', error);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleDeleteSingle = (taskId: string) => {
    startTransition(async () => {
      try {
        await deleteTask({ data: { taskId } });
        await router.invalidate();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    });
  };

  const selectedCount = selectedKeys === 'all' ? tasks.length : (selectedKeys as Set<string>).size;

  return (
    <div className="space-y-4">
      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-default-50 p-4">
          <span className="text-sm font-medium">
            {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
          </span>
          <Popover
            isOpen={isDeletePopoverOpen}
            onOpenChange={setIsDeletePopoverOpen}
            placement="top"
            showArrow>
            <PopoverTrigger>
              <Button
                color="danger"
                variant="flat"
                size="sm"
                startContent={
                  isBatchDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />
                }
                isDisabled={isBatchDeleting}>
                Delete Selected
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-4">
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  Are you sure you want to delete {selectedCount} task{selectedCount > 1 ? 's' : ''}?
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => setIsDeletePopoverOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    onPress={handleDeleteSelected}>
                    Delete
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Table
        aria-label="Tasks table"
        selectionMode="multiple"
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        selectionBehavior="toggle"
        bottomContent={
          pages > 1 ? (
            <div className="flex w-full justify-center">
              <Pagination
                isCompact
                showControls
                showShadow
                color="primary"
                page={page}
                total={pages}
                onChange={setPage}
              />
            </div>
          ) : null
        }
        classNames={{
          wrapper: 'border border-default-200 shadow-none',
          th: 'bg-default-50 text-default-600 font-medium',
          td: 'py-4',
        }}>
        <TableHeader>
          <TableColumn>STATUS</TableColumn>
          <TableColumn>TASK TYPE</TableColumn>
          <TableColumn>TITLE</TableColumn>
          <TableColumn>SCHEDULED</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No tasks to display">
          {items.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Chip
                  variant="flat"
                  color={getStatusColor(task.status)}
                  size="sm">
                  {getStatusText(task.status)}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="font-medium">{task.taskType.replace(/_/g, ' ')}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-foreground">{task.displayInfo.title}</div>
                <div className="mt-1 text-xs text-default-500">ID: {task.id}</div>
              </TableCell>
              <TableCell>
                {task.displayInfo.timestamp ? (
                  <div>
                    <div className="text-sm">
                      {new Date(task.displayInfo.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-default-500">
                      {new Date(task.displayInfo.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-default-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="light"
                  color="danger"
                  isIconOnly
                  onPress={() => handleDeleteSingle(task.id)}
                  isDisabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
