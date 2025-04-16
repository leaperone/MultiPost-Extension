import { Alert, Button, Card, CardBody } from '@heroui/react';
import { ExternalLinkIcon } from 'lucide-react';
import { auth } from '@/auth';
import { getCredit } from '@/actions/credit';

import RechargeForm from './components/RechargeForm';

export default async function RechargePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const balance = await getCredit(session.user.id);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-background to-background/80">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-6xl space-y-6 px-4 py-12">
          {/* 当前余额 */}
          <Card className="border-2 border-transparent bg-content1/50">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">当前余额</h3>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-default-600">付费余额</p>
                      <p className="text-xl font-bold text-primary">${balance.credits.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-default-600">免费余额</p>
                      <p className="text-xl font-bold text-success">${balance.freeCredits.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-default-600">总余额</p>
                      <p className="text-xl font-bold">${balance.totalCredits.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 充值说明 */}
          <div className="space-y-3">
            <Alert
              color="primary"
              endContent={
                <Button
                  variant="flat"
                  color="primary"
                  size="sm"
                  as="a"
                  href="https://docs.multipost.app/docs/user-guide/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  endContent={<ExternalLinkIcon className="size-4" />}>
                  查看详情
                </Button>
              }>
              充值汇率：1 USD = 7.3 CNY
            </Alert>

            <Alert color="warning">目前仅支持支付宝充值，充值后立即到账</Alert>
          </div>

          <RechargeForm />
        </div>
      </div>
    </div>
  );
}
