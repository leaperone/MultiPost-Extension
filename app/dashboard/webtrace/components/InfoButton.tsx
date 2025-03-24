'use client';

import { Button, Modal, ModalBody, ModalContent, ModalHeader, useDisclosure } from '@heroui/react';
import { InfoIcon, LineChart, Users, Zap, Bug, PlusCircle, Globe, Code2 } from 'lucide-react';

export function InfoButton() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button
        isIconOnly
        variant="light"
        aria-label="了解更多关于 Web Trace"
        onPress={onOpen}
        className="transition-transform hover:scale-110">
        <InfoIcon className="text-primary" />
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <InfoIcon className="text-primary" />
            关于 Web Trace
          </ModalHeader>
          <ModalBody className="space-y-6">
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-foreground/80">
                Web Trace 是一个强大的网站访问追踪工具，帮助您了解和分析网站的访问情况。
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium">
                <LineChart className="size-5 text-primary" />
                主要功能
              </h3>
              <ul className="grid gap-3 text-foreground/80">
                <li className="flex items-center gap-2">
                  <LineChart className="size-4 shrink-0 text-blue-500" />
                  实时访问统计：追踪网站的实时访问数据
                </li>
                <li className="flex items-center gap-2">
                  <Users className="size-4 shrink-0 text-green-500" />
                  访客分析：了解访客来源、地理位置和行为特征
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="size-4 shrink-0 text-yellow-500" />
                  性能监控：监控网站加载速度和性能指标
                </li>
                <li className="flex items-center gap-2">
                  <Bug className="size-4 shrink-0 text-red-500" />
                  错误追踪：自动捕获和记录前端错误
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium">
                <Code2 className="size-5 text-primary" />
                使用方法
              </h3>
              <ul className="grid gap-3 text-foreground/80">
                <li className="flex items-center gap-2">
                  <PlusCircle className="size-4 shrink-0 text-blue-500" />
                  点击&quot;添加网站&quot;按钮创建新的追踪项目
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="size-4 shrink-0 text-green-500" />
                  填写网站名称和域名（可选）
                </li>
                <li className="flex items-center gap-2">
                  <Code2 className="size-4 shrink-0 text-yellow-500" />
                  将生成的追踪代码添加到您的网站中
                </li>
                <li className="flex items-center gap-2">
                  <LineChart className="size-4 shrink-0 text-purple-500" />
                  开始查看详细的分析数据
                </li>
              </ul>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
