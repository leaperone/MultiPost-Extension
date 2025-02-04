'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/card';
import { Button, Link } from '@heroui/react';
import { PuzzleIcon, AlertCircleIcon, ArrowRight } from 'lucide-react';
import { Icon } from '@iconify/react';
import confetti from 'canvas-confetti';
import HomePageHeader from '@/components/HomePage/Header';
import { checkServiceStatus, openOptions } from '@/extension/common';

const PinTip = () => (
  <div className="mt-8 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50/50 p-4 text-sm text-warning-800 dark:border-warning-800 dark:bg-warning-900/20 dark:text-warning-500">
    <Icon
      icon="solar:pin-bold"
      className="size-5 flex-shrink-0"
    />
    <p>
      After installation, click the puzzle icon in your browser&apos;s toolbar, then click the pin icon next to
      MultiPost to keep it easily accessible.
    </p>
  </div>
);

interface StatusCardProps {
  isInstalled: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({ isInstalled }) => (
  <Card className="w-full max-w-2xl mx-auto bg-background/60 dark:bg-background/60 backdrop-blur-md border border-border/50">
    <CardBody className="p-6">
      <div className="flex items-center gap-2 mb-4">
        {isInstalled ? (
          <PuzzleIcon className="size-5 text-primary" />
        ) : (
          <AlertCircleIcon className="size-5 text-warning" />
        )}
        <h4 className="text-lg font-medium">{isInstalled ? 'Extension is Ready!' : 'Extension Not Detected'}</h4>
      </div>

      {isInstalled ? (
        <>
          <p className="text-foreground/80 mb-6">Your MultiPost extension is installed and ready to use.</p>
          <div className="flex gap-3 justify-evenly">
            <Button
              onPress={() => openOptions()}
              startContent={<PuzzleIcon className="size-4" />}>
              Open Extension
            </Button>
            <Button
              as={Link}
              href="/publish"
              startContent={<ArrowRight className="size-4" />}>
              Start Publishing
            </Button>
          </div>
          <PinTip />
        </>
      ) : (
        <>
          <p className="text-foreground/80 mb-6">
            To use all features of MultiPost, please install our browser extension.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              as={Link}
              href="https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih"
              target="_blank"
              color="primary"
              className="w-full">
              <Icon
                icon="logos:chrome"
                className="size-5 mr-2"
              />
              Chrome Store
            </Button>
            <Button
              as={Link}
              href="https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg"
              target="_blank"
              variant="bordered"
              className="w-full">
              <Icon
                icon="logos:microsoft-edge"
                className="size-5 mr-2"
              />
              Edge Store
            </Button>
          </div>
        </>
      )}
    </CardBody>
  </Card>
);

const ExtensionPage: React.FC = () => {
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
          <div className="max-w-2xl mx-auto mb-12 text-center">
            <h1 className="text-3xl font-semibold mb-4">MultiPost Extension</h1>
            <p className="text-foreground/80">
              Our extension provides enhanced features for a richer MultiPost experience.
            </p>
          </div>
          <StatusCard isInstalled={isInstalled} />
        </main>
      </div>
    </div>
  );
};

export default ExtensionPage;
