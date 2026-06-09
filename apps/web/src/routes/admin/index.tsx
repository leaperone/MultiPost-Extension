import { Button } from '@heroui/react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { CreditCardIcon, HeadphonesIcon, UserIcon } from 'lucide-react';

import { useTranslation } from '../../i18n/client';

export const Route = createFileRoute('/admin/')({
  component: AdminPage,
});

function AdminPage() {
  const { t } = useTranslation('admin');

  return (
    <div className="flex w-full max-w-7xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex-1" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/users"
          className="w-full">
          <Button
            className="h-24 w-full text-lg"
            startContent={<UserIcon className="size-6" />}>
            {t('sidebar.user_management')}
          </Button>
        </Link>
        <Link
          to="/admin/recharge"
          className="w-full">
          <Button
            className="h-24 w-full text-lg"
            startContent={<CreditCardIcon className="size-6" />}>
            {t('sidebar.recharge_management')}
          </Button>
        </Link>
        <Link
          to="/admin/usage"
          className="w-full">
          <Button
            className="h-24 w-full text-lg"
            startContent={<CreditCardIcon className="size-6" />}>
            {t('sidebar.credit_usage')}
          </Button>
        </Link>
        <Link
          to="/admin/activity"
          className="w-full">
          <Button className="h-24 w-full text-lg">{t('sidebar.activity_management')}</Button>
        </Link>
        <Link
          to="/admin/support"
          className="w-full">
          <Button
            className="h-24 w-full text-lg"
            startContent={<HeadphonesIcon className="size-6" />}>
            Support Tickets
          </Button>
        </Link>
      </div>
    </div>
  );
}
