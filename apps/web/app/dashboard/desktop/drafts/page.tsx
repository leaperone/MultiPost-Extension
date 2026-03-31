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
  Edit,
  FileText,
  Image,
  MoreHorizontal,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import {
  ContentType,
  Draft,
  getDesktopBridge,
  useDesktopDrafts,
  useIsDesktop,
} from '@/lib/desktop-bridge';

const contentTypeConfig: Record<
  ContentType,
  { label: string; icon: React.ReactNode; color: 'primary' | 'secondary' | 'success' | 'warning' }
> = {
  DYNAMIC: { label: '动态', icon: <Image className="size-4" />, color: 'primary' },
  VIDEO: { label: '视频', icon: <Video className="size-4" />, color: 'success' },
  ARTICLE: { label: '文章', icon: <FileText className="size-4" />, color: 'secondary' },
  PODCAST: { label: '播客', icon: <FileText className="size-4" />, color: 'warning' },
};

/**
 * 草稿管理页面
 *
 * 功能:
 * - 草稿列表
 * - 编辑草稿
 * - 删除草稿
 */
export default function DesktopDraftsPage() {
  const isDesktop = useIsDesktop();
  const { drafts, loading, refresh } = useDesktopDrafts();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState<ContentType | 'all'>('all');

  // 过滤草稿
  const filteredDrafts = filter === 'all' ? drafts : drafts.filter((d) => d.contentType === filter);

  // 编辑草稿
  const handleEdit = (draft: Draft) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    // 根据内容类型跳转到对应的发布页面
    const pathMap: Record<ContentType, string> = {
      DYNAMIC: '/dashboard/desktop/publish/dynamic',
      VIDEO: '/dashboard/desktop/publish/video',
      ARTICLE: '/dashboard/desktop/publish/article',
      PODCAST: '/dashboard/desktop/publish/dynamic', // Podcast 暂时用 dynamic
    };

    // TODO: 传递草稿 ID 到发布页面
    bridge.navigation.navigateTo(`${pathMap[draft.contentType]}?draft=${draft.id}`);
  };

  // 确认删除
  const confirmDelete = (draft: Draft) => {
    setDraftToDelete(draft);
    onDeleteOpen();
  };

  // 删除草稿
  const handleDelete = async () => {
    if (!draftToDelete) return;

    const bridge = getDesktopBridge();
    if (!bridge) return;

    setIsDeleting(true);
    try {
      await bridge.draft.delete(draftToDelete.id);
      onDeleteClose();
      refresh();
    } catch (error) {
      console.error('Failed to delete draft:', error);
    } finally {
      setIsDeleting(false);
      setDraftToDelete(null);
    }
  };

  // 新建草稿
  const handleNewDraft = (contentType: ContentType) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    const pathMap: Record<ContentType, string> = {
      DYNAMIC: '/dashboard/desktop/publish/dynamic',
      VIDEO: '/dashboard/desktop/publish/video',
      ARTICLE: '/dashboard/desktop/publish/article',
      PODCAST: '/dashboard/desktop/publish/dynamic',
    };

    bridge.navigation.navigateTo(pathMap[contentType]);
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
          <h1 className="text-2xl font-bold">草稿箱</h1>
          <p className="text-muted-foreground">管理你的草稿内容</p>
        </div>
        <Dropdown>
          <DropdownTrigger>
            <Button
              color="primary"
              startContent={<Plus className="size-4" />}>
              新建草稿
            </Button>
          </DropdownTrigger>
          <DropdownMenu>
            <DropdownItem
              key="dynamic"
              startContent={<Image className="size-4" />}
              onPress={() => handleNewDraft('DYNAMIC')}>
              动态
            </DropdownItem>
            <DropdownItem
              key="video"
              startContent={<Video className="size-4" />}
              onPress={() => handleNewDraft('VIDEO')}>
              视频
            </DropdownItem>
            <DropdownItem
              key="article"
              startContent={<FileText className="size-4" />}
              onPress={() => handleNewDraft('ARTICLE')}>
              文章
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2">
        <Chip
          variant={filter === 'all' ? 'solid' : 'bordered'}
          className="cursor-pointer"
          onClick={() => setFilter('all')}>
          全部 ({drafts.length})
        </Chip>
        {(Object.keys(contentTypeConfig) as ContentType[]).map((type) => {
          const config = contentTypeConfig[type];
          const count = drafts.filter((d) => d.contentType === type).length;
          if (count === 0) return null;
          return (
            <Chip
              key={type}
              variant={filter === type ? 'solid' : 'bordered'}
              color={config.color}
              className="cursor-pointer"
              onClick={() => setFilter(type)}>
              {config.label} ({count})
            </Chip>
          );
        })}
      </div>

      {/* 草稿列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredDrafts.length === 0 ? (
        <Card className="shadow-none border">
          <CardBody className="py-12">
            <div className="text-center space-y-2">
              <FileText className="size-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter === 'all' ? '还没有草稿' : `没有${contentTypeConfig[filter].label}草稿`}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredDrafts.map((draft) => {
            const config = contentTypeConfig[draft.contentType];
            return (
              <Card
                key={draft.id}
                className="shadow-none border">
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Chip
                          size="sm"
                          color={config.color}
                          variant="flat"
                          startContent={config.icon}>
                          {config.label}
                        </Chip>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(draft.updatedAt)}
                        </span>
                      </div>
                      <h3 className="font-medium truncate">{draft.title || '无标题'}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {draft.content || '暂无内容'}
                      </p>
                      {/* 显示附件信息 */}
                      <div className="flex items-center gap-2 mt-2">
                        {draft.images && draft.images.length > 0 && (
                          <Chip
                            size="sm"
                            variant="flat">
                            {draft.images.length} 张图片
                          </Chip>
                        )}
                        {draft.video && (
                          <Chip
                            size="sm"
                            variant="flat">
                            1 个视频
                          </Chip>
                        )}
                      </div>
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
                      <DropdownMenu>
                        <DropdownItem
                          key="edit"
                          startContent={<Edit className="size-4" />}
                          onPress={() => handleEdit(draft)}>
                          编辑
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={<Trash2 className="size-4" />}
                          onPress={() => confirmDelete(draft)}>
                          删除
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

      {/* 删除确认 Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>确认删除</ModalHeader>
          <ModalBody>
            <p>
              确定要删除草稿 <strong>{draftToDelete?.title || '无标题'}</strong> 吗？此操作不可撤销。
            </p>
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
