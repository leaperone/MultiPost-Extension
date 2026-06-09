import { Chip } from '@heroui/react';
import { createFileRoute } from '@tanstack/react-router';

import { getUsers } from '../../actions/admin/users';
import { useTranslation } from '../../i18n/client';
import { UserSearchModal } from './users/-components/UserSearchInput';
import UserTable from './users/-components/UserTable';

export const Route = createFileRoute('/admin/users')({
  loader: () => getUsers({ data: {} }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const resp = Route.useLoaderData();

  if (resp.code !== 0) {
    return <div>{resp.msg}</div>;
  }

  const count = resp.data.count;

  return (
    <div className="flex size-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{t('users.title')}</h1>
          <Chip>{count}</Chip>
        </div>
        <UserSearchModal />
      </div>
      <UserTable />
    </div>
  );
}
