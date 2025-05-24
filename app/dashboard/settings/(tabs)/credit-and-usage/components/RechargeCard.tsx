'use client';

import { Button, Card, CardBody, CardFooter, NumberInput, Tooltip } from '@heroui/react';
import { DollarSignIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useTranslation } from '@/i18n/client';
import { recharge } from '../action';
import { addToast } from '@heroui/react';

const QUICK_AMOUNTS = [10, 20, 50, 100];

export default function RechargeCard() {
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
    <Card className="flex flex-col gap-4 border border-default-200 shadow-none">
      <CardBody className="flex w-full flex-row items-center gap-6">
        <NumberInput
          min={1}
          placeholder={t('recharge.placeholder')}
          size="lg"
          fullWidth
          startContent={<DollarSignIcon />}
          value={Number(customAmount)}
          onValueChange={(value) => setCustomAmount(value.toString())}
        />
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant="flat"
              size="sm"
              onPress={() => {
                setCustomAmount(amount.toString());
              }}
              className="mx-2">
              ${amount}
            </Button>
          ))}
        </div>
      </CardBody>
      <CardFooter className="flex flex-row justify-between gap-4">
        <Tooltip content={t('recharge.rate')}>
          <Button
            fullWidth
            isDisabled={Number(customAmount) < 1}
            size="lg"
            color="primary"
            onPress={() => handleRecharge(Number(customAmount), 'alipay')}
            className="border border-primary/20 shadow-none"
            startContent={
              <Icon
                icon="simple-icons:alipay"
                className="size-6"
              />
            }>
            {t('recharge.payment_methods.alipay')}
          </Button>
        </Tooltip>
        <Button
          fullWidth
          isDisabled={Number(customAmount) < 10}
          size="lg"
          color="secondary"
          onPress={() => handleRecharge(Number(customAmount), 'stripe')}
          className="border border-secondary/20 shadow-none"
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
      </CardFooter>
    </Card>
  );
}
