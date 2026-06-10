import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, addToast } from '@heroui/react';
import { Input } from '@heroui/react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { PlatformInfo } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';
import { savePlatformExtraConfig } from '../../../../../actions/publish';

interface WordpressConfig {
  customInjectUrls: string[];
}

interface WordpressProps {
  platformInfo: PlatformInfo;
  onExtraConfigChange: (platformKey: string, extraConfig: unknown) => void;
}

// URL 验证函数
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function ArticleWordpress({ platformInfo, onExtraConfigChange }: WordpressProps) {
  const { t } = useTranslation('publish.extraConfig');
  const [isOpen, setIsOpen] = useState(false);
  const [customInjectUrls, setCustomInjectUrls] = useState<string[]>(['']);
  const [urlStates, setUrlStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const config = platformInfo.extraConfig;
    if (config) {
      setCustomInjectUrls(config.customInjectUrls || ['']);
    }
  }, [platformInfo.extraConfig]);

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...customInjectUrls];
    newUrls[index] = value;
    setCustomInjectUrls(newUrls);
    // 清除该URL的状态
    setUrlStates((prev) => {
      const newStates = { ...prev };
      delete newStates[index];
      return newStates;
    });
  };

  const addUrl = () => {
    setCustomInjectUrls([...customInjectUrls, '']);
  };

  const removeUrl = (index: number) => {
    const newUrls = customInjectUrls.filter((_, i) => i !== index);
    setCustomInjectUrls(newUrls.length > 0 ? newUrls : ['']);
    // 清除该URL的状态
    setUrlStates((prev) => {
      const newStates = { ...prev };
      delete newStates[index];
      return newStates;
    });
  };

  const handleSave = async () => {
    // 过滤掉空的URL
    const validUrls = customInjectUrls.filter((url) => url.trim() !== '');

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

    await savePlatformExtraConfig({
      data: {
        platform: platformInfo.name,
        data: {
          customInjectUrls: validUrls,
        } satisfies WordpressConfig,
      },
    });
    setIsOpen(false);
    onExtraConfigChange(platformInfo.name, {
      customInjectUrls: validUrls,
    });
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
            <div className="space-y-2">
              {customInjectUrls.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2">
                  <Input
                    placeholder={t('wordpress.urlPlaceholder')}
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
                    onPress={() => removeUrl(index)}
                    disabled={customInjectUrls.length === 1}>
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
