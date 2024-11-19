import { injectScriptsToTabs, type SyncData } from '~sync/common';
import { getDefaultPlatformInfo } from '~sync/common';

// Tab Manager || 标签页管理 || START
export interface TabManagerMessage {
  syncData: SyncData;
  tabs: {
    tab: chrome.tabs.Tab;
    platform: string;
  }[];
}

const tabsManagerMessages: TabManagerMessage[] = [];

const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  tabsManagerMessages.forEach((group, index) => {
    const updatedTabs = group.tabs.map((item) => (item.tab.id === tabId ? { ...item, tab } : item));
    tabsManagerMessages[index] = { ...group, tabs: updatedTabs };
  });
};

const handleTabRemoved = (tabId: number) => {
  tabsManagerMessages.forEach((group, index) => {
    const filteredTabs = group.tabs.filter((item) => item.tab.id !== tabId);
    tabsManagerMessages[index] = { ...group, tabs: filteredTabs };
  });
};

export const getTabsManagerMessages = () => {
  return tabsManagerMessages;
};

export const addTabsManagerMessages = (data: TabManagerMessage) => {
  tabsManagerMessages.push(data);
};

export const tabsManagerHandleTabUpdated = handleTabUpdated;
export const tabsManagerHandleTabRemoved = handleTabRemoved;

export const tabsManagerMessageHandler = (request, sender, sendResponse) => {
  if (request.type === 'MUTLIPOST_EXTENSION_REQUEST_PUBLISH_RELOAD') {
    const { tabId, tabGroup } = request.data;
    const tabInfo = tabGroup.tabs.find((t) => t.tab.id === tabId);

    if (tabInfo) {
      const platformInfo = getDefaultPlatformInfo(tabInfo.platform);

      if (platformInfo) {
        chrome.tabs.update(tabId, { url: platformInfo.injectUrl, active: true }).then(() => {
          injectScriptsToTabs([[tabInfo.tab, tabInfo.platform]], tabGroup.syncData);
        });
      } else {
        console.error(`无法获取平台 ${tabInfo.platform} 的信息`);
        sendResponse('error');
        return;
      }
    } else {
      console.error(`未找到标签页 ID ${tabId} 的信息`);
      sendResponse('error');
      return;
    }

    sendResponse('success');
  }
  if (request.type === 'MUTLIPOST_EXTENSION_TABS_MANAGER_REQUEST_TABS') {
    sendResponse(getTabsManagerMessages());
  }
  if (request.type === 'MUTLIPOST_EXTENSION_TABS_MANAGER_REQUEST_ADD_TABS') {
    const { data, tabs } = request;
    addTabsManagerMessages({
      syncData: data,
      tabs: tabs.map((t: [chrome.tabs.Tab, string]) => ({
        tab: t[0],
        platform: t[1],
      })),
    });
    sendResponse('success');
  }
};

// Tab Manager || 标签页管理 || END
