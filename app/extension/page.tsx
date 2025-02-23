'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/card';
import { Button, Link } from '@heroui/react';
import { PuzzleIcon, AlertCircleIcon, ArrowRight } from 'lucide-react';
import { Icon } from '@iconify/react';
import confetti from 'canvas-confetti';
import HomePageHeader from '@/components/HomePage/Header';
import { checkServiceStatus, openOptions } from '@/extension/common';
import { useTranslation } from '@/i18n/client';

const PinTip = () => {
  const { t } = useTranslation('extension');
  return (
    <div className="mt-8 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50/50 p-4 text-sm text-warning-800 dark:border-warning-800 dark:bg-warning-900/20 dark:text-warning-500">
      <Icon
        icon="solar:pin-bold"
        className="size-5 shrink-0"
      />
      <p>{t('pin_tip')}</p>
    </div>
  );
};

interface StatusCardProps {
  isInstalled: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({ isInstalled }) => {
  const { t } = useTranslation('extension');
  return (
    <Card className="mx-auto w-full max-w-2xl border border-border/50 bg-background/60 backdrop-blur-md dark:bg-background/60">
      <CardBody className="p-6">
        <div className="mb-4 flex items-center gap-2">
          {isInstalled ? (
            <PuzzleIcon className="size-5 text-primary" />
          ) : (
            <AlertCircleIcon className="size-5 text-warning" />
          )}
          <h4 className="text-lg font-medium">{isInstalled ? t('extension_ready') : t('extension_not_detected')}</h4>
        </div>

        {isInstalled ? (
          <>
            <p className="mb-6 text-foreground/80">{t('extension_ready_desc')}</p>
            <div className="flex justify-evenly gap-3">
              <Button
                onPress={() => openOptions()}
                startContent={<PuzzleIcon className="size-4" />}>
                {t('open_extension')}
              </Button>
              <Button
                as={Link}
                href="/publish"
                startContent={<ArrowRight className="size-4" />}>
                {t('start_publishing')}
              </Button>
            </div>
            <PinTip />
          </>
        ) : (
          <>
            <p className="mb-6 text-foreground/80">{t('extension_not_detected_desc')}</p>
            <div className="flex flex-col gap-3">
              <Button
                as={Link}
                href="https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih"
                target="_blank"
                color="primary"
                className="w-full">
                <Icon
                  icon="logos:chrome"
                  className="mr-2 size-5"
                />
                {t('chrome_store')}
              </Button>
              <Button
                as={Link}
                href="https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg"
                target="_blank"
                variant="bordered"
                className="w-full">
                <Icon
                  icon="logos:microsoft-edge"
                  className="mr-2 size-5"
                />
                {t('edge_store')}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

const ExtensionPage: React.FC = () => {
  const { t } = useTranslation('extension');

  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkExtension = async () => {
      const status = await checkServiceStatus();
      setIsInstalled(status);
      if (status) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#000000', '#666666'],
          disableForReducedMotion: true,
        });
      }
    };
    checkExtension();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="relative z-10">
        <HomePageHeader />
        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h1 className="mb-4 text-3xl font-semibold">{t('title')}</h1>
            <p className="text-foreground/80">{t('description')}</p>
          </div>
          <StatusCard isInstalled={isInstalled} />
        </main>
      </div>
    </div>
  );
};

export default ExtensionPage;
