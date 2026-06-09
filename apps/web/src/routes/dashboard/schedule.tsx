import { createFileRoute } from '@tanstack/react-router';

import { useTranslation } from '../../i18n/client';
import { routeMeta } from '../../lib/seo';
import SchedulePageClient from './schedule/-components/SchedulePageClient';

export const Route = createFileRoute('/dashboard/schedule')({
  head: () => ({
    meta: routeMeta({
      title: 'Schedule | MultiPost',
      description: 'Scheduled publish tasks for MultiPost',
      robots: 'noindex, nofollow',
    }),
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { t } = useTranslation('schedule');

  return (
    <SchedulePageClient
      title={t('title')}
      description={t('description')}
      createScheduleLabel={t('actions.createSchedule')}
    />
  );
}
