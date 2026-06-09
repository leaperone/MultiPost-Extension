import { Button } from '@heroui/react';
import { MegaphoneIcon } from 'lucide-react';

interface CommunityReportTriggerProps {
  label: string;
}

export default function CommunityReportTrigger({ label }: CommunityReportTriggerProps) {
  return (
    <Button
      as="a"
      color="primary"
      href="https://github.com/leaperone/MultiPost-Extension/issues/new/choose"
      target="_blank"
      rel="noopener noreferrer"
      startContent={<MegaphoneIcon className="size-4" />}>
      {label}
    </Button>
  );
}
