import { Accordion, AccordionItem } from '@heroui/accordion';
import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '../../i18n/client';
import { routeMeta } from '../../lib/seo';

export const Route = createFileRoute('/_default/on-task')({
  validateSearch: (search) => ({
    taskId: typeof search.taskId === 'string' ? search.taskId : undefined,
  }),
  head: () => ({
    meta: routeMeta({
      title: 'Extension Task - MultiPost',
      description: 'View a MultiPost browser extension task handoff.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: OnTaskPage,
});

function OnTaskPage() {
  const { t } = useTranslation('on-task');
  const { taskId } = Route.useSearch();

  if (!taskId) {
    return (
      <div className="p-4 pt-16">
        <Card className="mx-auto w-full max-w-3xl border-red-200">
          <CardHeader>
            <CardTitle className="text-red-500">{t('error.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{t('error.task_id_required')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pt-16">
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{t('task_details.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">{t('task_details.fields.task_id')}</h3>
              <p className="text-sm text-gray-500">{taskId}</p>
            </div>
            <Accordion>
              <AccordionItem title={t('task_details.fields.task_data')}>
                <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
                  {JSON.stringify(
                    {
                      taskId,
                      status: 'deferred',
                      note:
                        'Task claim/fetch/publish is deferred until extension API and server functions are migrated.',
                    },
                    null,
                    2,
                  )}
                </pre>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
