'use client';

import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from '@heroui/react';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { createWebsite } from '../actions';
import { useRouter } from 'next/navigation';

/**
 * 网站表单验证 Schema
 * @description 定义网站添加表单的验证规则
 * - name: 网站名称，必填
 * - domain: 域名，可选，但如果填写必须是有效的域名格式
 */
const websiteSchema = z.object({
  name: z.string().min(1, '网站名称不能为空'),
  domain: z
    .string()
    .regex(/^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/, '请输入有效的域名')
    .optional()
    .or(z.literal('')),
});

/**
 * 创建监控网站组件
 * @description 用于添加需要被监控的网站。通过此组件，用户可以：
 * 1. 添加网站基本信息（名称和域名）
 * 2. 将网站加入到监控列表中
 * 3. 实时验证输入的有效性
 */
export function CreateWebsiteButton() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      domain: formData.get('domain') as string,
    };

    try {
      setIsLoading(true);
      setValidationErrors({});

      const result = websiteSchema.safeParse(data);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        return;
      }

      const createdResult = await createWebsite(result.data);
      router.push(`/dashboard/analytics/web/${createdResult.id}?first-time=true`);
    } catch (error) {
      console.error('创建网站失败:', error);
      setValidationErrors({
        name: error instanceof Error ? error.message : '创建网站失败，请重试',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 触发按钮 */}
      <Button
        color="primary"
        startContent={<PlusIcon />}
        onPress={onOpen}>
        添加网站
      </Button>

      {/* 添加网站表单模态框 */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>添加新网站</ModalHeader>
          <ModalBody className="gap-4">
            <Form
              onSubmit={handleSubmit}
              className="gap-4">
              {/* 网站名称输入框 */}
              <Input
                name="name"
                label="网站名称"
                placeholder="例如：我的网站"
                isRequired
                autoFocus
                isInvalid={!!validationErrors.name}
                errorMessage={validationErrors.name}
              />

              {/* 域名输入框（可选） */}
              <Input
                name="domain"
                label="域名"
                placeholder="example.com"
                description="可选，用于过滤数据来源"
                isInvalid={!!validationErrors.domain}
                errorMessage={validationErrors.domain}
              />

              <Button
                fullWidth
                type="submit"
                color="primary"
                isLoading={isLoading}
                startContent={<PlusIcon className="size-4" />}>
                创建
              </Button>
            </Form>
          </ModalBody>
          <ModalFooter>
            {/* 表单说明 */}
            <Alert
              variant="flat"
              color="secondary">
              <p className="font-medium">说明</p>
              <ul className="list-inside list-disc gap-1">
                <li>添加网站后，系统将自动开始收集相关数据，无需额外操作</li>
                <li>网站名称用于区分不同的监控目标</li>
                <li>域名可选，用于过滤特定来源的数据</li>
              </ul>
            </Alert>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
