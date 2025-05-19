'use server';

import UserTable from './components/UserTable';
import { Chip } from '@heroui/react';
import { getUsers } from './actions';
import { UserSearchModal } from './components/UserSearcInput';

async function AdminUserPage() {
  const resp = await getUsers();
  if (resp.code !== 0) {
    return <div>{resp.msg}</div>;
  }
  const count = resp.data.count;
  return (
    <div className="flex size-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">用户管理</h1>
          <Chip>{count}</Chip>
        </div>
        <UserSearchModal />
      </div>
      <UserTable />
    </div>
  );
}

export default AdminUserPage;
