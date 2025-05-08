import { Button, Card, CardBody, CardHeader, Divider, Spacer } from '@heroui/react';
import { auth } from '@/auth';
import { getCredit } from '@/actions/credit';
import RechargeCard from './components/RechargeCard';
import CreditUsageTable from './components/CreditUsageTable';
import { ActivityAlert } from '@/app/dashboard/components/ActivityAlert';
import { ExternalLinkIcon } from 'lucide-react';
import { createTranslation } from '@/i18n/server';

export default async function RechargePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const balance = await getCredit(session.user.id);

  const { t } = await createTranslation('settings');

  return (
    <div className="container mx-auto max-w-6xl gap-4 p-4">
      {/* 当前余额 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center">
                <p className="text-4xl font-bold text-primary">${balance.totalCredits.toFixed(2)}</p>
                <p className="text-sm text-default-500">Total Balance</p>
              </div>
              <div className="h-12 w-px bg-default-200" />
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-default-500">Paid Balance</p>
                  <p className="text-lg font-medium text-default-600/80">${balance.credits.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-default-500">Free Balance</p>
                  <p className="text-lg font-medium text-default-600/80">${balance.freeCredits.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="flat"
            as="a"
            href="https://docs.multipost.app/docs/user-guide/pricing"
            target="_blank"
            rel="noopener noreferrer"
            endContent={<ExternalLinkIcon className="size-4" />}>
            {t('recharge.details')}
          </Button>
        </CardHeader>
        <Divider />
        <CardBody>
          <RechargeCard />
        </CardBody>
      </Card>

      <Spacer y={4} />
      <ActivityAlert />
      <Spacer y={4} />

      {/* 使用记录 */}
      <CreditUsageTable />
    </div>
  );
}
