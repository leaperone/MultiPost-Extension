import { createFileRoute } from '@tanstack/react-router';

import { getAdminPromotionTasks } from '../../actions/admin/activity';
import { ActivitiesList } from './activity/-components/ActivitiesList';
import { CreateActivityModal } from './activity/-components/CreateActivityModal';

export const Route = createFileRoute('/admin/activity')({
  loader: () => getAdminPromotionTasks({ data: {} }),
  component: AdminActivityPage,
});

function AdminActivityPage() {
  const tasks = Route.useLoaderData();

  return (
    <div className="flex w-full max-w-7xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">活动管理</h1>
        <CreateActivityModal />
      </div>
      <ActivitiesList tasks={tasks} />
    </div>
  );
}
