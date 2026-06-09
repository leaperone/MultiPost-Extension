import { Chip } from '@heroui/react';
import { createFileRoute } from '@tanstack/react-router';

import { getCreditUsages, getCreditUsageStats } from '../../actions/admin/usage';
import { useTranslation } from '../../i18n/client';
import { CreditUsageStats } from './usage/-components/CreditUsageStats';
import CreditUsageTable from './usage/-components/CreditUsageTable';

export const Route = createFileRoute('/admin/usage')({
  loader: async () => {
    const [usageResp, statsResp] = await Promise.all([
      getCreditUsages({ data: {} }),
      getCreditUsageStats({ data: {} }),
    ]);
    return { usageResp, statsResp };
  },
  component: AdminUsagePage,
});

function AdminUsagePage() {
  const { t } = useTranslation('admin');
  const { usageResp, statsResp } = Route.useLoaderData();

  if (usageResp.code !== 0) {
    return <div>{usageResp.msg}</div>;
  }

  if (statsResp.code !== 0) {
    return <div>{statsResp.msg}</div>;
  }

  const count = usageResp.data.count;
  const stats = statsResp.data;

  return (
    <div className="flex size-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{t('usage.title')}</h1>
          <Chip color="primary">{count}</Chip>
        </div>
      </div>

      <CreditUsageStats
        totalUsage={stats.totalUsage}
        freeUsage={stats.freeUsage}
        paidUsage={stats.paidUsage}
        uniqueUsers={stats.uniqueUsers}
      />

      <CreditUsageTable />
    </div>
  );
}
