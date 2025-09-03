'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Pagination,
  Selection,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@heroui/react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteTask, deleteBatchTasks } from './actions';

interface Task {
  id: string;
  status: string;
  taskType: string;
  createdAt: Date;
  updatedAt: Date;
  displayInfo: {
    title: string;
    timestamp?: number;
  };
}

interface TasksTableProps {
  tasks: Task[];
}

export default function TasksTable({ tasks }: TasksTableProps) {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

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
    let selectedIds: string[];

    if (selectedKeys === 'all') {
      // 当全选时，获取所有任务的 ID
      selectedIds = tasks.map((task) => task.id);
    } else {
      selectedIds = Array.from(selectedKeys as Set<string>);
    }

    if (selectedIds.length === 0) return;

    setIsDeletePopoverOpen(false);
    setIsBatchDeleting(true);
    try {
      await deleteBatchTasks(selectedIds);
      setSelectedKeys(new Set([]));
    } catch (error) {
      console.error('Failed to delete tasks:', error);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleDeleteSingle = (taskId: string) => {
    startTransition(async () => {
      try {
        await deleteTask(taskId);
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
                    <div className="text-sm">{new Date(task.displayInfo.timestamp).toLocaleDateString()}</div>
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
