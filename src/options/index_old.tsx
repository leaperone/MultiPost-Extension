// You can rename this file to index.tsx to use this file as the entry point
// Then you can develop the extension option page as UI

import '~style.css';
import React, { useState } from 'react';
import { HeroUIProvider } from '@heroui/react';
import {
  Tabs,
  Tab,
  Spacer,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { ExternalLink } from 'lucide-react';
import cssText from 'data-text:~style.css';
import Header from '~/components/Header';
import DynamicTab from '~/components/Sync/DynamicTab';
import VideoTab from '~/components/Sync/VideoTab';
import AboutTab from '~/components/Sync/AboutTab';
import { type SyncData, createTabsForPlatforms, injectScriptsToTabs } from '~sync/common';
import SettingsTab from '~components/Sync/SettingsTab';
import ArticleTab from '~components/Sync/ArticleTab';
import { refreshAllAccountInfo } from '~sync/account';

/**
 * Get the shadow container element for styling
 * @returns {Element} The shadow container element
 */
export function getShadowContainer() {
  return document.querySelector('#test-shadow').shadowRoot.querySelector('#plasmo-shadow-container');
}

/**
 * Get the shadow host ID
 * @returns {string} The shadow host ID
 */
export const getShadowHostId = () => 'test-shadow';

/**
 * Get the style element with injected CSS
 * @returns {HTMLStyleElement} The style element
 */
export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

/**
 * Options component for the extension settings page
 * @description Main component that handles the extension's options/settings interface
 * Manages tabs for different functionalities like dynamic posts, videos, articles, etc.
 */
const Options = () => {
  const [isReady, setIsReady] = useState(false);
  const [hashParams, setHashParams] = useState<Record<string, string>>({});
  const [isWebAppModalOpen, setIsWebAppModalOpen] = useState(true);

  /**
   * Initialize the options page
   * Sets the page title and processes URL hash parameters
   */
  React.useEffect(() => {
    document.title = chrome.i18n.getMessage('extensionDisplayName');

    const hash = window.location.hash.slice(1);

    // Parse hash parameters from URL
    const params = {};
    hash.split('&').forEach((param) => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
    setHashParams(params);
    setIsReady(true);

    refreshAllAccountInfo();
  }, []);

  /**
   * Handle content publishing across multiple platforms
   * @param {SyncData} data - The data to be published including content and target platforms
   */
  const funcPublish = async (data: SyncData) => {
    console.log('funcPublish', data);
    if (Array.isArray(data.platforms) && data.platforms.length > 0) {
      createTabsForPlatforms(data)
        .then(async (tabs) => {
          injectScriptsToTabs(tabs, data);

          // Notify tabs manager about new tabs
          chrome.runtime.sendMessage({
            type: 'MUTLIPOST_EXTENSION_TABS_MANAGER_REQUEST_ADD_TABS',
            data: data,
            tabs: tabs,
          });

          // Activate tabs sequentially with delay
          for (const [tab] of tabs) {
            if (tab.id) {
              await chrome.tabs.update(tab.id, { active: true });
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        })
        .catch((error) => {
          console.error('Error creating tabs or groups:', error);
        });
    } else {
      console.error('No valid platforms specified');
    }
  };

  /**
   * Scrape content from a given URL
   * @param {string} url - The URL to scrape content from
   * @returns {Promise<any>} The scraped content
   * @throws {Error} When URL is invalid or scraping fails
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funcScraper = async (url: string): Promise<any> => {
    if (!url) {
      throw new Error('No valid URL provided');
    }

    return new Promise(async (resolve, reject) => {
      try {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const newTab = await chrome.tabs.create({ url, active: false });

        if (!newTab.id) {
          throw new Error('Failed to create new tab');
        }

        await chrome.tabs.update(newTab.id, { active: true });

        // Listen for tab load completion to start scraping
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
        console.error('Scraper operation error:', error);
        reject(new Error('Scraper operation failed'));
      }
    });
  };

  if (!isReady) {
    return null;
  }
  return (
    <HeroUIProvider>
      <Header />
      <main className="p-4 mx-auto w-full max-w-3xl md:max-w-screen-xl sm:max-w-7xl">
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
            key="article"
            title={chrome.i18n.getMessage('gArticle')}
            className="w-full">
            <ArticleTab
              funcPublish={funcPublish}
              funcScraper={funcScraper}
            />
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
      <footer className="text-sm text-center">
        <p className="mb-4 text-gray-600">{chrome.i18n.getMessage('optionsContactPrefix')}</p>
        <p className="flex gap-4 justify-center items-center">
          <Button
            as="a"
            href="https://github.com/leaper-one/Multipost-Extension/issues"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            isIconOnly
            className="text-white bg-[#24292F] hover:bg-[#24292F]/90">
            <Icon
              icon="mdi:github"
              className="size-5"
            />
          </Button>

          <Button
            as="a"
            href="mailto:support@leaper.one"
            size="sm"
            startContent={
              <Icon
                icon="material-symbols:mail"
                className="size-5"
              />
            }>
            support@leaper.one
          </Button>

          <Button
            as="a"
            href="https://mc1cz6k4he.feishu.cn/share/base/form/shrcnGyzsczESObZ72JhLanY8Xg"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            startContent={
              <Icon
                icon="material-symbols:feedback"
                className="size-5"
              />
            }>
            {chrome.i18n.getMessage('optionsFeedback') || 'Feedback'}
          </Button>

          <Popover placement="top">
            <PopoverTrigger>
              <Button
                size="sm"
                isIconOnly>
                <Icon
                  icon="icon-park:tencent-qq"
                  className="size-5"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="gap-2 px-4 py-3">
                <div className="text-sm font-medium">{chrome.i18n.getMessage('optionsQQGroupTitle')}</div>
                <div className="flex gap-4 items-center">
                  <Button
                    size="sm"
                    variant="light"
                    as="a"
                    href="http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-2 items-center">
                    921137242
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    onPress={() => navigator.clipboard.writeText('921137242')}>
                    <Icon
                      icon="material-symbols:content-copy"
                      className="size-4"
                    />
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </p>
      </footer>

      {/* 网页版跳转模态框 */}
      <Modal
        isOpen={isWebAppModalOpen}
        onOpenChange={setIsWebAppModalOpen}
        size="md"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>{chrome.i18n.getMessage('webAppModalTitle')}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{chrome.i18n.getMessage('webAppModalDescription')}</p>
              <div className="flex justify-center items-center">
                <img
                  src={chrome.runtime.getURL('assets/icon.png')}
                  alt="MultiPost"
                  className="w-24 h-24 rounded-xl shadow-md"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsWebAppModalOpen(false)}>
              {chrome.i18n.getMessage('webAppModalLater')}
            </Button>
            <Button
              variant="solid"
              color="primary"
              as="a"
              href="https://multipost.app/dashboard/publish"
              target="_blank"
              rel="noopener noreferrer"
              startContent={<ExternalLink className="size-4" />}
              onPress={() => setIsWebAppModalOpen(false)}>
              {chrome.i18n.getMessage('webAppModalGo')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </HeroUIProvider>
  );
};

export default Options;
