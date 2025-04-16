'use client';

import { Button, Card, CardBody, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Coins, DollarSignIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/i18n/client';

import { recharge } from './action';
import { addToast } from '@heroui/react';

const RechargePage = () => {
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
    <div className="flex h-screen flex-col bg-gradient-to-b from-background to-background/80">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          {/* 充值选项 */}
          <div className="mb-12">
            <Card className="group relative overflow-hidden border-2 border-transparent bg-content1/50 transition-all duration-300 hover:scale-[1.02] hover:border-default hover:shadow-lg">
              <CardBody className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{t('title')}</h2>
                  </div>
                  <div className="rounded-full bg-default/10 p-2">
                    <Coins className="size-6 text-default-600" />
                  </div>
                </div>
                <div className="space-y-3">
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
                      className="min-w-[100px]"
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
                      startContent={
                        <Icon
                          icon="lucide:credit-card"
                          className="text-xl"
                        />
                      }>
                      {t('recharge')}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RechargePage;
