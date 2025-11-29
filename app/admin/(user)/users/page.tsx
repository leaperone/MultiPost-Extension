'use server';

import UserTable from './components/UserTable';
import { Chip } from '@heroui/react';
import { getUsers } from './actions';
import { UserSearchModal } from './components/UserSearcInput';
import { createTranslation } from '@/i18n/server';

async function AdminUserPage() {
  const { t } = await createTranslation('admin');
  const resp = await getUsers();
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

export default AdminUserPage;
