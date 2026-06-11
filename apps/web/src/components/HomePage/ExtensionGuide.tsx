'use client';

import { Button } from '@heroui/react';
import { RefreshCwIcon, ArrowRightIcon, CheckIcon, MonitorIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

import { useTranslation } from '@/i18n/client';

interface ExtensionGuideProps {
  isLoading?: boolean;
  onRecheck?: () => void;
}

// Core platform icons - only show the most recognizable ones
const platformIcons = [
  { icon: 'arcticons:xiaohongshu-rednote', name: '小红书', color: '#FF2442' },
  { icon: 'ri:weibo-fill', name: '微博', color: '#E6162D' },
  { icon: 'logos:twitter', name: 'X/Twitter' },
  { icon: 'ri:bilibili-fill', name: 'B站', color: '#00A1D6' },
  { icon: 'logos:linkedin-icon', name: 'LinkedIn' },
];

export function ExtensionGuide({ isLoading, onRecheck }: ExtensionGuideProps) {
  const { t } = useTranslation('home');

  return (
    <div className="mx-auto max-w-2xl text-center">
      {/* Hero Title - Pain point question */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
        {t('homePublisher.hero.title')}
      </motion.h1>

      {/* Subtitle - Solution */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto mb-8 max-w-lg text-lg text-foreground/70">
        {t('homePublisher.hero.subtitle')}
      </motion.p>

      {/* Platform Icons - Compact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8 flex items-center justify-center gap-3">
        {platformIcons.map((platform, i) => (
          <div
            key={i}
            className="flex size-10 items-center justify-center rounded-xl bg-white/10 transition-transform hover:scale-110 dark:bg-white/5"
            title={platform.name}>
            <Icon
              icon={platform.icon}
              className="size-5"
              style={platform.color ? { color: platform.color } : undefined}
            />
          </div>
        ))}
        <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-sm font-medium text-foreground/60 dark:bg-white/5">
          +8
        </div>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button
          as="a"
          href="/install"
          size="lg"
          color="primary"
          className="min-w-[200px]"
          endContent={<ArrowRightIcon className="size-4" />}
          startContent={<MonitorIcon className="size-5" />}>
          {t('finalCta.desktop')}
        </Button>
        <Button
          as="a"
          href="https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih"
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          variant="bordered"
          className="min-w-[200px]"
          startContent={<Icon icon="logos:chrome" className="size-5" />}>
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
          startContent={<Icon icon="logos:microsoft-edge" className="size-5" />}>
          {t('homePublisher.extensionRequired.edgeStore')}
        </Button>
      </motion.div>

      {/* Trust Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mb-4 flex flex-wrap items-center justify-center gap-4 text-sm text-foreground/60">
        <span className="flex items-center gap-1.5">
          <CheckIcon className="size-4 text-green-500" />
          {t('hero.trust.free')}
        </span>
        <span className="flex items-center gap-1.5">
          <CheckIcon className="size-4 text-green-500" />
          {t('hero.trust.opensource')}
        </span>
        <span className="flex items-center gap-1.5">
          <CheckIcon className="size-4 text-green-500" />
          {t('hero.trust.no_password')}
        </span>
      </motion.div>

      {/* Recheck Button - with loading state */}
      {onRecheck && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}>
          <Button
            variant="light"
            size="sm"
            onPress={onRecheck}
            isLoading={isLoading}
            isDisabled={isLoading}
            startContent={!isLoading ? <RefreshCwIcon className="size-4" /> : undefined}
            className="text-foreground/50 hover:text-foreground/70">
            {isLoading
              ? t('homePublisher.extensionRequired.checking')
              : t('homePublisher.extensionRequired.recheck')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
