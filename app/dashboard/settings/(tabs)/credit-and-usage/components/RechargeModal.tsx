'use client';

import {
  Alert,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Input,
  Spacer,
} from '@heroui/react';
import { ExternalLinkIcon, DollarSignIcon, CoinsIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useTranslation } from '@/i18n/client';
import { recharge } from '../action';
import { addToast } from '@heroui/react';

const QUICK_AMOUNTS = [10, 20, 50, 100];

export default function RechargeModal() {
  const { isOpen, onOpenChange } = useDisclosure();
  const [customAmount, setCustomAmount] = useState('');
  const { t } = useTranslation('settings');

  const handleRecharge = async (price: number) => {
    if (!price) {
      addToast({
        title: t('recharge.toast.empty'),
      });
      return;
    }

    const result = await recharge(price, window.location.origin + '/dashboard/recharge');

    if (result.success) {
      addToast({
        title: t('recharge.toast.success', { amount: price }),
      });
      if ('result' in result && result.result) {
        window.location.href = result.result;
      }
    } else {
      addToast({
        title: t('recharge.toast.fail'),
        description: result.error,
      });
    }
  };

  return (
    <>
      <Button
        color="primary"
        size="lg"
        startContent={<CoinsIcon />}
        onPress={onOpenChange}>
        {t('recharge.button')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">{t('recharge.title')}</ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <Alert
                color="primary"
                endContent={
                  <Button
                    variant="flat"
                    color="primary"
                    size="sm"
                    as="a"
                    href="https://docs.multipost.app/docs/user-guide/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    endContent={<ExternalLinkIcon className="size-4" />}>
                    {t('recharge.details')}
                  </Button>
                }>
                {t('recharge.rate')}
              </Alert>

              <Alert color="warning">{t('recharge.alipay_only')}</Alert>
            </div>

            <Spacer y={4} />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={10}
                  placeholder={t('recharge.placeholder')}
                  size="md"
                  startContent={<DollarSignIcon />}
                  value={customAmount}
                  onValueChange={setCustomAmount}
                />
                <Button
                  size="md"
                  className="min-w-fit"
                  onPress={() => {
                    const amount = Number(customAmount);
                    if (amount < 10) {
                      addToast({
                        title: t('recharge.toast.min'),
                      });
                      return;
                    }
                    handleRecharge(amount);
                  }}
                  startContent={<Icon icon="lucide:credit-card" />}>
                  {t('recharge.button')}
                </Button>
              </div>

              {/* 快速充值金额 */}
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant="flat"
                    color="primary"
                    size="sm"
                    onPress={() => {
                      setCustomAmount(amount.toString());
                    }}>
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
