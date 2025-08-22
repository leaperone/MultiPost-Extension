'use client';

import { Chip } from '@heroui/react';
import { useTranslation } from '@/i18n/client';

export default function StatusLegend() {
  const { t } = useTranslation('schedule');

  const statusItems = [
    { status: 'pending', label: t('statusLabels.pending'), color: 'warning' as const },
    { status: 'processing', label: t('statusLabels.processing'), color: 'primary' as const },
    { status: 'completed', label: t('statusLabels.completed'), color: 'success' as const },
    { status: 'failed', label: t('statusLabels.failed'), color: 'danger' as const },
    { status: 'cancelled', label: t('statusLabels.cancelled'), color: 'default' as const },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-foreground/70">{t('status')}：</span>
      {statusItems.map((item) => (
        <Chip
          key={item.status}
          color={item.color}
          variant="flat"
          size="sm">
          {item.label}
        </Chip>
      ))}
    </div>
  );
}
