import '~style.css';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HeroUIProvider, Button, Image, Switch } from '@heroui/react';
import { RefreshCw, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import cssText from 'data-text:~style.css';
import { refreshAllAccountInfo, refreshAccountInfoMap } from '~sync/account';
import type { AccountInfo } from '~sync/common';
import { Storage } from '@plasmohq/storage';

const storage = new Storage({
  area: 'local',
});
const AUTO_CLOSE_KEY = 'refresh-accounts-auto-close';
const AUTO_CLOSE_DELAY = 3000; // 3 seconds

export function getShadowContainer() {
  return document.querySelector('#test-shadow').shadowRoot.querySelector('#plasmo-shadow-container');
}

export const getShadowHostId = () => 'test-shadow';

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

interface AccountState {
  isLoading: boolean;
  error: string | null;
  accounts: Record<string, AccountInfo>;
  errors: Record<string, string>;
}

const RefreshAccounts = () => {
  const [state, setState] = useState<AccountState>({
    isLoading: true,
    error: null,
    accounts: {},
    errors: {},
  });
  const [autoClose, setAutoClose] = useState(true);
  const autoCloseTimerRef = useRef<number>();

  const refreshAccounts = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await refreshAllAccountInfo();
      setState({
        isLoading: false,
        error: null,
        accounts: result.accounts,
        errors: result.errors,
      });

      // 清除之前的定时器
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }

      // 如果启用了自动关闭，且有账号信息，延迟关闭窗口
      if (autoClose && Object.keys(result.accounts).length > 0) {
        autoCloseTimerRef.current = window.setTimeout(() => {
          window.close();
        }, AUTO_CLOSE_DELAY);
      }
    } catch (error) {
      setState({
        isLoading: false,
        error: error.message || chrome.i18n.getMessage('refreshAccountsError'),
        accounts: {},
        errors: {},
      });
    }
  }, []);

  const handleAutoCloseChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    // 切换 autoClose 时清除之前的定时器
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    setAutoClose(checked);
    await storage.set(AUTO_CLOSE_KEY, String(checked));

    // 如果开启了自动关闭，且当前有账号信息，立即启动新的定时器
    if (checked && Object.keys(state.accounts).length > 0) {
      autoCloseTimerRef.current = window.setTimeout(() => {
        window.close();
      }, AUTO_CLOSE_DELAY);
    }
  };

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.title = chrome.i18n.getMessage('refreshAccountsTitle') + ' - MultiPost';
    refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    storage.get(AUTO_CLOSE_KEY).then((value) => {
      setAutoClose(value === undefined ? true : value === 'true');
    });
  }, []);

  return (
    <HeroUIProvider>
      <div className="min-h-screen bg-gray-50/30">
        <div className="p-6 mx-auto max-w-2xl">
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col justify-center items-center mb-8">
              <Image
                src={chrome.runtime.getURL('assets/icon.png')}
                alt="logo"
                className="mb-3 w-16 h-16 rounded-lg"
              />
              <a
                href="https://multipost.app"
                target="_blank"
                className="inline-flex items-center hover:text-blue-600">
                <h1 className="text-2xl font-semibold">{chrome.i18n.getMessage('refreshAccountsTitle')}</h1>
              </a>
            </div>

            {/* 刷新按钮和自动关闭设置 */}
            <div className="flex justify-between items-center mb-6">
              <Button
                variant="ghost"
                className="h-10"
                onPress={refreshAccounts}
                isDisabled={state.isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
                {chrome.i18n.getMessage('refreshAccountsButton')}
              </Button>

              <div className="flex gap-2 items-center">
                <Switch
                  isSelected={autoClose}
                  onChange={handleAutoCloseChange}
                  className="data-[state=checked]:bg-primary-600"
                />
                <span className="text-sm text-gray-600">{chrome.i18n.getMessage('refreshAccountsAutoClose')}</span>
              </div>
            </div>

            {/* 加载状态 */}
            {state.isLoading && (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <span className="ml-2 text-gray-600">{chrome.i18n.getMessage('refreshAccountsLoading')}</span>
              </div>
            )}

            {/* 错误状态 */}
            {state.error && (
              <div className="flex justify-center items-center p-4 mb-4 bg-red-50 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="ml-2 text-red-700">{state.error}</span>
              </div>
            )}

            {/* 账户列表 */}
            {!state.isLoading && !state.error && (
              <div className="space-y-4">
                {Object.entries(refreshAccountInfoMap).map(([platform, info]) => {
                  const account = state.accounts[platform];
                  const error = state.errors[platform];

                  return (
                    <div
                      key={platform}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-1 items-center">
                        <img
                          src={account?.avatarUrl || info.faviconUrl}
                          alt={info.platformName}
                          className={`w-10 h-10 ${account?.avatarUrl ? 'rounded-full' : 'rounded-md'}`}
                        />
                        <div className="flex-1 ml-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-gray-900">
                                {account?.username || chrome.i18n.getMessage('optionsNotLoggedIn')}
                              </div>
                              <div className="text-sm text-gray-500">{info.platformName}</div>
                            </div>
                            <a
                              href={info.homeUrl}
                              target="_blank"
                              className="ml-2 text-gray-500 hover:text-gray-700">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                          {error && <div className="mt-1 text-sm text-red-500">{error}</div>}
                        </div>
                      </div>
                      {account ? (
                        <CheckCircle2 className="ml-4 w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="ml-4 w-5 h-5 text-red-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 无账户状态 */}
            {!state.isLoading &&
              !state.error &&
              Object.keys(state.accounts).length === 0 &&
              Object.keys(state.errors).length === 0 && (
                <div className="flex flex-col justify-center items-center p-8 text-center">
                  <div className="text-gray-500">{chrome.i18n.getMessage('refreshAccountsNoAccounts')}</div>
                </div>
              )}
          </div>
        </div>
      </div>
    </HeroUIProvider>
  );
};

export default RefreshAccounts;
