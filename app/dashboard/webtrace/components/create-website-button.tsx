'use client';

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from '@heroui/react';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { createWebsite } from '../actions';

export function CreateWebsiteButton() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');

  const handleSubmit = async () => {
    if (!name) return;
    setIsLoading(true);
    try {
      await createWebsite({ name, domain });
      onClose();
      setName('');
      setDomain('');
    } catch (error) {
      console.error('创建网站失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        color="primary"
        endContent={<PlusIcon className="h-4 w-4" />}
        onPress={onOpen}>
        添加网站
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={onClose}>
        <ModalContent>
          <ModalHeader>添加新网站</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label="网站名称"
              placeholder="请输入网站名称"
              value={name}
              onValueChange={setName}
              isRequired
            />
            <Input
              label="域名"
              placeholder="example.com"
              value={domain}
              onValueChange={setDomain}
              description="可选，用于过滤数据来源"
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={onClose}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleSubmit}
              isLoading={isLoading}
              isDisabled={!name}>
              创建
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
