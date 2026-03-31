import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { useTranslation } from '@/i18n/client';

interface DeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  apiKeyName: string;
  isLoading: boolean;
}

export function DeleteDialog({ isOpen, onOpenChange, onConfirm, apiKeyName, isLoading }: DeleteDialogProps) {
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
