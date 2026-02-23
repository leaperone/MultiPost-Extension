'use client';

import { useEffect, useState } from 'react';
import { Avatar, Button, Card, CardBody, Chip, Progress, Spinner } from '@heroui/react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Home,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  getDesktopBridge,
  PublishProgressEvent,
  PublishStatus,
  useIsDesktop,
  usePublishProgress,
} from '@/lib/desktop-bridge';

interface AccountPublishState {
  accountId: string;
  platform: string;
  displayName?: string;
  avatar?: string;
  status: PublishStatus;
  message?: string;
  progress?: number;
}

/**
 * 执行器页面
 *
 * 显示批量发布进度和状态
 */
export default function DesktopExecutorPage() {
  const isDesktop = useIsDesktop();
  const [publishStates, setPublishStates] = useState<AccountPublishState[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'publishing' | 'completed'>('idle');

  // 监听发布进度
  usePublishProgress(
    // onProgress
    (event: PublishProgressEvent) => {
      setPublishStates((prev) => {
        const index = prev.findIndex((s) => s.accountId === event.accountId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: event.status,
            message: event.message,
            progress: event.progress,
          };
          return updated;
        }
        return [
          ...prev,
          {
            accountId: event.accountId,
            platform: event.platform,
            status: event.status,
            message: event.message,
            progress: event.progress,
          },
        ];
      });
      setOverallStatus('publishing');
    },
    // onComplete
    () => {
      setOverallStatus('completed');
    },
    // onError
    (error) => {
      console.error('Publish error:', error);
    }
  );

  // 初始化时获取当前发布状态
  useEffect(() => {
    // 从 Desktop Bridge 获取初始状态（如果有）
    // 这里可以扩展实现
  }, []);

  // 计算统计数据
  const stats = {
    total: publishStates.length,
    completed: publishStates.filter((s) => s.status === 'completed').length,
    failed: publishStates.filter((s) => s.status === 'failed').length,
    processing: publishStates.filter((s) => s.status === 'processing').length,
    pending: publishStates.filter((s) => s.status === 'pending').length,
  };

  const overallProgress =
    stats.total > 0 ? ((stats.completed + stats.failed) / stats.total) * 100 : 0;

  // 返回首页
  const handleGoHome = () => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.navigation.navigateTo('/desktop');
    }
  };

  // 重试失败项
  const handleRetry = async (accountId: string) => {
    // TODO: 实现重试逻辑
    console.log('Retry:', accountId);
  };

  // 获取状态配置
  const getStatusConfig = (status: PublishStatus) => {
    switch (status) {
      case 'idle':
        return {
          label: '等待中',
          color: 'default' as const,
          icon: <Clock className="size-4" />,
        };
      case 'pending':
        return {
          label: '排队中',
          color: 'warning' as const,
          icon: <Clock className="size-4" />,
        };
      case 'processing':
        return {
          label: '发布中',
          color: 'primary' as const,
          icon: <RefreshCw className="size-4 animate-spin" />,
        };
      case 'completed':
        return {
          label: '成功',
          color: 'success' as const,
          icon: <CheckCircle className="size-4" />,
        };
      case 'failed':
        return {
          label: '失败',
          color: 'danger' as const,
          icon: <XCircle className="size-4" />,
        };
      case 'cancelled':
        return {
          label: '已取消',
          color: 'default' as const,
          icon: <XCircle className="size-4" />,
        };
    }
  };

  if (!isDesktop) {
    return (
      <div className="p-6">
        <Card className="shadow-none border">
          <CardBody>
            <p className="text-muted-foreground">请在 Desktop 应用中打开此页面</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">发布执行器</h1>
          <p className="text-muted-foreground">
            {overallStatus === 'idle' && '等待发布任务...'}
            {overallStatus === 'publishing' && '正在发布中...'}
            {overallStatus === 'completed' && '发布完成'}
          </p>
        </div>
        {overallStatus === 'completed' && (
          <Button
            color="primary"
            startContent={<Home className="size-4" />}
            onPress={handleGoHome}>
            返回首页
          </Button>
        )}
      </div>

      {/* 总体进度 */}
      {publishStates.length > 0 && (
        <Card className="shadow-none border">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">总体进度</span>
              <span className="text-sm text-muted-foreground">
                {stats.completed + stats.failed} / {stats.total}
              </span>
            </div>
            <Progress
              value={overallProgress}
              color={stats.failed > 0 ? 'warning' : 'primary'}
              className="h-2"
            />
            <div className="flex gap-4 text-sm">
              <span className="text-success">成功: {stats.completed}</span>
              <span className="text-danger">失败: {stats.failed}</span>
              <span className="text-primary">进行中: {stats.processing}</span>
              <span className="text-warning">等待: {stats.pending}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 账号发布状态列表 */}
      {publishStates.length === 0 ? (
        <Card className="shadow-none border">
          <CardBody className="py-12">
            <div className="text-center space-y-4">
              {overallStatus === 'idle' ? (
                <>
                  <Clock className="size-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">没有正在进行的发布任务</p>
                  <Button
                    variant="flat"
                    onPress={handleGoHome}>
                    返回首页
                  </Button>
                </>
              ) : (
                <Spinner size="lg" />
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3">
          {publishStates.map((state) => {
            const statusConfig = getStatusConfig(state.status);

            return (
              <Card
                key={state.accountId}
                className="shadow-none border">
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={state.avatar}
                        name={state.displayName || state.accountId}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {state.displayName || state.accountId}
                          </span>
                          <Chip
                            size="sm"
                            variant="flat">
                            {state.platform}
                          </Chip>
                        </div>
                        {state.message && (
                          <p className="text-sm text-muted-foreground">{state.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        size="sm"
                        color={statusConfig.color}
                        variant="flat"
                        startContent={statusConfig.icon}>
                        {statusConfig.label}
                      </Chip>
                      {state.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => handleRetry(state.accountId)}>
                          重试
                        </Button>
                      )}
                    </div>
                  </div>
                  {state.status === 'processing' && state.progress !== undefined && (
                    <Progress
                      value={state.progress}
                      color="primary"
                      size="sm"
                      className="mt-3"
                    />
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* 失败提示 */}
      {stats.failed > 0 && overallStatus === 'completed' && (
        <Card className="shadow-none border border-warning/50 bg-warning/10">
          <CardBody>
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-warning" />
              <div>
                <p className="font-medium">部分发布失败</p>
                <p className="text-sm text-muted-foreground">
                  有 {stats.failed} 个账号发布失败，你可以点击「重试」按钮重新发布。
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
