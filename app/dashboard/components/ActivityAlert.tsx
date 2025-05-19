'use client';

import { Alert, Button, Link } from '@heroui/react';
import { ArrowRightIcon, PartyPopperIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';

export function ActivityAlert() {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex flex-col gap-2">
      <Alert
        as={Link}
        href="/activity"
        target="_blank"
        variant="flat"
        color="primary"
        icon={<PartyPopperIcon className="size-5" />}
        endContent={
          <Button
            variant="flat"
            color="primary"
            as={Link}
            href="/activity"
            target="_blank">
            <ArrowRightIcon />
          </Button>
        }
        className="group cursor-pointer transition-all hover:scale-[1.01]">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('activity.title')}</span>
          <span className="text-sm">{t('activity.description')}</span>
        </div>
      </Alert>

      <Alert
        variant="flat"
        color="secondary"
        icon={<PartyPopperIcon className="size-5" />}
        endContent={
          <Button
            variant="flat"
            color="primary">
            <ArrowRightIcon />
          </Button>
        }>
        abc
      </Alert>
    </div>
  );
}
