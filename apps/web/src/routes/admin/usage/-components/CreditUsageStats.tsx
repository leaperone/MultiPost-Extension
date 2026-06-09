import { Card, CardBody } from '@heroui/react';
import { CoinsIcon, GiftIcon, TrendingUpIcon, UsersIcon } from 'lucide-react';

interface CreditUsageStatsProps {
  totalUsage: number;
  freeUsage: number;
  paidUsage: number;
  uniqueUsers: number;
}

export function CreditUsageStats({
  totalUsage,
  freeUsage,
  paidUsage,
  uniqueUsers,
}: CreditUsageStatsProps) {
  const formatNumber = (num: number) => new Intl.NumberFormat('zh-CN').format(num);
  const formatAmount = (amount: number) => amount.toFixed(2);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <CoinsIcon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">总使用量</p>
              <p className="text-xl font-bold text-foreground">{formatAmount(totalUsage)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-success/10">
              <GiftIcon className="size-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">免费使用</p>
              <p className="text-xl font-bold text-foreground">{formatAmount(freeUsage)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-warning/10">
              <TrendingUpIcon className="size-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">付费使用</p>
              <p className="text-xl font-bold text-foreground">{formatAmount(paidUsage)}</p>
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
