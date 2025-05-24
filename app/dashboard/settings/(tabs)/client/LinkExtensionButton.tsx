'use client';

import { addToast, Button } from '@heroui/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { LinkIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useTranslation } from '@/i18n/client';

export default function LinkButton() {
  const { t } = useTranslation('publish');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const handleLink = async () => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `EXTENSION-${nanoid(8)}` }),
      });
      const apiKey = await response.json();
      const { linkExtensionClient } = await import('@/lib/extension');
      const result = await linkExtensionClient(apiKey.key);
      if (result.confirm) {
        window.location.reload();
      } else {
        addToast({
          title: t('client.link_button.toast.error.title'),
          description: t('client.link_button.toast.error.description'),
          color: 'danger',
        });
      }
    } catch (error) {
      console.error('Link failed:', error);
    }
  };

  return (
    <>
      <Button
        onPress={onOpen}
        variant="bordered"
        size="sm"
        className="border border-default-200 shadow-none">
        <LinkIcon className="mr-2 size-4" />
        {t('client.link_button.button')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{t('client.link_button.modal.title')}</ModalHeader>
              <ModalBody>
                <p>{t('client.link_button.modal.description')}</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>{t('client.link_button.modal.notes.credential')}</li>
                  <li>{t('client.link_button.modal.notes.delete')}</li>
                  <li>
                    {t('client.link_button.modal.notes.manage', {
                      link: (
                        <Link
                          href="/dashboard/api-keys"
                          className="text-primary underline">
                          {t('client.link_button.modal.notes.manage_link')}
                        </Link>
                      ),
                    })}
                  </li>
                </ul>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  className="shadow-none">
                  {t('client.link_button.modal.buttons.cancel')}
                </Button>
                <Button
                  color="primary"
                  onPress={handleLink}
                  className="border border-primary/20 shadow-none">
                  {t('client.link_button.modal.buttons.confirm')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
