'use client';

import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { useTranslation } from '@/i18n/client';
import { useState, useEffect } from 'react';
import { InfoIcon } from 'lucide-react';

export default function RechargeActivityModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation('dashboard');

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const onClose = () => setIsOpen(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{t('recharge.activity.title')}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* 充值说明 */}
            <div className="rounded-lg border border-default-100 bg-default-50/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <InfoIcon className="size-5 text-default-600" />
                <h3 className="font-medium text-default-600">{t('recharge.activity.minAmount')}</h3>
              </div>
              <p className="text-sm text-default-600">{t('recharge.activity.minAmountDesc')}</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            onPress={onClose}>
            {t('common.close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
