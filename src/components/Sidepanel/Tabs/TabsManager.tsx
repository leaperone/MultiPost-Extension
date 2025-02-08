import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { X, RefreshCw } from 'lucide-react';
import type { TabManagerMessage } from '~background/services/tabs';

function TabsManager() {
  const [tabGroup, setTabGroup] = useState<TabManagerMessage[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'MUTLIPOST_EXTENSION_TABS_MANAGER_REQUEST_TABS' }).then((data) => {
        setTabGroup(data);
      });
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleCloseTab = (tabId: number) => {
    chrome.tabs.remove(tabId, () => {
      setTabGroup((prevGroup) => {
        const updatedGroup = prevGroup.map((group) => ({
          ...group,
          tabs: group.tabs.filter((item) => item.tab.id !== tabId),
        }));
        // 过滤掉没有标签的组
        return updatedGroup.filter((group) => group.tabs.length > 0);
      });
    });
  };

  const handleSwitchTab = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
  };

  const handleTabClick = (tabId: number) => {
    handleSwitchTab(tabId);
  };

  const handleTabMiddleClick = (e: React.MouseEvent<HTMLButtonElement>, tabId: number) => {
    if (e.button === 1) {
      e.preventDefault();
      handleCloseTab(tabId);
    }
  };

  const handleReloadTab = (tabGroup: TabManagerMessage, tabId: number) => {
    chrome.runtime.sendMessage({ type: 'MUTLIPOST_EXTENSION_REQUEST_PUBLISH_RELOAD', data: { tabId, tabGroup } });
  };

  // 过滤掉没有标签的组
  const nonEmptyGroups = tabGroup.filter((group) => group.tabs.length > 0);

  return (
    <div className="p-4">
      {nonEmptyGroups.length > 0 ? (
        nonEmptyGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className="mb-6">
            <h3 className="mb-2 text-lg font-semibold">
              {group.syncData.data.title || chrome.i18n.getMessage('sidepanelUntitledGroup', `${groupIndex + 1}`)}
            </h3>
            <ul className="space-y-2">
              {group.tabs.map((tabItem) => (
                <li
                  key={tabItem.tab.id}
                  className="flex relative items-center">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="mr-2"
                    onPress={() => handleReloadTab(group, tabItem.tab.id)}
                    aria-label={chrome.i18n.getMessage('sidepanelReloadTab')}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    className="justify-start pr-10 pl-2 text-left grow"
                    onPress={() => handleTabClick(tabItem.tab.id)}
                    onMouseDown={(e) => handleTabMiddleClick(e, tabItem.tab.id)}>
                    {tabItem.tab.favIconUrl && (
                      <img
                        src={tabItem.tab.favIconUrl}
                        alt=""
                        className="mr-2 w-4 h-4 shrink-0"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    <span className="truncate">{tabItem.tab.title}</span>
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="light"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onPress={() => handleCloseTab(tabItem.tab.id)}
                    aria-label={chrome.i18n.getMessage('sidepanelCloseTab')}>
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <div className="py-8 text-center">
          <p className="mb-4 text-lg">{chrome.i18n.getMessage('sidepanelNoTabsMessage')}</p>
          <Button
            color="primary"
            onPress={() => chrome.runtime.openOptionsPage()}>
            {chrome.i18n.getMessage('sidepanelCreateNewTabButton')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default TabsManager;
