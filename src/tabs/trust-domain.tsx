import '~style.css';
import React, { useEffect, useState } from 'react';
import { HeroUIProvider, Button, Image, Checkbox } from '@heroui/react';
import { Storage } from '@plasmohq/storage';
import { Shield, ShieldAlert, Globe, XCircle, CheckCircle2 } from 'lucide-react';
import cssText from 'data-text:~style.css';

export function getShadowContainer() {
  return document.querySelector('#test-shadow').shadowRoot.querySelector('#plasmo-shadow-container');
}

export const getShadowHostId = () => 'test-shadow';

export const getStyle = () => {
  const style = document.createElement('style');

  style.textContent = cssText;
  return style;
};

interface TrustDomainParams {
  action: string;
  origin: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const TrustDomain = () => {
  const [params, setParams] = useState<TrustDomainParams | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const storage = new Storage({ area: 'local' });

  useEffect(() => {
    document.title = chrome.i18n.getMessage('optionsTitle') + ' - MultiPost';
    try {
      // 获取 hash 部分（移除开头的 #）
      const encodedParams = window.location.hash.substring(1);
      if (!encodedParams) {
        throw new Error('No parameters found');
      }

      // 解码 base64 并解析 JSON
      const decodedParams = JSON.parse(atob(encodedParams));
      setParams(decodedParams);
    } catch (error) {
      console.error('Error parsing parameters:', error);
      setParams({
        action: '',
        origin: '',
      });
    }
  }, []);

  const handleTrustDomain = async (trust: boolean) => {
    if (!params?.origin) return;

    setIsProcessing(true);
    try {
      const trustedDomains = (await storage.get<Array<{ id: string; domain: string }>>('trustedDomains')) || [];

      if (trust) {
        // 检查域名是否已存在
        const domainExists = trustedDomains.some(({ domain }) => domain === params.origin);
        if (!domainExists) {
          trustedDomains.push({
            id: crypto.randomUUID(),
            domain: params.origin,
          });
          await storage.set('trustedDomains', trustedDomains);
        }
        setFeedback({
          type: 'success',
          message: chrome.i18n.getMessage('settingsTrustedDomainsAdded') || '已添加到信任域名列表',
        });
      } else {
        setFeedback({
          type: 'error',
          message: chrome.i18n.getMessage('settingsTrustedDomainsRejected') || '已拒绝此域名请求',
        });
      }

      // 延迟关闭窗口
      setTimeout(() => {
        window.close();
      }, 3000);
    } catch (error) {
      console.error('Error handling trust domain:', error);
      setFeedback({
        type: 'error',
        message: chrome.i18n.getMessage('settingsTrustedDomainsError') || '处理请求时发生错误',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <HeroUIProvider>
      <div className="min-h-screen bg-gray-50/30">
        <div className="max-w-md p-6 mx-auto">
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
                <h1 className="text-2xl font-semibold">{chrome.i18n.getMessage('optionsTitle')}</h1>
              </a>
            </div>

            <div className="flex items-center justify-center gap-3 mb-6 ju">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
              <h1 className="text-xl font-semibold text-gray-900">
                {chrome.i18n.getMessage('settingsTrustedDomains')}
              </h1>
            </div>

            {params && (
              <div className="space-y-6">
                <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="mb-1 text-sm font-medium text-gray-500">
                        {chrome.i18n.getMessage('settingsTrustedDomainsOrigin')}
                      </div>
                      <div className="text-base font-medium text-gray-900">{params.origin}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-amber-50 border-amber-100">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 text-sm font-medium text-amber-800">
                          {chrome.i18n.getMessage('settingsTrustedDomainsSafetyTip')}
                        </div>
                        <div className="text-sm text-amber-700">
                          {chrome.i18n.getMessage('settingsTrustedDomainsConfirm')}
                        </div>
                      </div>
                      <ul className="ml-4 space-y-2 text-sm list-disc text-amber-700">
                        <li>{chrome.i18n.getMessage('settingsTrustedDomainsAllowPublish')}</li>
                        <li>{chrome.i18n.getMessage('settingsTrustedDomainsAllowAPI')}</li>
                        <li>
                          {chrome.i18n.getMessage('settingsTrustedDomainsCancel')}
                          <a
                            href={chrome.runtime.getURL('options.html#tab=settings')}
                            target="_blank"
                            className="text-blue-500 hover:text-blue-600">
                            {chrome.i18n.getMessage('gSettings')}
                          </a>
                        </li>
                      </ul>
                      <div className="flex items-center gap-2 pt-2 text-xs text-amber-600">
                        <Globe className="w-4 h-4" />
                        <span>
                          {chrome.i18n.getMessage('settingsTrustedDomainsOnlyAllow')} {params?.origin}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!feedback && (
                  <>
                    <div className="flex items-start gap-2 p-3 border border-gray-100 rounded-lg bg-gray-50">
                      <Checkbox
                        checked={isConfirmed}
                        onChange={(e) => setIsConfirmed(e.target.checked)}
                        className="mt-0.5"
                      />
                      <label className="text-sm text-gray-600">
                        {chrome.i18n.getMessage('settingsTrustedDomainsConfirmText')}
                      </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="ghost"
                        className="flex-1 h-10"
                        onPress={() => handleTrustDomain(false)}
                        disabled={isProcessing}>
                        <XCircle className="w-4 h-4 mr-2" />
                        {chrome.i18n.getMessage('settingsTrustedDomainsReject')}
                      </Button>
                      <Button
                        isDisabled={isProcessing || !isConfirmed}
                        variant="solid"
                        className="flex-1 h-10"
                        onPress={() => handleTrustDomain(true)}>
                        <Shield className="w-4 h-4 mr-2" />
                        {chrome.i18n.getMessage('settingsTrustedDomainsAllow')}
                      </Button>
                    </div>
                  </>
                )}

                {feedback && (
                  <div
                    className={`flex items-center justify-center p-4 rounded-lg transition-all duration-300 ${
                      feedback.type === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                    }`}>
                    <div className="flex items-center gap-2">
                      {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={feedback.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                        {feedback.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </HeroUIProvider>
  );
};

export default TrustDomain;
