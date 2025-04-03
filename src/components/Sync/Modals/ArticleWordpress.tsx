import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Input } from '@heroui/react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { saveExtraConfig, getExtraConfig } from '~sync/extraconfig';

interface WordpressConfig {
  customInjectUrls: string[];
}

interface WordpressProps {
  platformKey: string;
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

export default function ArticleWordpress({ platformKey }: WordpressProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInjectUrls, setCustomInjectUrls] = useState<string[]>(['']);
  const [urlStates, setUrlStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // 加载已保存的wordpress配置
    const loadConfig = async () => {
      const config = await getExtraConfig<WordpressConfig>(platformKey);
      if (config && config.customInjectUrls.length > 0) {
        setCustomInjectUrls(config.customInjectUrls);
      }
    };
    if (isOpen) {
      loadConfig();
    }
  }, [platformKey, isOpen]);

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
      alert(chrome.i18n.getMessage('extraConfigWordpressInvalidUrl'));
      return;
    }

    await saveExtraConfig<WordpressConfig>(platformKey, { customInjectUrls: validUrls });
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
        {chrome.i18n.getMessage('extraConfigWordpressConfigure')}
      </Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="md"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>{chrome.i18n.getMessage('extraConfigWordpressConfigure')}</ModalHeader>
          <ModalBody>
            <div className="space-y-2">
              {customInjectUrls.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2">
                  <Input
                    placeholder={chrome.i18n.getMessage('extraConfigWordpressEnterUrl')}
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
              {chrome.i18n.getMessage('extraConfigWordpressAdd')}
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsOpen(false)}>
              {chrome.i18n.getMessage('extraConfigWordpressCancel')}
            </Button>
            <Button
              variant="solid"
              onPress={handleSave}>
              {chrome.i18n.getMessage('extraConfigWordpressSaveConfig')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
