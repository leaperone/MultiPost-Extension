import { injectScriptsToTabs, type SyncData, type SyncDataPlatform } from '~sync/common';

// Tab Manager || 标签页管理 || START
export interface TabManagerMessage {
  syncData: SyncData;
  tabs: {
    tab: chrome.tabs.Tab;
    platformInfo: SyncDataPlatform;
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
  if (request.type === 'MULTIPOST_EXTENSION_REQUEST_PUBLISH_RELOAD') {
    const { tabId } = request.data;
    const info = tabsManagerMessages.find((group) => group.tabs.some((t) => t.tab.id === tabId));
    const tabInfo = info?.tabs.find((t) => t.tab.id === tabId);

    if (tabInfo) {
      chrome.tabs.update(tabId, { url: tabInfo.platformInfo.injectUrl, active: true }).then(() => {
        injectScriptsToTabs([{ tab: tabInfo.tab, platformInfo: tabInfo.platformInfo }], info.syncData);
      });
    } else {
      console.error(`未找到标签页 ID ${tabId} 的信息`);
      sendResponse('error');
      return;
    }

    sendResponse('success');
  }
  if (request.type === 'MULTIPOST_EXTENSION_TABS_MANAGER_REQUEST_TABS') {
    sendResponse(getTabsManagerMessages());
  }
  if (request.type === 'MULTIPOST_EXTENSION_TABS_MANAGER_REQUEST_ADD_TABS') {
    const { data, tabs } = request;
    addTabsManagerMessages({
      syncData: data,
      tabs: tabs.map((t: { tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }) => ({
        tab: t.tab,
        platformInfo: t.platformInfo,
      })),
    });
    sendResponse('success');
  }
};

// Tab Manager || 标签页管理 || END
