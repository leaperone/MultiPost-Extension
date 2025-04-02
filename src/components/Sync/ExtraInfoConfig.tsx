import type { PlatformInfo, SyncData } from '~sync/common';
import React, { useState } from 'react';
import { Button } from '@heroui/react';
import { Settings } from 'lucide-react';
import DynamicWebhook from './Modals/DynamicWebhook';

interface ExtraInfoConfigProps {
  platformInfo: PlatformInfo;
  syncData?: SyncData;
}

export default function ExtraInfoConfig({ platformInfo }: ExtraInfoConfigProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (platformInfo.name === 'DYNAMIC_WEBHOOK') {
    return (
      <>
        <Button
          variant="light"
          size="sm"
          onPress={() => setIsOpen(true)}
          className="flex items-center gap-1">
          <Settings className="w-4 h-4" />
          配置
        </Button>
        <DynamicWebhook
          platformKey={platformInfo.name}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
        />
      </>
    );
  } else {
    return null;
  }
}
