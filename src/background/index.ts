/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

import {
  addTabsManagerMessages,
  tabsManagerHandleTabRemoved,
  tabsManagerHandleTabUpdated,
  tabsManagerMessageHandler,
} from './services/tabs';
import QuantumEntanglementKeepAlive from '../utils/keep-alive';
import { collectionMessageHandler } from './services/collection/collection';
import { createTabsForPlatforms, getPlatformInfos, injectScriptsToTabs, type SyncData } from '~sync/common';

chrome.runtime.onInstalled.addListener((object) => {
  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: 'https://multipost.2some.one/extension' });
  }
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

// Listen Message || 监听消息 || START
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  defaultMessageHandler(request, sender, sendResponse);
  tabsManagerMessageHandler(request, sender, sendResponse);
  collectionMessageHandler(request, sender, sendResponse);
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
            tabs: tabs.map((t: [chrome.tabs.Tab, string]) => ({
              tab: t[0],
              platform: t[1],
            })),
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
  }
  if (request.action === 'MUTLIPOST_EXTENSION_PLATFORMS') {
    sendResponse({ platforms: getPlatformInfos() });
  }
  if (request.action === 'MUTLIPOST_EXTENSION_OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ extensionId: chrome.runtime.id });
  }
};
// Message Handler || 消息处理器 || END

// Keep Alive || 保活机制 || START
const quantumKeepAlive = new QuantumEntanglementKeepAlive();
quantumKeepAlive.startEntanglementProcess();
// Keep Alive || 保活机制 || END
