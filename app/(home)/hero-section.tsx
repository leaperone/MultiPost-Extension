import { Button, Chip } from '@heroui/react';
import { cn } from '@/lib/utils';
import { CheckIcon, LayoutDashboardIcon } from 'lucide-react';
import Link from 'next/link';

import ScrollScreenChevronDown from '@/components/HomePage/ScrollScreenChevronDown';
import HeroSectionTextHover from './hero-section-text-hover';
import { createTranslation } from '@/i18n/server';

const ChromeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor">
    <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z" />
  </svg>
);

// InfoContainer Component
async function InfoContainer() {
  const { t } = await createTranslation('home');

  const UnderlinedWord = ({ text }: { text: string }) => (
    <span className="cursor-pointer underline decoration-blue-500 decoration-wavy dark:decoration-yellow-300">
      {text}
    </span>
  );

  const description = t('hero.description');
  const platformText = t('hero.platform');
  const [before, after] = description.split('all platforms');

  return (
    <div className="flex w-full flex-col items-center">
      <Chip
        size="lg"
        variant="flat"
        color="success"
        startContent={<CheckIcon />}>
        {t('hero.beta')}
      </Chip>
      <HeroSectionTextHover />
      <p className="mb-8 w-full max-w-2xl text-center text-lg leading-8 text-foreground-600">
        {before}
        <UnderlinedWord text={platformText} />
        {after}
      </p>
      <div className="flex justify-center gap-2">
        <Button
          as={Link}
          href="/publish"
          size="lg"
          startContent={<LayoutDashboardIcon />}
          className="bg-gradient-to-r from-blue-400 to-sky-300 text-white transition-opacity hover:opacity-90">
          {t('hero.buttons.post')}
        </Button>
        <Button
          as={Link}
          href="/extension"
          size="lg"
          startContent={<ChromeIcon />}
          className="bg-gradient-to-r from-purple-400 to-pink-300 text-white transition-opacity hover:opacity-90">
          {t('hero.buttons.install')}
        </Button>
      </div>
    </div>
  );
}

// HeroSection Component
async function HeroSection({ className }: { className?: string }) {
  return (
    <div className={cn('hero-container relative w-full bg-background', className)}>
      <div className="z-40 m-auto flex h-full min-h-[70vh] w-[90%] flex-col items-center justify-center bg-transparent">
        <InfoContainer />
      </div>
      <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 sm:bottom-8">
        <ScrollScreenChevronDown />
      </div>
    </div>
  );
}

export default HeroSection;
