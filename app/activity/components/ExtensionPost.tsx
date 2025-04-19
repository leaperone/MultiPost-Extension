'use client';

import { checkServiceStatus, funcPublish, getPlatformInfos, SyncData } from '@/lib/extension';
import { ClientPromotionTask } from '@/app/api/promotion/types';
import { Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalBody } from '@heroui/react';
import { Loader2 } from 'lucide-react';

export default function ExtensionPost({ task }: { task: ClientPromotionTask }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getExample = async () => {
    try {
      const response = await fetch('/api/promotion/example', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          code: task.code,
        }),
      });

      if (!response.ok) {
        throw new Error('获取推广文案失败');
      }

      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('获取推广文案失败:', error);
      setError(`获取推广文案失败: ${error}`);
      return null;
    }
  };

  const publishPost = async () => {
    try {
      setIsLoading(true);
      setIsModalOpen(true);
      const platformData = await getPlatformInfos('DYNAMIC');
      const example = await getExample();
      console.log(example);
      if (!example) {
        return;
      }

      const syncData: SyncData = {
        platforms: platformData.filter((platform) => platform.name === 'DYNAMIC_X'),
        data: {
          title: example,
          content: '',
          images: [],
          videos: [],
        },
        isAutoPublish: false,
      };

      funcPublish(syncData);
    } catch (error) {
      console.error('发布失败:', error);
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    async function checkAvailable() {
      if (await checkServiceStatus()) {
        setIsAvailable(true);
      }
    }

    checkAvailable();
  }, []);

  console.log(task);

  if (!isAvailable || task.examples.length === 0 || !task.code) {
    return (
      <div>
        <p>
          请到{' '}
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer">
            x.com
          </a>{' '}
          发布新的帖子
        </p>
      </div>
    );
  }

  return (
    <>
      <Button
        onPress={publishPost}
        isLoading={isLoading}
        isDisabled={isLoading}>
        发布帖子
      </Button>

      <Modal
        isOpen={isModalOpen}
        hideCloseButton
        isDismissable={false}
        size="sm">
        <ModalContent>
          <ModalBody className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="size-6 animate-spin" />
            {error ? <p>{error}</p> : <p>正在处理中，请稍候...</p>}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
