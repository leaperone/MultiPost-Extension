import { auth } from '@/auth';
// TODO: 暂时隐藏余额功能
// import { getCredit } from '@/actions/credit';
// import RechargeCard from './components/RechargeCard';
import CreditUsageTable from './components/CreditUsageTable';
// import { ExternalLinkIcon, Wallet, DollarSign, Gift } from 'lucide-react';
import { createTranslation } from '@/i18n/server';
import { Card } from '@heroui/react';

export default async function RechargePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  // TODO: 暂时隐藏余额功能
  // const balance = await getCredit(session.user.id);
  const { t } = await createTranslation('settings');

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('credit_usage.page.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('credit_usage.page.description')}</p>
        </div>
      </div>

      {/* TODO: 暂时隐藏余额功能 */}
      {/* Balance Overview Cards */}
      {/* <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LiquidGlassStatCard
          icon={<Wallet className="size-6" />}
          iconColor="blue"
          label={t('credit_usage.balance.total')}
          value={`$${balance.totalCredits.toFixed(2)}`}
        />
        <LiquidGlassStatCard
          icon={<DollarSign className="size-6" />}
          iconColor="purple"
          label={t('credit_usage.balance.paid')}
          value={`$${balance.credits.toFixed(2)}`}
        />
        <LiquidGlassStatCard
          icon={<Gift className="size-6" />}
          iconColor="green"
          label={t('credit_usage.balance.free')}
          value={`$${balance.freeCredits.toFixed(2)}`}
        />
      </div>

      <RechargeCard /> */}

      {/* Usage History */}
      <Card className="shadow-none border overflow-hidden p-0">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-foreground/90">{t('credit_usage.usage_history.title')}</h2>
        </div>
        <CreditUsageTable />
      </Card>
    </div>
  );
}
