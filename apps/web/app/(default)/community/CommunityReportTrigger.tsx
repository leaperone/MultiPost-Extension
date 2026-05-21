'use client';

import { useState } from 'react';
import { Button } from '@heroui/react';
import { MegaphoneIcon } from 'lucide-react';

import PublishErrorReportDialog from '@/components/feedback/PublishErrorReportDialog';
import { FEEDBACK_SOURCES } from '@/actions/feedback/types';

interface CommunityReportTriggerProps {
  label: string;
}

export default function CommunityReportTrigger({ label }: CommunityReportTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        color="primary"
        startContent={<MegaphoneIcon className="size-4" />}
        onPress={() => setIsOpen(true)}>
        {label}
      </Button>
      <PublishErrorReportDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        context={{ source: FEEDBACK_SOURCES.COMMUNITY_PAGE }}
      />
    </>
  );
}
