'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  useDisclosure,
} from '@heroui/react';
import {
  CheckCircle,
  ChevronDown,
  ExternalLink,
  FileText,
  Image,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Video,
  XCircle,
} from 'lucide-react';
import {
  ContentType,
  getDesktopBridge,
  PublishHistory,
  useDesktopHistory,
  useIsDesktop,
} from '@/lib/desktop-bridge';

const contentTypeConfig: Record<ContentType, { label: string; icon: React.ReactNode }> = {
  DYNAMIC: { label: '动态', icon: <Image className="size-4" /> },
  VIDEO: { label: '视频', icon: <Video className="size-4" /> },
  ARTICLE: { label: '文章', icon: <FileText className="size-4" /> },
  PODCAST: { label: '播客', icon: <FileText className="size-4" /> },
};

type StatusFilter = 'all' | 'success' | 'failed' | 'pending';

/**
 * 发布历史页面
 *
 * 功能:
 * - 历史记录列表
 * - 按状态筛选
 * - 查看详情
 * - 删除记录
 */
export default function DesktopHistoryPage() {
  const isDesktop = useIsDesktop();
  const { history, loading, refresh } = useDesktopHistory();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [recordToDelete, setRecordToDelete] = useState<PublishHistory | null>(null);
  const [recordToView, setRecordToView] = useState<PublishHistory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // 过滤记录
  const filteredHistory =
    statusFilter === 'all' ? history : history.filter((h) => h.status === statusFilter);

  // 统计数据
  const stats = {
    total: history.length,
    success: history.filter((h) => h.status === 'success').length,
    failed: history.filter((h) => h.status === 'failed').length,
    pending: history.filter((h) => h.status === 'pending').length,
  };

  // 查看详情
  const handleViewDetail = (record: PublishHistory) => {
    setRecordToView(record);
    onDetailOpen();
  };

  // 确认删除
  const confirmDelete = (record: PublishHistory) => {
    setRecordToDelete(record);
    onDeleteOpen();
  };

  // 删除记录
  const handleDelete = async () => {
    if (!recordToDelete) return;

    const bridge = getDesktopBridge();
    if (!bridge) return;

    setIsDeleting(true);
    try {
      await bridge.history.delete(recordToDelete.id);
      onDeleteClose();
      refresh();
    } catch (error) {
      console.error('Failed to delete record:', error);
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };

  // 打开发布链接
  const handleOpenLink = (url: string) => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.app.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取状态配置
  const getStatusConfig = (status: PublishHistory['status']) => {
    switch (status) {
      case 'success':
        return {
          label: '成功',
          color: 'success' as const,
          icon: <CheckCircle className="size-4" />,
        };
      case 'failed':
        return { label: '失败', color: 'danger' as const, icon: <XCircle className="size-4" /> };
      case 'pending':
        return {
          label: '进行中',
          color: 'warning' as const,
          icon: <RefreshCw className="size-4 animate-spin" />,
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
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">发布历史</h1>
          <p className="text-muted-foreground">查看历史发布记录</p>
        </div>
        <Button
          variant="bordered"
          startContent={<RefreshCw className="size-4" />}
          onPress={refresh}
          isLoading={loading}>
          刷新
        </Button>
      </div>

      {/* 统计和筛选 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Chip
            variant={statusFilter === 'all' ? 'solid' : 'bordered'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('all')}>
            全部 ({stats.total})
          </Chip>
          <Chip
            variant={statusFilter === 'success' ? 'solid' : 'bordered'}
            color="success"
            className="cursor-pointer"
            onClick={() => setStatusFilter('success')}>
            成功 ({stats.success})
          </Chip>
          <Chip
            variant={statusFilter === 'failed' ? 'solid' : 'bordered'}
            color="danger"
            className="cursor-pointer"
            onClick={() => setStatusFilter('failed')}>
            失败 ({stats.failed})
          </Chip>
          {stats.pending > 0 && (
            <Chip
              variant={statusFilter === 'pending' ? 'solid' : 'bordered'}
              color="warning"
              className="cursor-pointer"
              onClick={() => setStatusFilter('pending')}>
              进行中 ({stats.pending})
            </Chip>
          )}
        </div>
      </div>

      {/* 历史列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <Card className="shadow-none border">
          <CardBody className="py-12">
            <div className="text-center space-y-2">
              <FileText className="size-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                {statusFilter === 'all' ? '还没有发布记录' : '没有符合条件的记录'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredHistory.map((record) => {
            const contentConfig = contentTypeConfig[record.contentType];
            const statusConfig = getStatusConfig(record.status);

            return (
              <Card
                key={record.id}
                className="shadow-none border">
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Chip
                          size="sm"
                          variant="flat"
                          startContent={contentConfig.icon}>
                          {contentConfig.label}
                        </Chip>
                        <Chip
                          size="sm"
                          color={statusConfig.color}
                          variant="flat"
                          startContent={statusConfig.icon}>
                          {statusConfig.label}
                        </Chip>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(record.publishedAt)}
                        </span>
                      </div>
                      <h3 className="font-medium truncate">{record.title || '无标题'}</h3>
                      <p className="text-sm text-muted-foreground">平台: {record.platform}</p>
                      {record.status === 'failed' && record.errorMessage && (
                        <p className="text-sm text-danger mt-1">{record.errorMessage}</p>
                      )}
                      {record.platformPostUrl && (
                        <Button
                          size="sm"
                          variant="light"
                          className="mt-2 -ml-2"
                          startContent={<ExternalLink className="size-3" />}
                          onPress={() => handleOpenLink(record.platformPostUrl!)}>
                          查看发布内容
                        </Button>
                      )}
                    </div>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        disabledKeys={record.platformPostUrl ? [] : ['open']}
                        onAction={(key) => {
                          switch (key) {
                            case 'detail':
                              handleViewDetail(record);
                              break;
                            case 'open':
                              if (record.platformPostUrl) {
                                handleOpenLink(record.platformPostUrl);
                              }
                              break;
                            case 'delete':
                              confirmDelete(record);
                              break;
                          }
                        }}>
                        <DropdownItem
                          key="detail"
                          startContent={<FileText className="size-4" />}>
                          查看详情
                        </DropdownItem>
                        <DropdownItem
                          key="open"
                          className={record.platformPostUrl ? '' : 'hidden'}
                          startContent={<ExternalLink className="size-4" />}>
                          打开链接
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={<Trash2 className="size-4" />}>
                          删除记录
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* 详情 Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={onDetailClose}
        size="2xl">
        <ModalContent>
          <ModalHeader>发布详情</ModalHeader>
          <ModalBody>
            {recordToView && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Chip
                    size="sm"
                    variant="flat"
                    startContent={contentTypeConfig[recordToView.contentType].icon}>
                    {contentTypeConfig[recordToView.contentType].label}
                  </Chip>
                  <Chip
                    size="sm"
                    color={getStatusConfig(recordToView.status).color}
                    variant="flat"
                    startContent={getStatusConfig(recordToView.status).icon}>
                    {getStatusConfig(recordToView.status).label}
                  </Chip>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">标题</label>
                  <p>{recordToView.title || '无标题'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">平台</label>
                  <p>{recordToView.platform}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">发布时间</label>
                  <p>{formatDate(recordToView.publishedAt)}</p>
                </div>

                {recordToView.platformPostUrl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">发布链接</label>
                    <p className="text-primary truncate">{recordToView.platformPostUrl}</p>
                  </div>
                )}

                {recordToView.errorMessage && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">错误信息</label>
                    <p className="text-danger">{recordToView.errorMessage}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">内容</label>
                  <p className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-lg max-h-48 overflow-auto">
                    {recordToView.content || '无内容'}
                  </p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={onDetailClose}>
              关闭
            </Button>
            {recordToView?.platformPostUrl && (
              <Button
                color="primary"
                startContent={<ExternalLink className="size-4" />}
                onPress={() => handleOpenLink(recordToView.platformPostUrl!)}>
                打开链接
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除确认 Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>确认删除</ModalHeader>
          <ModalBody>
            <p>确定要删除这条发布记录吗？此操作不可撤销。</p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={onDeleteClose}>
              取消
            </Button>
            <Button
              color="danger"
              onPress={handleDelete}
              isLoading={isDeleting}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
