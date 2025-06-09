import { Button, Card, CardBody, CardHeader, Spacer } from '@heroui/react';
import { auth } from '@/auth';
import { getCredit } from '@/actions/credit';
import RechargeCard from './components/RechargeCard';
import CreditUsageTable from './components/CreditUsageTable';
import { ExternalLinkIcon, Wallet, DollarSign, Gift } from 'lucide-react';
import { createTranslation } from '@/i18n/server';

export default async function RechargePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const balance = await getCredit(session.user.id);
  const { t } = await createTranslation('settings');

  return (
    <div className="size-full overflow-y-auto p-6">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('credit_usage.page.title')}</h1>
          <p className="mt-2 text-foreground/60">{t('credit_usage.page.description')}</p>
        </div>
        <Button
          variant="flat"
          as="a"
          href="https://docs.multipost.app/docs/user-guide/pricing"
          target="_blank"
          rel="noopener noreferrer"
          startContent={<ExternalLinkIcon className="size-4" />}
          className="border border-default-200 shadow-none">
          {t('recharge.details')}
        </Button>
      </div>

      {/* Balance Overview Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Total Balance */}
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300 lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground/60">{t('credit_usage.balance.total')}</p>
                <p className="text-3xl font-bold text-primary">${balance.totalCredits.toFixed(2)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Paid Balance */}
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-secondary/10">
                <DollarSign className="size-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-foreground/60">{t('credit_usage.balance.paid')}</p>
                <p className="text-2xl font-bold text-foreground">${balance.credits.toFixed(2)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Free Balance */}
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-success/10">
                <Gift className="size-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-foreground/60">{t('credit_usage.balance.free')}</p>
                <p className="text-2xl font-bold text-foreground">${balance.freeCredits.toFixed(2)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <RechargeCard />

      <Spacer y={4} />

      {/* Usage History */}
      <Card className="border border-default-200 shadow-none">
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">{t('credit_usage.usage_history.title')}</h2>
        </CardHeader>
        <CardBody className="p-0">
          <CreditUsageTable />
        </CardBody>
      </Card>
    </div>
  );
}
