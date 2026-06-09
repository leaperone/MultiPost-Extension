import { useState } from 'react';
import { MegaphoneIcon } from 'lucide-react';

import { SidebarMenuButton } from '@/components/ui/sidebar';
import { useTranslation } from '../../../i18n/client';

interface SidebarFeedbackTriggerProps {
  label?: string;
}

export default function SidebarFeedbackTrigger({ label }: SidebarFeedbackTriggerProps) {
  const { t } = useTranslation('feedback');
  const [isOpen, setIsOpen] = useState(false);
  const text = label ?? t('entry.sidebar');

  return (
    <>
      <SidebarMenuButton
        tooltip={text}
        onClick={() => setIsOpen(true)}>
        <MegaphoneIcon />
        <span>{text}</span>
      </SidebarMenuButton>
      {isOpen && (
        <div className="fixed bottom-20 left-4 z-50 w-72 rounded-lg border bg-background p-4 shadow-xl">
          <div className="mb-3 text-sm font-medium">{text}</div>
          <p className="mb-4 text-xs text-muted-foreground">{t('modal.intro')}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-default-100"
              onClick={() => setIsOpen(false)}>
              {t('modal.cancel')}
            </button>
            <a
              href="/community"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">
              {t('modal.contributeLink')}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
