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

  const handleRecharge = async (price: number, paymentType: 'alipay' | 'stripe') => {
    if (!price || price < 1) {
      addToast({
        title: t('recharge.toast.min'),
      });
      return;
    }

    const result = await recharge(price, window.location.origin + '/dashboard/recharge', paymentType);

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
            </div>

            <Spacer y={4} />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder={t('recharge.placeholder')}
                  size="md"
                  startContent={<DollarSignIcon />}
                  value={customAmount}
                  onValueChange={setCustomAmount}
                />
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

              {/* New Payment Method Buttons */}
              <Spacer y={4} />
              <p className="mb-2 font-medium">{t('recharge.payment_method')}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  fullWidth
                  color="primary"
                  onPress={() => handleRecharge(Number(customAmount), 'alipay')}
                  startContent={
                    <Icon
                      icon="simple-icons:alipay"
                      className="size-6"
                    />
                  }>
                  {t('recharge.payment_methods.alipay')}
                </Button>
                <Button
                  fullWidth
                  color="secondary"
                  onPress={() => handleRecharge(Number(customAmount), 'stripe')}
                  startContent={
                    <span className="flex size-6 items-center justify-center rounded-md bg-white p-0.5 shadow-sm">
                      <Icon
                        icon="logos:stripe"
                        className="size-5"
                      />
                    </span>
                  }>
                  {t('recharge.payment_methods.stripe')}
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
