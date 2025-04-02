import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Input } from '@heroui/react';
import { Plus, Trash2, CheckCircle2, Settings } from 'lucide-react';
import { saveExtraConfig, getExtraConfig } from '~sync/extraconfig';

interface WebhookConfig {
  urls: string[];
}

interface WebhookProps {
  platformKey: string;
}

const SUPPORTED_WEBHOOKS = {
  feishu: {
    hostname: 'open.feishu.cn',
    docs: 'https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot',
    name: chrome.i18n.getMessage('extraConfigWebhookFeishu'),
  },
  wecom: {
    hostname: 'qyapi.weixin.qq.com',
    docs: 'https://developer.work.weixin.qq.com/document/path/99110',
    name: chrome.i18n.getMessage('extraConfigWebhookWecom'),
  },
  dingtalk: {
    hostname: 'oapi.dingtalk.com',
    docs: 'https://open.dingtalk.com/document/orgapp/custom-robot-access',
    name: chrome.i18n.getMessage('extraConfigWebhookDingtalk'),
  },
};

// URL 验证函数
const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const isSupported = Object.values(SUPPORTED_WEBHOOKS).some((webhook) => urlObj.hostname === webhook.hostname);
    return isSupported;
  } catch {
    return false;
  }
};

const getMessageBody = (url: string) => {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;

  if (hostname === 'qyapi.weixin.qq.com' || hostname === 'oapi.dingtalk.com') {
    return {
      msgtype: 'text',
      text: {
        content: 'Hello, World!',
      },
    };
  }

  if (hostname === 'open.feishu.cn') {
    return {
      msg_type: 'text',
      content: {
        text: 'Hello, World!',
      },
    };
  }

  return null;
};

const sendMessageCheck = async (url: string): Promise<boolean> => {
  try {
    const messageBody = getMessageBody(url);
    if (!messageBody) {
      throw new Error(chrome.i18n.getMessage('extraConfigWebhookUnsupportedPlatform'));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Webhook test failed:', error);
    if (error instanceof Error) {
      alert(chrome.i18n.getMessage('extraConfigWebhookTestFailed', [error.message]));
    } else {
      alert(chrome.i18n.getMessage('extraConfigWebhookNetworkError'));
    }
    return false;
  }
};

export default function DynamicWebhook({ platformKey }: WebhookProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [urls, setUrls] = useState<string[]>(['']);
  const [checkingStates, setCheckingStates] = useState<Record<number, boolean>>({});
  const [urlStates, setUrlStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // 加载已保存的webhook配置
    const loadConfig = async () => {
      const config = await getExtraConfig<WebhookConfig>(platformKey);
      if (config && config.urls.length > 0) {
        setUrls(config.urls);
      }
    };
    if (isOpen) {
      loadConfig();
    }
  }, [platformKey, isOpen]);

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
    // 清除该URL的状态
    setUrlStates((prev) => {
      const newStates = { ...prev };
      delete newStates[index];
      return newStates;
    });
  };

  const addUrl = () => {
    setUrls([...urls, '']);
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : ['']);
    // 清除该URL的状态
    setUrlStates((prev) => {
      const newStates = { ...prev };
      delete newStates[index];
      return newStates;
    });
  };

  const checkUrl = async (index: number) => {
    const url = urls[index];
    if (!isValidUrl(url)) {
      alert(chrome.i18n.getMessage('extraConfigWebhookInvalidUrl'));
      return;
    }

    setCheckingStates((prev) => ({ ...prev, [index]: true }));
    try {
      const isValid = await sendMessageCheck(url);
      if (isValid) {
        alert(chrome.i18n.getMessage('extraConfigWebhookTestSuccess'));
      }
      setUrlStates((prev) => ({ ...prev, [index]: isValid }));
    } finally {
      setCheckingStates((prev) => {
        const newStates = { ...prev };
        delete newStates[index];
        return newStates;
      });
    }
  };

  const handleSave = async () => {
    // 过滤掉空的URL
    const validUrls = urls.filter((url) => url.trim() !== '');

    // 验证所有URL
    const invalidUrls = validUrls.filter((url) => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      alert(chrome.i18n.getMessage('extraConfigWebhookInvalidUrl'));
      return;
    }

    await saveExtraConfig<WebhookConfig>(platformKey, { urls: validUrls });
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="light"
        size="sm"
        onPress={() => setIsOpen(true)}
        className="flex items-center gap-1">
        <Settings className="w-4 h-4" />
        {chrome.i18n.getMessage('extraConfigWebhookConfigure')}
      </Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="md"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>{chrome.i18n.getMessage('extraConfigWebhookConfigure')}</ModalHeader>
          <ModalBody>
            <div className="mb-4 text-sm text-gray-500">
              <p>{chrome.i18n.getMessage('extraConfigWebhookSupportedPlatforms')}</p>
              <div className="flex flex-wrap gap-2">
              {Object.values(SUPPORTED_WEBHOOKS).map((webhook) => (
                <p key={webhook.hostname}>
                  <a href={webhook.docs} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                    {webhook.name}
                  </a>
                  </p>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {urls.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2">
                  <Input
                    placeholder={chrome.i18n.getMessage('extraConfigWebhookEnterUrl')}
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    className={`flex-1 ${
                      urlStates[index] === false
                        ? 'border-red-500'
                        : urlStates[index] === true
                        ? 'border-green-500'
                        : ''
                    }`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={checkingStates[index]}
                    onPress={() => checkUrl(index)}
                    className="min-w-[80px]">
                    {!checkingStates[index] && (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {chrome.i18n.getMessage('extraConfigWebhookTest')}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => removeUrl(index)}
                    disabled={urls.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="light"
              onPress={addUrl}
              className="flex items-center gap-2 mt-4">
              <Plus className="w-4 h-4" />
              {chrome.i18n.getMessage('extraConfigWebhookAdd')}
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsOpen(false)}>
              {chrome.i18n.getMessage('extraConfigWebhookCancel')}
            </Button>
            <Button
              variant="solid"
              onPress={handleSave}>
              {chrome.i18n.getMessage('extraConfigWebhookSaveConfig')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
