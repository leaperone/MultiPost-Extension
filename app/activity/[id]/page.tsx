'use server';

import { notFound } from 'next/navigation';
import Header from '@/app/(default)/components/Header';
import { Chip, Spacer, Card, CardBody, Divider } from '@heroui/react';
import ActivityDetail from './components/ActivityDetail';
import { multipostDb } from '@/lib/db';
import type { ClientPromotionTask } from '@/app/api/promotion/types';
import { PromotionTaskType, PromotionTaskTypeLabelMap } from '@/app/api/promotion/types';
import { ExternalLink } from 'lucide-react';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 获取任务详情
 */
async function getTaskDetail(id: string): Promise<ClientPromotionTask> {
  const task = await multipostDb.promotionTask.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      taskType: true,
      title: true,
      description: true,
      link: true,
      keywords: true,
      examples: true,
      expiredAt: true,
      createdAt: true,
      updatedAt: true,
      reward: true,
    },
  });

  if (!task) {
    notFound();
  }

  return {
    ...task,
    reward: task.reward.toString(),
  };
}

export default async function ActivityDetailPage({ params }: Props) {
  const { id } = await params;
  const task = await getTaskDetail(id);
  const isExpired = new Date(task.expiredAt).getTime() <= Date.now();

  return (
    <div className="container mx-auto min-h-dvh py-8">
      <Header />
      <Spacer y={16} />

      <div className="mx-auto max-w-2xl">
        <Card className="overflow-hidden border-border/50">
          {/* 标题区域与状态标签 */}
          <div className="relative overflow-hidden">
            {/* 背景渐变 */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-70"></div>

            <div className="relative px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip
                      color={task.taskType === PromotionTaskType.PUBLISH_POST ? 'primary' : 'secondary'}
                      variant="flat"
                      className="shrink-0"
                      size="sm">
                      {PromotionTaskTypeLabelMap[task.taskType as PromotionTaskType]}
                    </Chip>
                    <h1 className="text-xl font-bold tracking-tight md:text-2xl">{task.title}</h1>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{task.description}</p>
                  <div className="text-xs text-muted-foreground md:text-sm">
                    <span className="font-medium">有效期至:</span>{' '}
                    <span className={isExpired ? 'text-danger' : ''}>
                      {new Date(task.expiredAt).toLocaleDateString()}
                      {isExpired && ' (已结束)'}
                    </span>
                  </div>
                </div>

                {/* 奖励信息高亮显示 */}
                <div className="flex shrink-0 items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 shadow-xs">
                  <span className="text-xs font-medium text-muted-foreground">奖励</span>
                  <span className="text-xl font-bold text-primary">$ {task.reward}</span>
                  <span className="text-xs text-muted-foreground">余额</span>
                </div>
              </div>
            </div>
          </div>

          <Divider />

          {/* 活动详情区域 */}
          <CardBody className="px-6 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* 左侧：活动基本信息 */}
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-foreground/80">活动详情</h3>
                  <div className="rounded-xl border border-border/40 bg-gradient-to-b from-primary/5 to-transparent p-4 shadow-xs">
                    {task.keywords && task.keywords.length > 0 ? (
                      <div className="border-b border-border/30 pb-3 last:border-0">
                        <p className="text-sm font-medium text-foreground/80">需包含关键词</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {task.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {task.examples && task.examples.length > 0 ? (
                      <div className="border-b border-border/30 py-3 last:border-0">
                        <p className="text-sm font-medium text-foreground/80">参考示例</p>
                        <ul className="mt-2 space-y-1.5">
                          {task.examples.map((example, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="mt-0.5 inline-block size-1.5 rounded-full bg-primary/60"></span>
                              <span className="italic">{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* 评论帖子任务的链接信息 */}
                    {task.taskType === PromotionTaskType.COMMENT_POST && task.link ? (
                      <div className="py-3 last:border-0">
                        <p className="text-sm font-medium text-foreground/80">评论目标</p>
                        <div className="mt-2 rounded-lg bg-background/60 p-2">
                          <a
                            href={task.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 break-all text-xs text-primary hover:underline">
                            <ExternalLink className="size-3.5" />
                            {task.link}
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {(!task.keywords || task.keywords.length === 0) &&
                      (!task.examples || task.examples.length === 0) &&
                      (task.taskType !== PromotionTaskType.COMMENT_POST || !task.link) && (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted/30">
                            <ExternalLink className="size-5 text-muted-foreground/70" />
                          </div>
                          <p className="text-sm text-muted-foreground">该活动暂无详细要求</p>
                          <p className="mt-1 text-xs text-muted-foreground/70">只需按照任务要求完成即可获得奖励</p>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* 右侧：任务说明或引导 */}
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-foreground/80">任务要求</h3>
                  <div className="rounded-xl border border-border/40 bg-gradient-to-b from-primary/5 to-transparent p-4 shadow-xs">
                    <div className="space-y-3">
                      {task.taskType === PromotionTaskType.PUBLISH_POST ? (
                        <ol className="space-y-3">
                          <li className="flex items-start gap-2.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              1
                            </span>
                            <span className="pt-0.5 text-sm">
                              在X上发布包含推广码的帖子{task.keywords && task.keywords.length > 0 && '（包含关键词）'}
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              2
                            </span>
                            <span className="pt-0.5 text-sm">提交帖子链接完成验证</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              3
                            </span>
                            <span className="pt-0.5 text-sm">验证通过后获得奖励</span>
                          </li>
                        </ol>
                      ) : (
                        <ol className="space-y-3">
                          <li className="flex items-start gap-2.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              1
                            </span>
                            <span className="pt-0.5 text-sm">打开指定帖子链接</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              2
                            </span>
                            <span className="pt-0.5 text-sm">
                              发表包含推广码的评论{task.keywords && task.keywords.length > 0 && '（包含关键词）'}
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              3
                            </span>
                            <span className="pt-0.5 text-sm">提交评论链接完成验证</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              4
                            </span>
                            <span className="pt-0.5 text-sm">验证通过后获得奖励</span>
                          </li>
                        </ol>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 交互区域 */}
        <div className="mt-6">
          <ActivityDetail task={task} />
        </div>
      </div>
    </div>
  );
}
