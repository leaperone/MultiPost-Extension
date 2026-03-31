'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/card';
import { Alert, Button, Link, Spacer } from '@heroui/react';
import { PuzzleIcon, AlertCircleIcon, ArrowRightIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import confetti from 'canvas-confetti';
import { checkServiceStatus } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';

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
            {isInstalled && (
              <Alert
                variant="flat"
                color="warning"
                icon={
                  <Icon
                    icon="solar:pin-bold"
                    className="size-4 shrink-0"
                  />
                }>
                {t('pin_tip')}
              </Alert>
            )}
            <Spacer y={4} />
            <Link href="/dashboard/publish">
              <Button
                size="lg"
                startContent={<ArrowRightIcon className="size-4" />}>
                {t('start_publishing')}
              </Button>
            </Link>
          </>
        ) : (
          <>
            <div className="flex gap-3">
              <Link
                href="https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih"
                target="_blank"
                className="w-full">
                <Button
                  color="primary"
                  className="w-full">
                  <Icon
                    icon="logos:chrome"
                    className="mr-2 size-5"
                  />
                  {t('chrome_store')}
                </Button>
              </Link>
              <Link
                href="https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg"
                target="_blank"
                className="w-full">
                <Button
                  variant="bordered"
                  className="w-full">
                  <Icon
                    icon="logos:microsoft-edge"
                    className="mr-2 size-5"
                  />
                  {t('edge_store')}
                </Button>
              </Link>
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
        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h1 className="mb-4 text-3xl font-semibold">{t('title')}</h1>
          </div>
          <StatusCard isInstalled={isInstalled} />
        </main>
      </div>
    </div>
  );
};

export default ExtensionPage;
