import { Button, Chip, Spinner } from "@heroui/react";
import { RefreshCw, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { TabManagerMessage } from "~background/services/tabs";

type LoadState = "loading" | "ready" | "error";

function TabsManager() {
  const [tabGroup, setTabGroup] = useState<TabManagerMessage[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshTabs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await chrome.runtime.sendMessage({ type: "MULTIPOST_EXTENSION_TABS_MANAGER_REQUEST_TABS" });
      setTabGroup(Array.isArray(data) ? data : []);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshTabs();
    const interval = window.setInterval(refreshTabs, 3000);
    return () => window.clearInterval(interval);
  }, [refreshTabs]);

  const handleCloseTab = (tabId: number) => {
    chrome.tabs.remove(tabId, () => {
      setTabGroup((prevGroup) =>
        prevGroup
          .map((group) => ({ ...group, tabs: group.tabs.filter((item) => item.tab.id !== tabId) }))
          .filter((group) => group.tabs.length > 0),
      );
    });
  };

  const handleTabMiddleClick = (e: React.MouseEvent<HTMLButtonElement>, tabId: number) => {
    if (e.button === 1) {
      e.preventDefault();
      handleCloseTab(tabId);
    }
  };

  const nonEmptyGroups = tabGroup.filter((group) => group.tabs.length > 0);
  const tabCount = nonEmptyGroups.reduce((count, group) => count + group.tabs.length, 0);

  return (
    <section className="mx-auto max-w-2xl p-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-default-500">MultiPost</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {chrome.i18n.getMessage("sidepanelTabsManager")}
          </h1>
          <p className="mt-1 text-sm text-default-500">
            {tabCount > 0
              ? `${tabCount} ${tabCount === 1 ? "tab" : "tabs"} in ${nonEmptyGroups.length} ${nonEmptyGroups.length === 1 ? "group" : "groups"}`
              : chrome.i18n.getMessage("sidepanelNoTabsMessage")}
          </p>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          isLoading={isRefreshing}
          onPress={refreshTabs}
          aria-label={chrome.i18n.getMessage("sidepanelReloadTab")}
          title={chrome.i18n.getMessage("sidepanelReloadTab")}>
          {!isRefreshing && <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {loadState === "loading" ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-default-200 bg-content1 px-4 py-12 text-center shadow-sm">
          <Spinner size="sm" />
          <p className="text-sm text-default-500">Loading tabs…</p>
        </div>
      ) : loadState === "error" ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-8 text-center">
          <p className="font-medium text-danger">Unable to load tabs</p>
          <Button className="mt-4" size="sm" color="danger" variant="flat" onPress={refreshTabs}>
            Try again
          </Button>
        </div>
      ) : nonEmptyGroups.length > 0 ? (
        <div className="space-y-4">
          {nonEmptyGroups.map((group, groupIndex) => (
            <div
              key={`${group.syncData.data.title}-${groupIndex}`}
              className="rounded-xl border border-default-200 bg-content1 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h2 className="truncate text-sm font-semibold">
                  {group.syncData.data.title || chrome.i18n.getMessage("sidepanelUntitledGroup", `${groupIndex + 1}`)}
                </h2>
                <Chip size="sm" variant="flat">
                  {group.tabs.length}
                </Chip>
              </div>
              <ul className="space-y-1">
                {group.tabs.map((tabItem) => (
                  <li key={tabItem.tab.id} className="flex items-center gap-1 rounded-lg p-1 hover:bg-default-100">
                    <Button
                      className="min-w-0 flex-1 justify-start px-2 text-left"
                      variant="light"
                      onPress={() => chrome.tabs.update(tabItem.tab.id, { active: true })}
                      onMouseDown={(e) => handleTabMiddleClick(e, tabItem.tab.id)}>
                      {tabItem.tab.favIconUrl && (
                        <img
                          src={tabItem.tab.favIconUrl}
                          alt=""
                          className="mr-2 h-4 w-4 shrink-0"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      )}
                      <span className="truncate">{tabItem.tab.title || tabItem.tab.url}</span>
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() =>
                        chrome.runtime.sendMessage({
                          type: "MULTIPOST_EXTENSION_REQUEST_PUBLISH_RELOAD",
                          data: { tabId: tabItem.tab.id, tabGroup: group },
                        })
                      }
                      aria-label={chrome.i18n.getMessage("sidepanelReloadTab")}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      color="danger"
                      variant="light"
                      onPress={() => handleCloseTab(tabItem.tab.id)}
                      aria-label={chrome.i18n.getMessage("sidepanelCloseTab")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-default-300 bg-content1 px-4 py-12 text-center shadow-sm">
          <p className="text-sm text-default-500">{chrome.i18n.getMessage("sidepanelNoTabsMessage")}</p>
          <Button className="mt-4" color="primary" onPress={() => chrome.runtime.openOptionsPage()}>
            {chrome.i18n.getMessage("sidepanelCreateNewTabButton")}
          </Button>
        </div>
      )}
    </section>
  );
}

export default TabsManager;
