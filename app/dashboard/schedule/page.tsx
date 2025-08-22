import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import ScheduleCalendar from './components/ScheduleCalendar';
import StatusLegend from './components/StatusLegend';
import { createTranslation } from '@/i18n/server';
import { Spacer } from '@heroui/react';

export default async function SchedulePage() {
  const session = await auth();
  const { t } = await createTranslation('schedule');

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <StatusLegend />
      </div>

      <Spacer y={4} />

      <ScheduleCalendar />
    </div>
  );
}
