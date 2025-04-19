'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ClientPromotionTask, PromotionTaskType } from '@/app/api/promotion/types';
import {
  Card,
  CardBody,
  Button,
  addToast,
  Input,
  Link,
  Modal,
  ModalContent,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Divider,
  Snippet,
} from '@heroui/react';
import ExtensionPost from '../../components/ExtensionPost';
import { Loader2, Copy, ExternalLink, ChevronRight, Check, MessageCircle, XIcon } from 'lucide-react';
import { getPromotionCode, verifyPromotionTask } from '../actions';
import { useSession } from 'next-auth/react';

interface Props {
  task: ClientPromotionTask;
}

export default function ActivityDetail({ task: initialTask }: Props) {
  const {data: session} = useSession();
  const router = useRouter();
  const [link, setLink] = useState<string>('');
  const [task, setTask] = useState<ClientPromotionTask>(initialTask);
  const [previewText, setPreviewText] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(task.code ? (task.isVerified ? 3 : 2) : 1);

  const getCode = async () => {
    try {
      if (!session) {
        addToast({
          title: '请先登录',
        });
        router.push('/signin?redirect=/activity/' + task.id);
        return;
      }

      const data = await getPromotionCode(task.id);

      // 更新本地状态
      setTask((prev) => ({ ...prev, code: data.code }));
      // 更新步骤
      setActiveStep(2);

      // 刷新页面以获取服务器数据
      router.refresh();

      addToast({
        title: '获取兑换码成功',
        description: '现在您可以使用推广码发布帖子了',
      });
    } catch (error) {
      addToast({
        title: '获取兑换码失败',
        description: error instanceof Error ? error.message : '获取兑换码失败',
      });
    }
  };

  const verifyTask = async (link: string) => {
    try {
      if (!link) {
        addToast({
          title: '请输入链接',
        });
        return;
      }

      const result = await verifyPromotionTask(task.id, link);

      if (!result.success) {
        throw new Error('验证失败');
      }

      // 更新本地状态
      setTask((prev) => ({ ...prev, isVerified: true }));
      // 更新步骤
      setActiveStep(3);

      // 刷新页面以获取服务器数据
      router.refresh();

      addToast({
        title: '提交成功',
        description: '恭喜您完成了活动！奖励已发放到您的账户',
      });
    } catch (error) {
      addToast({
        title: '提交失败',
        description: error instanceof Error ? error.message : '提交失败',
      });
    }
  };

  const generatePreview = async () => {
    if (!task.code) return;

    try {
      setIsPreviewLoading(true);
      setIsPreviewModalOpen(true);

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
      setPreviewText(data);
    } catch (error) {
      addToast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '获取推广文案失败',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      addToast({
        title: '已复制到剪贴板',
      });
    } catch (error) {
      addToast({
        title: '复制失败',
        description: '请手动复制文本',
      });
    }
  };

  // 任务已过期
  const isExpired = new Date(task.expiredAt).getTime() <= Date.now();

  // 根据任务类型获取步骤文本
  const getStepText = (step: number) => {
    if (task.taskType === PromotionTaskType.COMMENT_POST) {
      return step === 2 ? '发表评论' : step === 1 ? '获取推广码' : '完成任务';
    }
    return step === 2 ? '发布推广帖子' : step === 1 ? '获取推广码' : '完成任务';
  };

  return (
    <>
      <Card className="overflow-hidden border-border/50">
        <CardBody className="p-0">
          {/* 步骤指引 */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <div
                className={`flex items-center gap-2 ${activeStep >= 1 ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-xs ${activeStep >= 1 ? 'bg-primary text-white' : 'bg-muted-foreground/30 text-muted-foreground'}`}>
                  {activeStep > 1 ? <Check size={14} /> : '1'}
                </div>
                <span>{getStepText(1)}</span>
              </div>

              <ChevronRight className="size-4 text-muted-foreground/50" />

              <div
                className={`flex items-center gap-2 ${activeStep >= 2 ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-xs ${activeStep >= 2 ? 'bg-primary text-white' : 'bg-muted-foreground/30 text-muted-foreground'}`}>
                  {activeStep > 2 ? <Check size={14} /> : '2'}
                </div>
                <span>{getStepText(2)}</span>
              </div>

              <ChevronRight className="size-4 text-muted-foreground/50" />

              <div
                className={`flex items-center gap-2 ${activeStep >= 3 ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-xs ${activeStep >= 3 ? 'bg-primary text-white' : 'bg-muted-foreground/30 text-muted-foreground'}`}>
                  {activeStep > 3 ? <Check size={14} /> : '3'}
                </div>
                <span>{getStepText(3)}</span>
              </div>
            </div>
          </div>

          <Divider />

          {/* 示例内容 */}
          {task.examples && task.examples.length > 0 && (
            <div className="border-b border-border/50 px-6 py-4">
              <p className="mb-2 text-sm font-medium">参考文案:</p>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-sm italic text-muted-foreground">{task.examples.join(', ')}</p>
              </div>
            </div>
          )}

          {/* 主要内容区域 */}
          <div className="p-6">
            {isExpired && !task.code ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">活动已结束</p>
              </div>
            ) : task.isVerified ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex max-w-xs items-center justify-center rounded-full bg-success/10 p-3">
                  <Check className="size-8 text-success" />
                </div>
                <div>
                  <p className="text-lg font-medium text-success">任务已完成</p>
                  <p className="mt-1 text-sm text-muted-foreground">奖励已发放到您的免费余额中</p>
                </div>
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">您使用的推广码</p>
                  <p className="mt-2 font-mono text-lg font-bold text-primary">{task.code}</p>
                </div>
              </div>
            ) : !task.code ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">参与此活动，获取 $ {task.reward} 额度</p>
                <Button
                  className="w-full max-w-xs bg-primary transition-colors hover:bg-primary/90"
                  size="lg"
                  onPress={getCode}>
                  获取推广码
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 推广码展示 */}
                <Card className="bg-primary/5 shadow-none">
                  <CardBody className="text-center">
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <p className="text-sm text-muted-foreground">您的推广码</p>
                      <p className="font-mono text-xl font-bold text-primary">{task.code}</p>
                      <Snippet
                        size="sm"
                        variant="flat"
                        color="primary"
                        symbol=""
                        classNames={{
                          base: 'bg-transparent',
                          pre: 'hidden',
                          copyButton: 'bg-transparent hover:bg-primary/10',
                        }}
                        onCopy={() => addToast({ title: '复制成功' })}>
                        {task.code || ''}
                      </Snippet>
                    </div>
                  </CardBody>
                </Card>

                {/* 根据任务类型展示不同的操作区域 */}
                {task.taskType === PromotionTaskType.PUBLISH_POST ? (
                  /* 发布帖子指引 */
                  <div className="space-y-3 rounded-lg border border-border/50 p-4">
                    <p className="text-sm font-medium">发布帖子:</p>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        color="primary"
                        className="min-w-[120px] flex-1"
                        startContent={<Copy size={16} />}
                        onPress={generatePreview}>
                        AI生成文案
                      </Button>

                      <Button
                        color="primary"
                        variant="bordered"
                        className="min-w-[120px] flex-1"
                        startContent={<ExternalLink size={16} />}
                        as={Link}
                        href="https://x.com/compose/tweet"
                        target="_blank">
                        去X发帖
                      </Button>
                    </div>

                    <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                      <p>请在发布的帖子中包含此推广码</p>
                      <p>如果您已安装 MultiPost 浏览器扩展，可以直接使用扩展发布:</p>
                      <div className="mt-2">
                        <ExtensionPost task={task} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 评论帖子指引 */
                  <div className="space-y-3 rounded-lg border border-border/50 p-4">
                    <p className="text-sm font-medium">发表评论:</p>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        color="primary"
                        className="min-w-[120px] flex-1"
                        startContent={<Copy size={16} />}
                        onPress={generatePreview}>
                        AI生成评论
                      </Button>

                      {task.link && (
                        <Button
                          color="primary"
                          variant="bordered"
                          className="min-w-[120px] flex-1"
                          startContent={<MessageCircle size={16} />}
                          as={Link}
                          href={task.link}
                          target="_blank">
                          去发表评论
                        </Button>
                      )}
                    </div>

                    <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                      <p>评论提示:</p>
                      <ul className="mt-1 list-inside list-disc">
                        <li>评论必须包含您的推广码</li>
                        <li>评论需要与原帖内容相关</li>
                        {task.keywords && task.keywords.length > 0 && (
                          <li>尽量包含推荐关键词: {task.keywords.join(', ')}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 提交验证 */}
                <div className="space-y-3 rounded-lg border border-border/50 p-4">
                  <p className="text-sm font-medium">提交验证:</p>
                  <div className="flex flex-col gap-2">
                    <Input
                      className="w-full"
                      placeholder={
                        task.taskType === PromotionTaskType.PUBLISH_POST
                          ? '请输入你发布的X帖子链接'
                          : '请输入你发表的评论链接'
                      }
                      onChange={(e) => setLink(e.target.value)}
                      aria-label="帖子链接"
                    />
                    <Button
                      color="primary"
                      onPress={() => verifyTask(link)}>
                      提交验证
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* AI 生成文案预览模态框 */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}>
        <ModalContent>
          <ModalHeader>
            {task.taskType === PromotionTaskType.PUBLISH_POST ? 'AI 生成的推广文案' : 'AI 生成的评论内容'}
          </ModalHeader>
          <ModalBody>
            {isPreviewLoading ? (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="size-6 animate-spin" />
                <p>正在生成{task.taskType === PromotionTaskType.PUBLISH_POST ? '文案' : '评论'}，请稍候...</p>
              </div>
            ) : (
              <div className="rounded-lg border p-4">
                <p className="whitespace-pre-wrap">{previewText}</p>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              color="primary"
              onPress={copyToClipboard}
              isDisabled={!previewText || isPreviewLoading}
              className="w-full sm:w-auto"
              startContent={<Copy size={16} />}>
              复制{task.taskType === PromotionTaskType.PUBLISH_POST ? '文案' : '评论'}
            </Button>
            {task.taskType === PromotionTaskType.COMMENT_POST && task.link && (
              <Button
                color="success"
                className="w-full sm:w-auto"
                isDisabled={!previewText || isPreviewLoading}
                startContent={<ExternalLink size={16} />}
                onPress={async () => {
                  await copyToClipboard();
                  if (task.link) {
                    window.open(task.link, '_blank');
                  }
                }}>
                复制并前往评论
              </Button>
            )}
            {task.taskType === PromotionTaskType.PUBLISH_POST && (
              <Button
                color="success"
                className="w-full sm:w-auto"
                isDisabled={!previewText || isPreviewLoading}
                startContent={<ExternalLink size={16} />}
                onPress={async () => {
                  await copyToClipboard();
                  window.open('https://x.com/compose/tweet', '_blank');
                }}>
                复制并前往发帖
              </Button>
            )}
            <Button
              color="danger"
              className="w-full sm:w-auto"
              startContent={<XIcon size={16} />}
              onPress={() => setIsPreviewModalOpen(false)}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
