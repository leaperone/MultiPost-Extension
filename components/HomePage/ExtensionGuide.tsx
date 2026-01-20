'use client';

import { Button, Spinner } from '@heroui/react';
import { RefreshCwIcon, PuzzleIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import { useTranslation } from '@/i18n/client';
import { LiquidGlassCard, LiquidGlassIconContainer } from '@/components/ui/liquid-glass';
import { cn } from '@/lib/utils';

interface ExtensionGuideProps {
  isLoading?: boolean;
  onRecheck?: () => void;
}

export function ExtensionGuide({ isLoading, onRecheck }: ExtensionGuideProps) {
  const { t } = useTranslation('home');

  if (isLoading) {
    return (
      <LiquidGlassCard className="mx-auto max-w-2xl p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <Spinner size="lg" />
          <p className="text-foreground/60">{t('homePublisher.extensionRequired.checking')}</p>
        </div>
      </LiquidGlassCard>
    );
  }

  return (
    <LiquidGlassCard className="mx-auto max-w-2xl p-8">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <LiquidGlassIconContainer
          size="lg"
          color="warning"
          className="mb-6">
          <PuzzleIcon className="size-10" />
        </LiquidGlassIconContainer>

        {/* Title & Description */}
        <h3 className="mb-3 text-2xl font-semibold text-foreground/90">
          {t('homePublisher.extensionRequired.title')}
        </h3>
        <p className="mb-8 max-w-md text-foreground/60">
          {t('homePublisher.extensionRequired.description')}
        </p>

        {/* Install Buttons */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <Button
            as="a"
            href="https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            color="primary"
            className="min-w-[200px]"
            startContent={
              <Icon
                icon="logos:chrome"
                className="size-5"
              />
            }>
            {t('homePublisher.extensionRequired.chromeStore')}
          </Button>
          <Button
            as="a"
            href="https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            variant="bordered"
            className="min-w-[200px]"
            startContent={
              <Icon
                icon="logos:microsoft-edge"
                className="size-5"
              />
            }>
            {t('homePublisher.extensionRequired.edgeStore')}
          </Button>
        </div>

        {/* Recheck Button */}
        {onRecheck && (
          <Button
            variant="light"
            size="sm"
            onPress={onRecheck}
            startContent={<RefreshCwIcon className="size-4" />}
            className="text-foreground/60">
            {t('homePublisher.extensionRequired.recheck')}
          </Button>
        )}

        {/* Features List */}
        <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
          {[
            { icon: '📤', text: t('homePublisher.extensionRequired.features.multiPlatform') },
            { icon: '🚀', text: t('homePublisher.extensionRequired.features.oneClick') },
            { icon: '🔒', text: t('homePublisher.extensionRequired.features.secure') },
          ].map((feature, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 rounded-xl p-3',
                'bg-white/5 dark:bg-white/5',
              )}>
              <span className="text-2xl">{feature.icon}</span>
              <span className="text-sm text-foreground/70">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </LiquidGlassCard>
  );
}
