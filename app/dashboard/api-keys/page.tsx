'use client';

import { useState, useEffect, ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Button,
  useDisclosure,
  addToast,
  Chip,
} from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CreateDialog } from './CreateDialog';
import { DeleteDialog } from './DeleteDialog';
import { useTranslation } from '@/i18n/client';

interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
}

export default function APIKeysPage() {
  const { t } = useTranslation('api-keys');
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onOpenChange: onCreateOpenChange } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<APIKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = [
    { key: 'name', label: t('table.columns.name') },
    { key: 'key', label: t('table.columns.key') },
    { key: 'createdAt', label: t('table.columns.created_at') },
    { key: 'actions', label: t('table.columns.actions') },
  ] as const;

  // 加载 API Keys
  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('加载失败');
      const data = await response.json();

      // 对 API Keys 进行排序，将 EXTENSION- 开头的放在后面
      const sortedData = [...data].sort((a, b) => {
        const isAExtension = a.name.startsWith('EXTENSION-');
        const isBExtension = b.name.startsWith('EXTENSION-');
        if (isAExtension && !isBExtension) return 1;
        if (!isAExtension && isBExtension) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setApiKeys(sortedData);
    } catch (error) {
      addToast({
        title: '加载失败',
        description: '请刷新页面重试',
        color: 'danger',
      });
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  // 删除 API Key
  const handleDeleteApiKey = async (apiKey: APIKey) => {
    setSelectedApiKey(apiKey);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!selectedApiKey) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/api-keys/${selectedApiKey.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      setApiKeys(apiKeys.filter((key) => key.id !== selectedApiKey.id));

      addToast({
        title: t('delete_dialog.success'),
        description: '',
        color: 'success',
      });
    } catch (error) {
      addToast({
        title: t('delete_dialog.failed'),
        description: '',
        color: 'danger',
      });
    } finally {
      setIsDeleting(false);
      setSelectedApiKey(null);
    }
  };

  const renderCell = (apiKey: APIKey, columnKey: string): ReactNode => {
    switch (columnKey) {
      case 'name':
        return (
          <div className="flex items-center gap-2">
            <span>{apiKey.name}</span>
            {apiKey.name.startsWith('EXTENSION-') && (
              <Chip
                size="sm"
                variant="flat"
                color="secondary"
                className="text-xs">
                {t('table.auto_created_label')}
              </Chip>
            )}
          </div>
        );
      case 'key':
        return <span className="font-mono">{apiKey.key}</span>;
      case 'createdAt':
        return formatDistanceToNow(new Date(apiKey.createdAt), {
          addSuffix: true,
          locale: zhCN,
        });
      case 'actions':
        return (
          <Button
            isIconOnly
            color="danger"
            variant="light"
            onPress={() => handleDeleteApiKey(apiKey)}>
            <Trash2 className="size-4" />
          </Button>
        );
      default:
        return String(apiKey[columnKey as keyof APIKey]);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('page.title')}</h1>
        <Button
          onPress={onCreateOpen}
          color="primary"
          endContent={<Plus className="size-4" />}>
          {t('page.create_button')}
        </Button>
      </div>

      <Table aria-label={t('page.title')}>
        <TableHeader>
          {columns.map((column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          ))}
        </TableHeader>
        <TableBody emptyContent={t('page.empty_message')}>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              {columns.map((column) => (
                <TableCell key={column.key}>{renderCell(apiKey, column.key)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateDialog
        isOpen={isCreateOpen}
        onOpenChange={onCreateOpenChange}
        onSuccess={() => {
          loadApiKeys();
        }}
      />

      <DeleteDialog
        isOpen={isDeleteOpen}
        onOpenChange={onDeleteOpenChange}
        onConfirm={confirmDelete}
        apiKeyName={selectedApiKey?.name ?? ''}
        isLoading={isDeleting}
      />
    </div>
  );
}
