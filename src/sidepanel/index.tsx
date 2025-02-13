import '~style.css';
import { HeroUIProvider } from '@heroui/react';
import cssText from 'data-text:~style.css';
import React, { useEffect, useState } from 'react';
import TabsManager from '~components/Sidepanel/Tabs/TabsManager';

export function getShadowContainer() {
  return document.querySelector('#test-shadow').shadowRoot.querySelector('#plasmo-shadow-container');
}

export const getShadowHostId = () => 'test-shadow';

export const getStyle = () => {
  const style = document.createElement('style');

  style.textContent = cssText;
  return style;
};

function SidePanel() {
  const [isReady, setIsReady] = useState(false);
  const [hashParams, setHashParams] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = chrome.i18n.getMessage('extensionDisplayName');
    const hash = window.location.hash.slice(1);

    // 解析哈希参数
    const params = {};
    hash.split('&').forEach((param) => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
    console.log(hashParams);
    setHashParams(params);
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <HeroUIProvider>
      <div className="p-4 mx-auto min-h-screen">
        <TabsManager />
      </div>
    </HeroUIProvider>
  );
}

export default SidePanel;
