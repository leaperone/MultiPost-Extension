'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, useDisclosure, ModalContent } from '@heroui/react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { deleteClient } from './actions';

interface DeleteClientButtonProps {
  clientId: string;
}

export default function DeleteClientButton({ clientId }: DeleteClientButtonProps) {
  const { t } = useTranslation('publish');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteClient(clientId);
      toast.success(t('client.delete_button.toast.success'));
      onOpenChange(); // Close the modal
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`${t('client.delete_button.toast.error.title')}: ${errorMessage}`);
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        color="danger"
        variant="bordered"
        onPress={onOpen}>
        <Trash2 className="mr-2 size-4" />
        {t('client.delete_button.button')}
      </Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t('client.delete_button.modal.title')}</ModalHeader>
              <ModalBody>
                <p className="text-sm text-foreground/70">{t('client.delete_button.modal.description')}</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="bordered"
                  onPress={onClose}
                  disabled={isDeleting}>
                  {t('client.delete_button.modal.buttons.cancel')}
                </Button>
                <Button
                  color="danger"
                  onPress={handleDelete}
                  disabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t('client.delete_button.modal.buttons.confirm')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
