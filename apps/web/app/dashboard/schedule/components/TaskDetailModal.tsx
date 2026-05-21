'use client';

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Divider,
  Card,
  CardBody,
  CardHeader,
  Snippet,
} from '@heroui/react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import {
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  ActivityIcon,
  ExternalLinkIcon,
  XIcon,
  RefreshCwIcon,
  InfoIcon,
  MegaphoneIcon,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cancelPublishTask, restartPublishTask, getSocialMediaAccountByPlatformId } from '../actions';
import { useTranslation } from '@/i18n/client';
import { Tooltip } from '@heroui/react';
import PublishErrorReportDialog, {
  type PublishErrorReportContext,
} from '@/components/feedback/PublishErrorReportDialog';
import { FEEDBACK_SOURCES } from '@/actions/feedback/types';

interface PublishTaskLog {
  id: string;
  platform: string;
  platformId: string;
  publishedAt: string | null;
  status: string;
  error: string | null;
  message: string | null;
}

interface PublishTaskDetail {
  id: string;
  status: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  draft: {
    id: string;
    title: string | null;
    content: string | null;
  };
  PublishTaskLog: PublishTaskLog[];
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: PublishTaskDetail | null;
}

interface SocialMediaAccount {
  id: string;
  platform: string;
  platformId: string;
  displayName: string | null;
  username: string | null;
}

const statusConfig = {
  pending: { label: 'pending', color: 'warning' as const },
  processing: { label: 'processing', color: 'primary' as const },
  completed: { label: 'completed', color: 'success' as const },
  failed: { label: 'failed', color: 'danger' as const },
  cancelled: { label: 'cancelled', color: 'default' as const },
};

