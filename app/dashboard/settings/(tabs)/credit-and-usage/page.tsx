import { Card, CardBody, Spacer } from '@heroui/react';
import { auth } from '@/auth';
import { getCredit } from '@/actions/credit';
import RechargeModal from './components/RechargeModal';
import CreditUsageTable from './components/CreditUsageTable';
import { ActivityAlert } from '@/app/dashboard/components/ActivityAlert';
import RechargeActivityModal from './components/RechargeActivityModal';

export default async function RechargePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const balance = await getCredit(session.user.id);

  return (
    <div className="container mx-auto max-w-6xl gap-4 p-4">
      {/* 当前余额 */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center">
                  <p className="text-4xl font-bold text-primary">${balance.totalCredits.toFixed(2)}</p>
                  <p className="text-sm text-default-500">总余额</p>
                </div>
                <div className="h-12 w-px bg-default-200" />
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-default-500">付费余额</p>
                    <p className="text-lg font-medium text-default-600">${balance.credits.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-default-500">免费余额</p>
                    <p className="text-lg font-medium text-default-600">${balance.freeCredits.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            <RechargeModal />
          </div>
        </CardBody>
      </Card>

      <Spacer y={4} />
      <ActivityAlert />
      <Spacer y={4} />

      {/* 使用记录 */}
      <CreditUsageTable />

      {/* 充值活动弹窗 */}
      <RechargeActivityModal />
    </div>
  );
}
