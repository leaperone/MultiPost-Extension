import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createTranslation } from '@/i18n/server';
import SchedulePageClient from './components/SchedulePageClient';

export default async function SchedulePage() {
  const session = await auth();
  const { t } = await createTranslation('schedule');

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  return (
    <SchedulePageClient
      title={t('title')}
      description={t('description')}
      createScheduleLabel={t('actions.createSchedule')}
    />
  );
}
