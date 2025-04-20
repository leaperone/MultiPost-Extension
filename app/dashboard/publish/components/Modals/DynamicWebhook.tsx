import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, addToast } from '@heroui/react';
import { Input } from '@heroui/react';
import { Plus, Trash2, CheckCircle2, Settings } from 'lucide-react';
import { savePlatformExtraConfig } from '@/app/dashboard/publish/action';
import { PlatformInfo } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';

interface WebhookConfig {
  urls: string[];
}

interface WebhookProps {
  platformInfo: PlatformInfo;
  onExtraConfigChange: (platformKey: string, extraConfig: unknown) => void;
}

export default function DynamicWebhook({ platformInfo, onExtraConfigChange }: WebhookProps) {
  const { t } = useTranslation('publish.extraConfig');
  const [isOpen, setIsOpen] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [checkingStates, setCheckingStates] = useState<Record<number, boolean>>({});
  const [urlStates, setUrlStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (platformInfo.extraConfig?.urls) {
      setUrls(platformInfo.extraConfig.urls);
    }
  }, [platformInfo.extraConfig]);

  const SUPPORTED_WEBHOOKS = {
    feishu: {
      hostname: 'open.feishu.cn',
      docs: 'https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot',
      name: t('webhook.platforms.feishu'),
    },
    wecom: {
      hostname: 'qyapi.weixin.qq.com',
      docs: 'https://developer.work.weixin.qq.com/document/path/99110',
      name: t('webhook.platforms.wecom'),
    },
    dingtalk: {
      hostname: 'oapi.dingtalk.com',
      docs: 'https://open.dingtalk.com/document/orgapp/custom-robot-access',
      name: t('webhook.platforms.dingtalk'),
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
        throw new Error(t('webhook.unsupportedPlatform'));
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
        addToast({
          title: t('webhook.testFailed.title'),
          description: error.message,
          color: 'danger',
        });
      } else {
        addToast({
          title: t('webhook.testFailed.title'),
          description: t('webhook.testFailed.description'),
          color: 'danger',
        });
      }
      return false;
    }
  };

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
      addToast({
        title: t('webhook.invalidUrl.title'),
        description: t('webhook.invalidUrl.description'),
        color: 'danger',
      });
      return;
    }

    setCheckingStates((prev) => ({ ...prev, [index]: true }));
    try {
      const isValid = await sendMessageCheck(url);
      if (isValid) {
        addToast({
          title: t('webhook.testSuccess.title'),
          description: t('webhook.testSuccess.description'),
          color: 'success',
        });
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
      addToast({
        title: t('webhook.invalidUrl.title'),
        description: t('webhook.invalidUrl.description'),
        color: 'danger',
      });
      return;
    }

    await savePlatformExtraConfig<WebhookConfig>(platformInfo.name, { urls: validUrls });
    setIsOpen(false);
    onExtraConfigChange(platformInfo.name, { urls: validUrls });
  };

  return (
    <>
      <Button
        variant="light"
        size="sm"
        onPress={() => setIsOpen(true)}
        className="flex items-center gap-1">
        <Settings className="size-4" />
        {t('modal.config')}
      </Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="md"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>{t('modal.config')}</ModalHeader>
          <ModalBody>
            <div className="mb-4 text-sm text-gray-500">
              <p>{t('webhook.description')}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SUPPORTED_WEBHOOKS).map(([, webhook]) => (
                  <p key={webhook.hostname}>
                    <a
                      href={webhook.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500">
                      {t(`webhook.platforms.${webhook.name}`)}
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
                    placeholder={t('webhook.urlPlaceholder')}
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
                        <CheckCircle2 className="mr-1 size-4" />
                        {t('modal.test')}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => removeUrl(index)}
                    disabled={urls.length === 1}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="light"
              onPress={addUrl}
              className="mt-4 flex items-center gap-2">
              <Plus className="size-4" />
              {t('modal.add')}
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsOpen(false)}>
              {t('modal.cancel')}
            </Button>
            <Button
              variant="solid"
              onPress={handleSave}>
              {t('modal.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
