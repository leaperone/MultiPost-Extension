import '~style.css';
import React, { useState } from 'react';
import { HeroUIProvider } from '@heroui/react';
import { Tabs, Tab, Spacer } from '@heroui/react';
import cssText from 'data-text:~style.css';
import Header from '~/components/Header';
import DynamicTab from '~/components/Sync/DynamicTab';
import VideoTab from '~/components/Sync/VideoTab';
import AboutTab from '~/components/Sync/AboutTab';
import { type SyncData, createTabsForPlatforms, injectScriptsToTabs } from '~sync/common';
import SettingsTab from '~components/Sync/SettingsTab';

export function getShadowContainer() {
  return document.querySelector('#test-shadow').shadowRoot.querySelector('#plasmo-shadow-container');
}

export const getShadowHostId = () => 'test-shadow';

export const getStyle = () => {
  const style = document.createElement('style');

  style.textContent = cssText;
  return style;
};

const Options = () => {
  const [isReady, setIsReady] = useState(false);
  const [hashParams, setHashParams] = useState<Record<string, string>>({});

  React.useEffect(() => {
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
    setHashParams(params);
    setIsReady(true);
  }, []);

  const funcPublish = async (data: SyncData) => {
    console.log('funcPublish', data);
    if (Array.isArray(data.platforms) && data.platforms.length > 0) {
      createTabsForPlatforms(data)
        .then(async (tabs) => {
          injectScriptsToTabs(tabs, data);

          chrome.runtime.sendMessage({
            type: 'MUTLIPOST_EXTENSION_TABS_MANAGER_REQUEST_ADD_TABS',
            data: data,
            tabs: tabs,
          });

          for (const [tab] of tabs) {
            if (tab.id) {
              await chrome.tabs.update(tab.id, { active: true });
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        })
        .catch((error) => {
          console.error('创建标签页或分组时出错:', error);
        });
    } else {
      console.error('没有指定有效的平台');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const funcScraper = async (url: string): Promise<any> => {
    if (!url) {
      throw new Error('未提供有效的URL');
    }

    return new Promise(async (resolve, reject) => {
      try {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const newTab = await chrome.tabs.create({ url, active: false });

        if (!newTab.id) {
          throw new Error('新标签页创建失败');
        }

        await chrome.tabs.update(newTab.id, { active: true });

        const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
          if (tabId === newTab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs
              .sendMessage(newTab.id!, { type: 'MUTLIPOST_EXTENSION_REQUEST_SCRAPER_START' })
              .then(async (scraperResult) => {
                if (currentTab?.id) {
                  await chrome.tabs.update(currentTab.id, { active: true });
                  await chrome.tabs.remove(newTab.id);
                }
                resolve(scraperResult);
              })
              .catch(reject);
          }
        };

        chrome.tabs.onUpdated.addListener(listener);
      } catch (error) {
        console.error('爬虫操作出错:', error);
        reject(new Error('爬虫操作失败'));
      }
    });
  };

  if (!isReady) {
    return null;
  }
  return (
    <HeroUIProvider>
      <Header />
      <main className="mx-auto max-w-3xl w-full p-4">
        <Tabs
          aria-label="sync publish"
          defaultSelectedKey={hashParams.tab || 'dynamic'}
          isVertical
          variant="light"
          size="lg"
          color="primary"
          className="h-full">
          <Tab
            key="dynamic"
            title={chrome.i18n.getMessage('gDynamic')}
            className="w-full">
            <DynamicTab funcPublish={funcPublish} />
          </Tab>
          <Tab
            key="video"
            title={chrome.i18n.getMessage('gVideo')}
            className="w-full">
            <VideoTab funcPublish={funcPublish} />
          </Tab>
          <Tab
            key="settings"
            title={chrome.i18n.getMessage('gSettings')}
            className="w-full">
            <SettingsTab />
          </Tab>
          <Tab
            key="aboutTab"
            title={chrome.i18n.getMessage('gAbout')}

            className="w-full">
            <AboutTab />
          </Tab>
        </Tabs>
      </main>
      <Spacer y={8} />
      <footer className="text-center text-sm text-foreground/60">
        <p>
          <span>{chrome.i18n.getMessage('optionsHelpPrefix')}&nbsp;</span>
          <span>{chrome.i18n.getMessage('optionsFeedbackPrefix')}</span>
        </p>
        <p>
          <span>{chrome.i18n.getMessage('optionsFeedbackEmail')}&nbsp;</span>
          <a
            href="mailto:support@leaper.one"
            className="text-primary hover:underline">
            support@leaper.one
          </a>
          <span>&nbsp;{chrome.i18n.getMessage('optionsOrText')}&nbsp;</span>
          <a
            href="https://github.com/leaper-one/Multipost-Extension/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline">
            GitHub Issues
          </a>
        </p>
      </footer>
    </HeroUIProvider>
  );
};

export default Options;
