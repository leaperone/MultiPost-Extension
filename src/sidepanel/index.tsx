import '~style.css';
import { HeroUIProvider } from '@heroui/react';
import { Tabs, Tab } from '@heroui/react';
import cssText from 'data-text:~style.css';
import React, { useEffect, useState } from 'react';
import TabsManager from '~components/Sidepanel/Tabs/TabsManager';
import { LayoutDashboardIcon } from 'lucide-react';

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
  const [selectedKey, setSelectedKey] = useState('tabs');
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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'MUTLIPOST_EXTENSION_REQUEST_CHANGE_SIDEPANEL_TAB') {
        setSelectedKey(message.tab);
        sendResponse({ success: true });
      }
      return true;
    });
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <HeroUIProvider>
      <div className="p-4 mx-auto min-h-screen">
        <Tabs
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
          aria-label={chrome.i18n.getMessage('sidepanelTabsAriaLabel')}
          classNames={{
            tabList: 'flex justify-center w-full',
            tab: 'text-lg py-2 text-center justify-center',
            base: 'w-full',
          }}>
          <Tab
            key="tabs"
            title={
              <div className="flex gap-2 items-center">
                <LayoutDashboardIcon />
                <span>{chrome.i18n.getMessage('sidepanelTabsManager')}</span>
              </div>
            }>
            <TabsManager />
          </Tab>
        </Tabs>
      </div>
    </HeroUIProvider>
  );
}

export default SidePanel;
