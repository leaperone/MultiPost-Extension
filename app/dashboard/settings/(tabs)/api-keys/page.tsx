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
  Card,
  CardHeader,
  CardBody,
} from '@heroui/react';
import { Plus, Trash2, Key, Clock } from 'lucide-react';
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
      if (!response.ok) throw new Error('Failed to load');
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
        title: t('page.load_error.title'),
        description: t('page.load_error.description'),
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

      if (!response.ok) throw new Error('Failed to delete');

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
            onPress={() => handleDeleteApiKey(apiKey)}
            className="shadow-none">
            <Trash2 className="size-4" />
          </Button>
        );
      default:
        return String(apiKey[columnKey as keyof APIKey]);
    }
  };

  return (
    <div className="size-full overflow-y-auto p-6">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('page.title')}</h1>
          <p className="mt-2 text-foreground/60">{t('page.description')}</p>
        </div>
        <Button
          onPress={onCreateOpen}
          color="primary"
          startContent={<Plus className="size-4" />}
          className="border border-primary/20 shadow-none">
          {t('page.create_button')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Key className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground/60">{t('stats.total_keys', { ns: 'settings' })}</p>
                <p className="text-2xl font-bold text-foreground">{apiKeys.length}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10">
                <Clock className="size-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-foreground/60">{t('stats.manual_created', { ns: 'settings' })}</p>
                <p className="text-2xl font-bold text-foreground">
                  {apiKeys.filter((key) => !key.name.startsWith('EXTENSION-')).length}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-warning/10">
                <Key className="size-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-foreground/60">{t('stats.auto_created', { ns: 'settings' })}</p>
                <p className="text-2xl font-bold text-foreground">
                  {apiKeys.filter((key) => key.name.startsWith('EXTENSION-')).length}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* API Keys Table */}
      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-0">
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
        </CardBody>
      </Card>

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
