'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { Code } from 'lucide-react';

interface ScriptExampleModalProps {
  websiteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ScriptExampleModal({ websiteId, isOpen, onClose }: ScriptExampleModalProps) {
  const scriptCode = `<script
  async
  src="https://multipost.app/tracker/index.js"
  mdata-website-id="${websiteId}"
  mdata-auto-track="true"
/>`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Code className="size-5" />
          跟踪代码
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            <div className="space-y-4">
              <pre className="rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                <code>{scriptCode}</code>
              </pre>
              <Button
                variant="flat"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(scriptCode);
                }}>
                复制代码
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">安装说明</h3>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary-100 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100">
                    1
                  </div>
                  <p className="flex-1">复制上面的跟踪代码</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary-100 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100">
                    2
                  </div>
                  <p className="flex-1">
                    将代码粘贴到您网站的{' '}
                    <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">&lt;head&gt;</code> 标签中
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary-100 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100">
                    3
                  </div>
                  <p className="flex-1">等待几分钟，数据就会开始显示在分析面板中</p>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={onClose}>
            关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
