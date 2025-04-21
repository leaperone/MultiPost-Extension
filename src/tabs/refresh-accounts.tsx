import '~style.css';
import React, { useEffect, useState } from 'react';
import { HeroUIProvider, Button, Image } from '@heroui/react';
import { RefreshCw, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import cssText from 'data-text:~style.css';
import { refreshAllAccountInfo, refreshAccountInfoMap } from '~sync/account';
import type { AccountInfo } from '~sync/common';

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

  const refreshAccounts = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await refreshAllAccountInfo();
      setState({
        isLoading: false,
        error: null,
        accounts: result.accounts,
        errors: result.errors,
      });
    } catch (error) {
      setState({
        isLoading: false,
        error: error.message || chrome.i18n.getMessage('refreshAccountsError'),
        accounts: {},
        errors: {},
      });
    }
  };

  useEffect(() => {
    document.title = chrome.i18n.getMessage('refreshAccountsTitle') + ' - MultiPost';
    refreshAccounts();
  }, []);

  return (
    <HeroUIProvider>
      <div className="min-h-screen bg-gray-50/30">
        <div className="max-w-2xl p-6 mx-auto">
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex flex-col items-center justify-center mb-8">
              <Image
                src={chrome.runtime.getURL('assets/icon.png')}
                alt="logo"
                className="w-16 h-16 mb-3 rounded-lg"
              />
              <a
                href="https://multipost.app"
                target="_blank"
                className="inline-flex items-center hover:text-blue-600">
                <h1 className="text-2xl font-semibold">{chrome.i18n.getMessage('refreshAccountsTitle')}</h1>
              </a>
            </div>

            {/* 刷新按钮 */}
            <div className="flex justify-center mb-6">
              <Button
                variant="ghost"
                className="h-10"
                onPress={refreshAccounts}
                isDisabled={state.isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
                {chrome.i18n.getMessage('refreshAccountsButton')}
              </Button>
            </div>

            {/* 加载状态 */}
            {state.isLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <span className="ml-2 text-gray-600">{chrome.i18n.getMessage('refreshAccountsLoading')}</span>
              </div>
            )}

            {/* 错误状态 */}
            {state.error && (
              <div className="flex items-center justify-center p-4 mb-4 rounded-lg bg-red-50">
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
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center flex-1">
                        <img
                          src={account?.avatarUrl || info.faviconUrl}
                          alt={info.platformName}
                          className={`w-10 h-10 ${account?.avatarUrl ? 'rounded-full' : 'rounded-md'}`}
                        />
                        <div className="flex-1 ml-3">
                          <div className="flex items-center justify-between">
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
                        <CheckCircle2 className="w-5 h-5 ml-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 ml-4 text-red-500 shrink-0" />
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
                <div className="flex flex-col items-center justify-center p-8 text-center">
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
