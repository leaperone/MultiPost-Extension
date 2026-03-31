import React from 'react';
import DynamicWebhook from './Modals/DynamicWebhook';
import DynamicOkjike from './Modals/DynamicOkjike';
import DynamicZsxq from './Modals/DynamicZSXQ';
import ArticleWordpress from './Modals/ArticleWordpress';
import { PlatformInfo } from '@/lib/extension';

interface ExtraInfoConfigProps {
  platformInfo: PlatformInfo;
  onExtraConfigChange: (platformKey: string, extraConfig: unknown) => void;
}

export default function ExtraInfoConfig({ platformInfo, onExtraConfigChange }: ExtraInfoConfigProps) {
  if (platformInfo.name === 'DYNAMIC_WEBHOOK') {
    return (
      <DynamicWebhook
        platformInfo={platformInfo}
        onExtraConfigChange={onExtraConfigChange}
      />
    );
  } else if (platformInfo.name === 'DYNAMIC_OKJIKE') {
    return (
      <DynamicOkjike
        platformInfo={platformInfo}
        onExtraConfigChange={onExtraConfigChange}
      />
    );
  } else if (platformInfo.name === 'DYNAMIC_ZSXQ') {
    return (
      <DynamicZsxq
        platformInfo={platformInfo}
        onExtraConfigChange={onExtraConfigChange}
      />
    );
  } else if (platformInfo.name === 'ARTICLE_WORDPRESS') {
    return (
      <ArticleWordpress
        platformInfo={platformInfo}
        onExtraConfigChange={onExtraConfigChange}
      />
    );
  } else {
    return null;
  }
}
