/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

import {
  addTabsManagerMessages,
  tabsManagerHandleTabRemoved,
  tabsManagerHandleTabUpdated,
  tabsManagerMessageHandler,
} from './services/tabs';
import QuantumEntanglementKeepAlive from '../utils/keep-alive';
import {
  createTabsForPlatforms,
  getPlatformInfos,
  injectScriptsToTabs,
  type SyncData,
  type SyncDataPlatform,
} from '~sync/common';
import { trustDomainMessageHandler } from './services/trust-domain';
import { Storage } from '@plasmohq/storage';
import { getAllAccountInfo } from '~sync/account';
import { linkExtensionMessageHandler, starter } from './services/api';

const storage = new Storage({
  area: 'local',
});

async function initDefaultTrustedDomains() {
  const trustedDomains = await storage.get<Array<{ id: string; domain: string }>>('trustedDomains');
  if (!trustedDomains) {
    await storage.set('trustedDomains', [
      {
        id: crypto.randomUUID(),
        domain: 'multipost.app',
      },
    ]);
  }
}

chrome.runtime.onInstalled.addListener((object) => {
  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: 'https://multipost.app/on-install' });
  }
  initDefaultTrustedDomains();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

// Listen Message || 监听消息 || START
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  defaultMessageHandler(request, sender, sendResponse);
  tabsManagerMessageHandler(request, sender, sendResponse);
  trustDomainMessageHandler(request, sender, sendResponse);
  linkExtensionMessageHandler(request, sender, sendResponse);
  return true;
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  tabsManagerHandleTabUpdated(tabId, changeInfo, tab);
});
chrome.tabs.onRemoved.addListener((tabId) => {
  tabsManagerHandleTabRemoved(tabId);
});
// Listen Message || 监听消息 || END

// Message Handler || 消息处理器 || START
const defaultMessageHandler = (request, sender, sendResponse) => {
  if (request.action === 'MUTLIPOST_EXTENSION_CHECK_SERVICE_STATUS') {
    sendResponse({ extensionId: chrome.runtime.id });
  }
  if (request.action === 'MUTLIPOST_EXTENSION_PUBLISH') {
    const data = request.data as SyncData;
    if (Array.isArray(data.platforms) && data.platforms.length > 0) {
      createTabsForPlatforms(data)
        .then(async (tabs) => {
          injectScriptsToTabs(tabs, data);

          addTabsManagerMessages({
            syncData: data,
            tabs: tabs.map((t: { tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }) => ({
              tab: t.tab,
              platformInfo: t.platformInfo,
            })),
          });

          for (const t of tabs) {
            if (t.tab.id) {
              await chrome.tabs.update(t.tab.id, { active: true });
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
  }
  if (request.action === 'MUTLIPOST_EXTENSION_PLATFORMS') {
    getPlatformInfos().then((platforms) => {
      sendResponse({ platforms });
    });
  }
  if (request.action === 'MUTLIPOST_EXTENSION_GET_ACCOUNT_INFOS') {
    getAllAccountInfo().then((accountInfo) => {
      sendResponse({ accountInfo });
    });
  }
  if (request.action === 'MUTLIPOST_EXTENSION_OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ extensionId: chrome.runtime.id });
  }
};
starter(1000 * 30);
// Message Handler || 消息处理器 || END

// Keep Alive || 保活机制 || START
const quantumKeepAlive = new QuantumEntanglementKeepAlive();
quantumKeepAlive.startEntanglementProcess();
// Keep Alive || 保活机制 || END
