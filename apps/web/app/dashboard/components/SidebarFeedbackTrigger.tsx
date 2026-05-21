'use client';

import { useState } from 'react';
import { MegaphoneIcon } from 'lucide-react';

import { SidebarMenuButton } from '@/components/ui/sidebar';
import { useTranslation } from '@/i18n/client';
import PublishErrorReportDialog from '@/components/feedback/PublishErrorReportDialog';
import { FEEDBACK_SOURCES } from '@/actions/feedback/types';

interface SidebarFeedbackTriggerProps {
  label?: string;
}

export default function SidebarFeedbackTrigger({ label }: SidebarFeedbackTriggerProps) {
  const { t } = useTranslation('feedback');
  const [isOpen, setIsOpen] = useState(false);

  const text = label ?? t('entry.sidebar');

  return (
    <>
      <SidebarMenuButton tooltip={text} onClick={() => setIsOpen(true)}>
        <MegaphoneIcon />
        <span>{text}</span>
      </SidebarMenuButton>
      <PublishErrorReportDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        context={{ source: FEEDBACK_SOURCES.GLOBAL_MENU }}
      />
    </>
  );
}
