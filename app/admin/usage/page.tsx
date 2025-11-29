'use server';

import { Chip } from '@heroui/react';
import { getCreditUsages, getCreditUsageStats } from './actions';
import { CreditUsageStats } from './components/CreditUsageStats';
import CreditUsageTable from './components/CreditUsageTable';
import { createTranslation } from '@/i18n/server';

async function AdminUsagePage() {
  const { t } = await createTranslation('admin');
  const [usageResp, statsResp] = await Promise.all([getCreditUsages(), getCreditUsageStats()]);

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

export default AdminUsagePage;
