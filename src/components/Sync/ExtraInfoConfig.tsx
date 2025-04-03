import type { PlatformInfo, SyncData } from '~sync/common';
import React from 'react';
import DynamicWebhook from './Modals/DynamicWebhook';
import DynamicOkjike from './Modals/DynamicOkjike';
import DynamicZsxq from './Modals/DynamicZSXQ';

interface ExtraInfoConfigProps {
  platformInfo: PlatformInfo;
  syncData?: SyncData;
}

export default function ExtraInfoConfig({ platformInfo }: ExtraInfoConfigProps) {
  if (platformInfo.name === 'DYNAMIC_WEBHOOK') {
    return <DynamicWebhook platformKey={platformInfo.name} />;
  } else if (platformInfo.name === 'DYNAMIC_OKJIKE') {
    return <DynamicOkjike platformKey={platformInfo.name} />;
  } else if (platformInfo.name === 'DYNAMIC_ZSXQ') {
    return <DynamicZsxq platformKey={platformInfo.name} />;
  } else {
    return null;
  }
}
