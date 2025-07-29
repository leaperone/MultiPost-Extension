import '~style.css';
import React, { useEffect, useState } from 'react';
import { HeroUIProvider, Button, Image } from '@heroui/react';
import { Storage } from '@plasmohq/storage';
import { Shield, ShieldAlert, XCircle, CheckCircle2 } from 'lucide-react';
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

interface LinkExtensionParams {
  apiKey: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const LinkExtension = () => {
  const [params, setParams] = useState<LinkExtensionParams | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
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
      console.log('decodedParams', decodedParams);
    } catch (error) {
      console.error('Error parsing parameters:', error);
      setParams({
        apiKey: '',
      });
    }
  }, []);

  const handleLinkExtension = async (confirm: boolean) => {
    if (!params?.apiKey) {
      setFeedback({
        type: 'error',
        message: chrome.i18n.getMessage('linkExtensionError'),
      });
      setTimeout(() => {
        window.close();
      }, 3000);
      return;
    }

    setIsProcessing(true);
    try {
      if (confirm) {
        await storage.set('apiKey', params.apiKey);
        setFeedback({
          type: 'success',
          message: chrome.i18n.getMessage('linkExtensionSuccess'),
        });
      } else {
        await storage.remove('apiKey');
        setFeedback({
          type: 'error',
          message: chrome.i18n.getMessage('linkExtensionRejected'),
        });
      }

      chrome.runtime.sendMessage({
        type: 'MULTIPOST_EXTENSION_LINK_EXTENSION_CONFIRM',
        confirm: confirm,
      });

      // 延迟关闭窗口
      setTimeout(() => {
        window.close();
      }, 3000);
    } catch (error) {
      console.error('Error handling trust domain:', error);
      setFeedback({
        type: 'error',
        message: chrome.i18n.getMessage('linkExtensionProcessError'),
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
              <h1 className="text-xl font-semibold text-gray-900">{chrome.i18n.getMessage('linkExtensionTitle')}</h1>
            </div>

            {!feedback && (
              <>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1 h-10"
                    onPress={() => handleLinkExtension(false)}
                    disabled={isProcessing}>
                    <XCircle className="w-4 h-4 mr-2" />
                    {chrome.i18n.getMessage('linkExtensionReject')}
                  </Button>
                  <Button
                    isDisabled={isProcessing}
                    variant="solid"
                    className="flex-1 h-10"
                    onPress={() => handleLinkExtension(true)}>
                    <Shield className="w-4 h-4 mr-2" />
                    {chrome.i18n.getMessage('linkExtensionAllow')}
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
        </div>
      </div>
    </HeroUIProvider>
  );
};

export default LinkExtension;
