'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure, Input } from '@heroui/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/i18n/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function EditNameButton({ clientId, initialName }: { clientId: string; initialName: string }) {
  const { t } = useTranslation('publish');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [name, setName] = useState(initialName);
  const router = useRouter();

  const handleEdit = async () => {
    try {
      const response = await fetch('/api/extension/client', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId, name }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('client.edit_button.toast.success'));
        onOpenChange();
        router.refresh();
      } else {
        toast.error(`${t('client.edit_button.toast.error.title')}: ${t('client.edit_button.toast.error.description')}`);
      }
    } catch (error) {
      toast.error(`${t('client.edit_button.toast.error.title')}: ${t('client.edit_button.toast.error.description')}`);
    }
  };

  return (
    <>
      <Button
        onPress={onOpen}
        variant="bordered"
        className="border border-default-200 shadow-none">
        <Pencil className="mr-2 size-4" />
        {t('client.edit_button.button')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{t('client.edit_button.modal.title')}</ModalHeader>
              <ModalBody>
                <Input
                  label={t('client.edit_button.modal.name_label')}
                  placeholder={t('client.edit_button.modal.name_placeholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  className="shadow-none">
                  {t('client.edit_button.modal.buttons.cancel')}
                </Button>
                <Button
                  color="primary"
                  onPress={handleEdit}
                  className="border border-primary/20 shadow-none">
                  {t('client.edit_button.modal.buttons.save')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
