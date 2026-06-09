import { Card } from '@heroui/react';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

import { useTranslation } from '../../../../i18n/client';
import CreditUsageTable from './CreditUsageTable';
import RechargeCard from './RechargeCard';

const StripeElementsProvider = lazy(() => import('./StripeElementsProvider'));

function ClientMountedStripeElements({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <StripeElementsProvider>{children}</StripeElementsProvider>
    </Suspense>
  );
}

export default function RechargePageClient() {
  const { t } = useTranslation('settings');

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('credit_usage.page.title')}
            </h1>
            <p className="mt-2 text-muted-foreground">{t('credit_usage.page.description')}</p>
          </div>
        </div>

        <div className="mb-8">
          <ClientMountedStripeElements>
            <RechargeCard />
          </ClientMountedStripeElements>
        </div>

        <Card className="overflow-hidden border p-0 shadow-none">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold text-foreground/90">
              {t('credit_usage.usage_history.title')}
            </h2>
          </div>
          <CreditUsageTable />
        </Card>
      </div>
    </div>
  );
}