export default function TaskDetailModal({ isOpen, onClose, task }: TaskDetailModalProps) {
  const { t, i18n } = useTranslation('schedule');
  const dateLocale = i18n.language === 'zh-CN' ? zhCN : enUS;
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [accountCache, setAccountCache] = useState<Record<string, SocialMediaAccount | null>>({});
  const [accountDisplayNames, setAccountDisplayNames] = useState<Record<string, string>>({});
  const [reportContext, setReportContext] = useState<PublishErrorReportContext | null>(null);
  const { t: tFeedback } = useTranslation('feedback');

  // 获取所有需要查询的账号信息
  const uniqueAccounts = useMemo(() => {
    if (!task?.PublishTaskLog) return [];

    const accounts = new Set<string>();
    task.PublishTaskLog.forEach((log) => {
      const cacheKey = `${log.platform}:${log.platformId}`;
      if (!accountCache[cacheKey] && !accountDisplayNames[cacheKey]) {
        accounts.add(cacheKey);
      }
    });
    return Array.from(accounts);
  }, [task?.PublishTaskLog, accountCache, accountDisplayNames]);

  // 批量获取账号信息
  useEffect(() => {
    if (!isOpen || uniqueAccounts.length === 0) return;

    const fetchAccounts = async () => {
      const newDisplayNames: Record<string, string> = {};

      for (const cacheKey of uniqueAccounts) {
        const [platform, platformId] = cacheKey.split(':');

        try {
          const result = await getSocialMediaAccountByPlatformId(platform, platformId);
          if (result.success && result.account) {
            setAccountCache((prev) => ({ ...prev, [cacheKey]: result.account }));
            const displayName = result.account.displayName || result.account.username || platformId;
            newDisplayNames[cacheKey] = displayName;
          } else {
            setAccountCache((prev) => ({ ...prev, [cacheKey]: null }));
            newDisplayNames[cacheKey] = platformId;
          }
        } catch {
          setAccountCache((prev) => ({ ...prev, [cacheKey]: null }));
          newDisplayNames[cacheKey] = platformId;
        }
      }

      setAccountDisplayNames((prev) => ({ ...prev, ...newDisplayNames }));
    };

    fetchAccounts();
  }, [isOpen, uniqueAccounts]);

  const getAccountDisplayName = (platform: string, platformId: string): string => {
    const cacheKey = `${platform}:${platformId}`;

    // 首先检查缓存
    if (accountCache[cacheKey]) {
      const account = accountCache[cacheKey];
      return account?.displayName || account?.username || platformId;
    }

    // 然后检查显示名称缓存
    if (accountDisplayNames[cacheKey]) {
      return accountDisplayNames[cacheKey];
    }

    // 如果都没有，返回 platformId
    return platformId;
  };

  if (!task) return null;

  const statusInfo = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.pending;
  const showPostPublishNotice =
    task.status === 'completed' || task.PublishTaskLog?.some((log) => log.status === 'completed');

  const handleCancelTask = async () => {
    if (!task || task.status !== 'pending') return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const result = await cancelPublishTask(task.id);

      if (result.success) {
        // Close modal and refresh parent component
        onClose();
        // You might want to add a callback to refresh the calendar
        window.location.reload(); // Simple refresh for now
      } else {
        setCancelError(result.error || t('errors.failedToCancel'));
      }
    } catch (error) {
      setCancelError(t('errors.unexpectedError'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRestartTask = async () => {
    if (!task || (task.status !== 'cancelled' && task.status !== 'failed')) return;

    setIsRestarting(true);
    setRestartError(null);

    try {
      const result = await restartPublishTask(task.id);

      if (result.success) {
        // Close modal and refresh parent component
        onClose();
        // You might want to add a callback to refresh the calendar
        window.location.reload(); // Simple refresh for now
      } else {
        setRestartError(result.error || t('errors.failedToRestart'));
      }
    } catch (error) {
      setRestartError(t('errors.unexpectedError'));
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[90vh]',
        body: 'py-6',
      }}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <CalendarIcon className="size-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  {task.draft.title || `${t('calendar.publishTask')} ${task.id.slice(-6)}`}
                </h2>
                <Chip
                  color={statusInfo.color}
                  variant="flat"
                  size="sm">
                  {t(`statusLabels.${statusInfo.label}`)}
                </Chip>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                {showPostPublishNotice && (
                  <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                    <InfoIcon className="mt-0.5 size-4 text-primary" />
                    <p className="leading-relaxed text-default-700">{t('notices.postPublish')}</p>
                  </div>
                )}
                {/* 基本信息 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="size-4 text-default-500" />
                      <h3 className="font-semibold">{t('taskDetail.taskInfo')}</h3>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500">{t('taskDetail.taskId')}</p>
                        <Snippet
                          size="sm"
                          symbol="#"
                          variant="flat">
                          {task.id.slice(-8)}
                        </Snippet>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">{t('taskDetail.scheduledTime')}</p>
                        <p className="flex items-center gap-1 text-sm font-medium">
                          <ClockIcon className="size-3" />
                          {format(new Date(task.publishedAt), t('dateFormat.scheduledTime'), { locale: dateLocale })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500">{t('taskDetail.createdAt')}</p>
                        <p className="text-sm">
                          {format(new Date(task.createdAt), t('dateFormat.datetime'), { locale: dateLocale })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">{t('taskDetail.updatedAt')}</p>
                        <p className="text-sm">
                          {format(new Date(task.updatedAt), t('dateFormat.datetime'), { locale: dateLocale })}
                        </p>
                      </div>
                    </div>

                    {task.draft.content && (
                      <div>
                        <p className="mb-2 text-sm text-default-500">{t('taskDetail.contentPreview')}</p>
                        <Card className="bg-default-50">
                          <CardBody>
                            <p className="line-clamp-3 text-sm">{task.draft.content}</p>
                          </CardBody>
                        </Card>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* 发布日志 */}
                {task.PublishTaskLog.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <ActivityIcon className="size-4 text-default-500" />
                        <h3 className="font-semibold">{t('taskDetail.publishLogs')}</h3>
                        <Chip
                          size="sm"
                          variant="flat">
                          {task.PublishTaskLog.length} {t('taskDetail.records')}
                        </Chip>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-3">
                        {task.PublishTaskLog.map((log, index) => (
                          <div key={log.id}>
                            <div className="flex items-start gap-3">
                              <div className="mt-1 shrink-0">
                                <div
                                  className={`size-2 rounded-full ${
                                    log.status === 'completed'
                                      ? 'bg-success'
                                      : log.status === 'failed'
                                        ? 'bg-danger'
                                        : log.status === 'processing'
                                          ? 'bg-primary'
                                          : 'bg-warning'
                                  }`}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {t(`platforms.${log.platform}`) || log.platform}
                                  </span>
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color={
                                      log.status === 'completed'
                                        ? 'success'
                                        : log.status === 'failed'
                                          ? 'danger'
                                          : log.status === 'processing'
                                            ? 'primary'
                                            : 'warning'
                                    }>
                                    {t(`statusLabels.${log.status}`)}
                                  </Chip>
                                  {log.status === 'failed' && (
                                    <Tooltip content={tFeedback('entry.rowTooltip')}>
                                      <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        aria-label={tFeedback('entry.rowButton')}
                                        onPress={() =>
                                          setReportContext({
                                            platform: log.platform,
                                            taskId: task.id,
                                            logId: log.id,
                                            status: log.status,
                                            errorMessage: log.error ?? log.message ?? undefined,
                                            source: FEEDBACK_SOURCES.PUBLISH_TASK_LOG,
                                          })
                                        }>
                                        <MegaphoneIcon className="size-4" />
                                      </Button>
                                    </Tooltip>
                                  )}
                                </div>

                                <div className="space-y-1 text-xs text-default-500">
                                  {log.publishedAt && (
                                    <p>
                                      {t('taskDetail.publishTime')}:{' '}
                                      {format(new Date(log.publishedAt), t('dateFormat.datetime'), { locale: dateLocale })}
                                    </p>
                                  )}
                                  {log.message && (
                                    <p>
                                      {t('taskDetail.message')}: {log.message}
                                    </p>
                                  )}
                                  {log.error && (
                                    <p className="text-danger-500">
                                      {t('taskDetail.error')}: {log.error}
                                    </p>
                                  )}
                                  <p>
                                    {t('taskDetail.platformId')}: {getAccountDisplayName(log.platform, log.platformId)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {index < task.PublishTaskLog.length - 1 && <Divider className="my-3 ml-5" />}
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <div className="flex items-center gap-2">
                {cancelError && <p className="text-sm text-danger-500">{cancelError}</p>}
                {restartError && <p className="text-sm text-danger-500">{restartError}</p>}
              </div>
              <div className="flex items-center gap-2">
                {task.status === 'pending' && (
                  <Button
                    color="danger"
                    variant="flat"
                    startContent={<XIcon className="size-4" />}
                    onPress={handleCancelTask}
                    isLoading={isCancelling}
                    isDisabled={isCancelling}>
                    {t('actions.cancelTask')}
                  </Button>
                )}
                {(task.status === 'cancelled' || task.status === 'failed') && (
                  <Button
                    color="primary"
                    variant="flat"
                    startContent={<RefreshCwIcon className="size-4" />}
                    onPress={handleRestartTask}
                    isLoading={isRestarting}
                    isDisabled={isRestarting}>
                    {t('actions.restartTask')}
                  </Button>
                )}
                <Button
                  color="primary"
                  variant="ghost"
                  onPress={onClose}>
                  {t('actions.close')}
                </Button>
                <Button
                  color="primary"
                  startContent={<ExternalLinkIcon className="size-4" />}
                  onPress={() => {
                    window.open(`/dashboard/draft/${task.draft.id}`, '_blank');
                  }}>
                  {t('actions.viewDraft')}
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
    {reportContext && (
      <PublishErrorReportDialog
        isOpen={Boolean(reportContext)}
        onClose={() => setReportContext(null)}
        context={reportContext}
      />
    )}
    </>
  );
}
