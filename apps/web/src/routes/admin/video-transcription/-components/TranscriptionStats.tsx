import { Card, CardBody } from '@heroui/react';
import { CheckCircleIcon, FileTextIcon, LoaderIcon, UsersIcon, XCircleIcon } from 'lucide-react';

interface TranscriptionStatsProps {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  uniqueUsers: number;
}

export function TranscriptionStats({
  total,
  completed,
  processing,
  failed,
  uniqueUsers,
}: TranscriptionStatsProps) {
  const formatNumber = (num: number) => new Intl.NumberFormat('zh-CN').format(num);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FileTextIcon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">总记录数</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(total)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircleIcon className="size-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">已完成</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(completed)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-warning/10">
              <LoaderIcon className="size-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">处理中</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(processing)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-danger/10">
              <XCircleIcon className="size-5 text-danger" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">失败</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(failed)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10">
              <UsersIcon className="size-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">活跃用户</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(uniqueUsers)}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
