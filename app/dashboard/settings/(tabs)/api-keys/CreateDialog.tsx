import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, addToast } from '@heroui/react';
import { Copy } from 'lucide-react';
import { useTranslation } from '@/i18n/client';

interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
}

interface CreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDialog({ isOpen, onOpenChange, onSuccess }: CreateDialogProps) {
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
    } catch (error) {
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

      const newKey = await response.json();
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
                  <label htmlFor="api-key-name" className="text-sm font-medium">{t('create_dialog.name_label')}</label>
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
