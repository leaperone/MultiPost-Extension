'use client';

import { Button, Card, CardBody, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Coins } from 'lucide-react';
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
        title: t('toast.enter_amount'),
      });
      return;
    }

    const result = await recharge(price, window.location.origin + '/dashboard/recharge');

    if (result.success) {
      addToast({
        title: t('toast.order_success'),
        description: t('toast.recharge_amount', { amount: price }),
      });
      if ('result' in result && result.result) {
        window.location.href = result.result;
      }
    } else {
      addToast({
        title: t('toast.order_failed'),
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
                    <h2 className="text-xl font-bold">{t('custom_recharge.title')}</h2>
                    <p className="mt-0.5 text-sm text-default-600">{t('custom_recharge.subtitle')}</p>
                  </div>
                  {/* <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      as={Link}
                      href="/pricing"
                      variant="light"
                      size="md"
                      startContent={
                        <Icon
                          icon="lucide:info"
                          className="text-xl"
                        />
                      }>
                      {t('view_pricing')}
                    </Button>
                  </div> */}
                  <div className="rounded-full bg-default/10 p-2">
                    <Coins className="size-6 text-default-600" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={10}
                      placeholder={t('input.placeholder')}
                      size="md"
                      startContent={
                        <div className="pointer-events-none flex items-center">
                          <span className="text-default-400">Credit</span>
                        </div>
                      }
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
                            title: t('toast.minimum_amount'),
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
                      {t('recharge_now')}
                    </Button>
                  </div>
                  {/* <div className="flex gap-2">
                    <Button
                      size="md"
                      variant="flat"
                      className="flex-1"
                      onPress={() => {
                        setCustomAmount('138');
                      }}
                      startContent={<Coins className="size-4" />}>
                      充值138元 送60元
                    </Button>
                    <Button
                      size="md"
                      variant="flat"
                      color="secondary"
                      className="flex-1"
                      onPress={() => {
                        setCustomAmount('365');
                      }}
                      startContent={<Coins className="size-4" />}>
                      充值365元 送365元
                    </Button>
                  </div> */}
                </div>
                <div className="mt-3 text-xs text-default-400">{t('minimum_amount_notice')}</div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RechargePage;
