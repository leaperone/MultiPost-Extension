import {
  addToast,
  Button,
  Card,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from '@heroui/react';
import { createFileRoute } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock, Copy, Key, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useTranslation } from '../../../../i18n/client';

interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

export const Route = createFileRoute('/dashboard/settings/_tabs/api-keys')({
  component: APIKeysPage,
});

function APIKeysPage() {
  const { t } = useTranslation('api-keys');
  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onOpenChange: onCreateOpenChange,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<APIKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = [
    { key: 'name', label: t('table.columns.name') },
    { key: 'key', label: t('table.columns.key') },
    { key: 'createdAt', label: t('table.columns.created_at') },
    { key: 'actions', label: t('table.columns.actions') },
  ] as const;

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to load');
      const data = (await response.json()) as APIKey[];

      const sortedData = [...data].sort((a, b) => {
        const isAExtension = a.name.startsWith('EXTENSION-');
        const isBExtension = b.name.startsWith('EXTENSION-');
        if (isAExtension && !isBExtension) return 1;
        if (!isAExtension && isBExtension) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setApiKeys(sortedData);
    } catch {
      addToast({
        title: t('page.load_error.title'),
        description: t('page.load_error.description'),
        color: 'danger',
      });
    }
  };

  useEffect(() => {
    void loadApiKeys();
  }, []);

  const handleDeleteApiKey = (apiKey: APIKey) => {
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
    } catch {
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
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('page.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('page.description')}</p>
        </div>
        <Button
          color="primary"
          onPress={onCreateOpen}>
          <Plus className="mr-2 size-4" />
          {t('page.create_button')}
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border p-5 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Key className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('stats.total_keys')}</p>
              <p className="text-2xl font-bold text-foreground">{apiKeys.length}</p>
            </div>
          </div>
        </Card>
        <Card className="border p-5 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('stats.manual_created')}</p>
              <p className="text-2xl font-bold text-foreground">
                {apiKeys.filter((key) => !key.name.startsWith('EXTENSION-')).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border p-5 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Key className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('stats.auto_created')}</p>
              <p className="text-2xl font-bold text-foreground">
                {apiKeys.filter((key) => key.name.startsWith('EXTENSION-')).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className={cn('overflow-hidden border p-0 shadow-none')}>
        <Table
          aria-label={t('page.title')}
          classNames={{
            wrapper: 'bg-transparent shadow-none',
            th: 'bg-default-100 text-foreground/80',
            td: 'text-foreground/90',
          }}>
          <TableHeader>
            {columns.map((column) => (
              <TableColumn key={column.key}>{column.label}</TableColumn>
            ))}
          </TableHeader>
          <TableBody emptyContent={t('page.empty_message')}>
            {apiKeys.map((apiKey) => (
              <TableRow
                key={apiKey.id}
                className="hover:bg-default-100">
                {columns.map((column) => (
                  <TableCell key={column.key}>{renderCell(apiKey, column.key)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <CreateDialog
        isOpen={isCreateOpen}
        onOpenChange={onCreateOpenChange}
        onSuccess={() => {
          void loadApiKeys();
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

function CreateDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation('api-keys');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<APIKey | null>(null);

  const handleCopy = async () => {
    if (!createdKey) return;

    try {
      await navigator.clipboard.writeText(createdKey.key);
      addToast({
        title: t('create_dialog.copy_success'),
        description: '',
        color: 'success',
      });
    } catch {
      addToast({
        title: t('create_dialog.copy_failed'),
        description: '',
        color: 'danger',
      });
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      addToast({
        title: t('create_dialog.name_required'),
        description: '',
        color: 'danger',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const newKey = (await response.json()) as APIKey;
      setCreatedKey(newKey);
      onSuccess();

      addToast({
        title: t('create_dialog.create_success'),
        description: '',
        color: 'success',
      });
    } catch (error) {
      addToast({
        title: t('create_dialog.create_failed'),
        description: error instanceof Error ? error.message : '',
        color: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setName('');
    setCreatedKey(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      placement="center"
      backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {createdKey ? t('create_dialog.save_title') : t('create_dialog.title')}
            </ModalHeader>
            <ModalBody>
              {createdKey ? (
                <div className="space-y-4">
                  <p className="text-sm text-default-500">{t('create_dialog.save_notice')}</p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('table.columns.key')}</label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={createdKey.key}
                        variant="bordered"
                        className="font-mono"
                      />
                      <Button
                        isIconOnly
                        color="primary"
                        variant="flat"
                        onPress={handleCopy}>
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="api-key-name"
                    className="text-sm font-medium">
                    {t('create_dialog.name_label')}
                  </label>
                  <Input
                    id="api-key-name"
                    value={name}
                    onValueChange={setName}
                    placeholder={t('create_dialog.name_placeholder')}
                    variant="bordered"
                    isDisabled={isLoading}
                    autoFocus
                  />
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              {createdKey ? (
                <Button
                  color="primary"
                  onPress={onClose}>
                  {t('create_dialog.buttons.done')}
                </Button>
              ) : (
                <>
                  <Button
                    variant="light"
                    onPress={onClose}
                    isDisabled={isLoading}>
                    {t('create_dialog.buttons.cancel')}
                  </Button>
                  <Button
                    color="primary"
                    onPress={handleSubmit}
                    isLoading={isLoading}>
                    {t('create_dialog.buttons.create')}
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function DeleteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  apiKeyName,
  isLoading,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  apiKeyName: string;
  isLoading: boolean;
}) {
  const { t } = useTranslation('api-keys');

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">{t('delete_dialog.title')}</ModalHeader>
            <ModalBody>
              <p>{t('delete_dialog.message', { name: apiKeyName })}</p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={isLoading}>
                {t('delete_dialog.buttons.cancel')}
              </Button>
              <Button
                color="danger"
                onPress={async () => {
                  await onConfirm();
                  onClose();
                }}
                isLoading={isLoading}>
                {t('delete_dialog.buttons.confirm')}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
