'use client';

import { Button, Card, CardBody, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Coins, DollarSignIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/i18n/client';
import { recharge } from '../action';
import { addToast } from '@heroui/react';

const QUICK_AMOUNTS = [10, 20, 50, 100];

export default function RechargeForm() {
  const [customAmount, setCustomAmount] = useState('');
  const { t } = useTranslation('recharge');

  const handleRecharge = async (price: number) => {
    if (!price) {
      addToast({
        title: t('toast.empty'),
      });
      return;
    }

    const result = await recharge(price, window.location.origin + '/dashboard/recharge');

    if (result.success) {
      addToast({
        title: t('toast.success', { amount: price }),
      });
      if ('result' in result && result.result) {
        window.location.href = result.result;
      }
    } else {
      addToast({
        title: t('toast.fail'),
        description: result.error,
      });
    }
  };

  return (
    <>
      {/* 充值选项 */}
      <Card className="border-2 border-transparent bg-content1/50">
        <CardBody className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">{t('title')}</h2>
            <div className="rounded-full bg-default/10 p-2">
              <Coins className="size-6 text-default-600" />
            </div>
          </div>
          <div className="space-y-4">
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

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={10}
                placeholder={t('placeholder')}
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
                      title: t('toast.min'),
                    });
                    return;
                  }
                  handleRecharge(amount);
                }}
                startContent={<Icon icon="lucide:credit-card" />}>
                {t('recharge')}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
