'use client';

import { Chip, Card } from '@heroui/react';
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
    <Card className="shadow-none border flex flex-wrap items-center gap-2 px-4 py-2">
      <span className="text-sm font-medium text-muted-foreground">{t('status')}：</span>
      {statusItems.map((item) => (
        <Chip key={item.status} color={item.color} variant="flat" size="sm">
          {item.label}
        </Chip>
      ))}
    </Card>
  );
}
