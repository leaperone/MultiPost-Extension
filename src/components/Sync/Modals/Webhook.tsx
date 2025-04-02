import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Input } from '@heroui/react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { saveExtraConfig, getExtraConfig } from '~sync/extraconfig';

interface WebhookConfig {
  urls: string[];
}

interface WebhookProps {
  platformKey: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
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

const getMessageBody = (url: string) => {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;

  if (hostname === 'qyapi.weixin.qq.com' || hostname === 'oapi.dingtalk.com') {
    return {
      msgtype: 'text',
      text: {
        content: '测试消息',
      },
    };
  }

  // 默认消息格式
  return {
    msg_type: 'text',
    content: {
      text: '测试消息',
    },
  };
};

const sendMessageCheck = async (url: string): Promise<boolean> => {
  try {
    const messageBody = getMessageBody(url);
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
      alert(`Webhook测试失败: ${error.message}`);
    } else {
      alert('Webhook测试失败: 网络错误');
    }
    return false;
  }
};

export default function Webhook({ platformKey, isOpen, onOpenChange }: WebhookProps) {
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
      alert('URL格式无效，请输入正确的URL地址');
      return;
    }

    setCheckingStates((prev) => ({ ...prev, [index]: true }));
    try {
      const isValid = await sendMessageCheck(url);
      if (isValid) {
        alert('Webhook测试成功！');
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
      alert(`以下URL格式无效：\n${invalidUrls.join('\n')}`);
      return;
    }

    await saveExtraConfig<WebhookConfig>(platformKey, { urls: validUrls });
    onOpenChange(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      placement="center"
      backdrop="blur">
      <ModalContent>
        <ModalHeader>配置Webhook</ModalHeader>
        <ModalBody>
          <div className="space-y-2">
            {urls.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-2">
                <Input
                  placeholder="输入Webhook URL"
                  value={url}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  className={`flex-1 ${
                    urlStates[index] === false ? 'border-red-500' : urlStates[index] === true ? 'border-green-500' : ''
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
                      测试
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
            添加URL
          </Button>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="solid"
            onPress={handleSave}>
            保存配置
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
