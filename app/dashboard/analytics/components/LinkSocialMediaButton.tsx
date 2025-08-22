'use client';

import { Button, Form, Modal, ModalBody, ModalContent, ModalHeader, useDisclosure, Avatar } from '@heroui/react';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
// import { linkSocialMedia } from '../actions';
import { AccountInfo, getAccountInfos } from '@/lib/extension';

interface AccountInfoWithId extends AccountInfo {
  id: string;
}

/**
 * 创建监控网站组件
 */
export default function LinkSocialMediaButton() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [accountInfos, setAccountInfos] = useState<Record<string, AccountInfoWithId>>({});
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [loadingAccountInfos, setLoadingAccountInfos] = useState(true);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedAccounts.size === 0) return;

    try {
      setIsLoading(true);
      // 并行处理所有选中的账号
      const results = await Promise.all(
        Array.from(selectedAccounts).map((id) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...info } = accountInfos[id];
          // return linkSocialMedia(info);
        }),
      );

      // 跳转到第一个添加的账号页面
      if (results.length > 0) {
        window.location.reload();
      }
    } catch (error) {
      console.error('添加社交媒体失败:', error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  const handleToggleAccount = (id: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    getAccountInfos().then((infos) => {
      console.log('获取到的账号信息:', infos);
      const processedInfos = Object.entries(infos).reduce(
        (acc, [provider, info]) => {
          const id = `${provider}-${info.accountId || provider}`;
          acc[id] = { ...info, id };
          return acc;
        },
        {} as Record<string, AccountInfoWithId>,
      );
      setAccountInfos(processedInfos);
      setLoadingAccountInfos(false);
      console.log('获取到的账号信息:', processedInfos);
    });
  }, []);

  return (
    <>
      <Button
        color="primary"
        startContent={<PlusIcon />}
        onPress={onOpen}>
        添加社交媒体
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>选择要添加的社交媒体账号</ModalHeader>
          <ModalBody className="gap-4">
            {loadingAccountInfos ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500">正在加载账号信息...</p>
              </div>
            ) : Object.keys(accountInfos).length === 0 ? (
              <div className="space-y-4 rounded-lg border p-4">
                <p className="text-gray-500">未找到任何社交媒体账号</p>
                <p className="text-sm text-gray-400">请先安装浏览器扩展并登录社交媒体账号</p>
              </div>
            ) : (
              <Form
                onSubmit={handleSubmit}
                className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Object.entries(accountInfos).map(([id, info]) => (
                    <div
                      key={id}
                      onClick={() => handleToggleAccount(id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:bg-gray-50
                        ${selectedAccounts.has(id) ? 'border-primary-500 bg-primary-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedAccounts.has(id)}
                        onChange={() => {}}
                        className="size-4"
                      />
                      <Avatar
                        src={info.avatarUrl}
                        name={info.username || info.provider}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium">{info.username || info.provider}</p>
                        <p className="text-sm text-gray-600">{info.provider}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  fullWidth
                  type="submit"
                  color="primary"
                  isLoading={isLoading}
                  isDisabled={selectedAccounts.size === 0 || process.env.NODE_ENV === 'production'}
                  startContent={<PlusIcon className="size-4" />}>
                  添加选中的账号 ({selectedAccounts.size})
                </Button>
              </Form>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
