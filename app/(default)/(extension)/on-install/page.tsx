'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pin, Globe, Share2, PuzzleIcon } from 'lucide-react';
import Link from 'next/link';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';
import { useTranslation } from '@/i18n/client';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function OnInstallPage() {
  const { t } = useTranslation('install');

  return (
    <BackgroundGradientAnimation
      gradientBackgroundStart="rgb(0, 0, 0)"
      gradientBackgroundEnd="rgb(0, 0, 0)"
      firstColor="18, 113, 255"
      secondColor="221, 74, 255"
      thirdColor="100, 220, 255"
      fourthColor="200, 50, 50"
      fifthColor="180, 180, 50"
      pointerColor="140, 100, 255"
      size="80%"
      blendingValue="hard-light"
      className="min-h-screen dark">
      {/* Extension Instructions */}
      <div className="fixed right-4 top-20">
        <div className="relative w-[280px] overflow-hidden rounded-xl bg-gradient-to-br from-blue-600/90 to-purple-600/90 p-4 shadow-2xl">
          {/* Top Arrow */}
          <div className="absolute -top-2 right-6 size-4 -translate-y-1/2 rotate-45 bg-gradient-to-br from-blue-600 to-purple-600" />

          {/* Corner Arrow */}
          <div className="absolute right-4 top-4 flex size-4 items-center justify-center">
            <div className="relative size-2 rotate-45 border-r border-t border-blue-200/60" />
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-purple-400/30 backdrop-blur" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-3">
              <PuzzleIcon className="text-blue-200" />
              <p className="text-sm font-medium text-blue-50">{t('instructions.step1')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Pin className="text-blue-200" />
              <p className="text-sm font-medium text-blue-50">{t('instructions.step2')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl space-y-8 pt-20">
        {/* Header */}
        <div className="space-y-4 text-center">
          <h1 className="bg-gradient-to-r from-blue-400 via-blue-200 to-purple-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            {t('title')}
          </h1>
          <p className="text-gray-300">{t('subtitle')}</p>
        </div>

        {/* Main Features */}
        <Card className="border-border/40 bg-card/30 p-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Share2 className="size-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{t('features.multiPlatform.title')}</h3>
                <p className="text-sm text-gray-300">{t('features.multiPlatform.description')}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Globe className="size-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{t('features.noLogin.title')}</h3>
                <p className="text-sm text-gray-300">{t('features.noLogin.description')}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Pin className="size-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{t('features.integration.title')}</h3>
                <p className="text-sm text-gray-300">{t('features.integration.description')}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <Link href="/extension">
            <Button
              size="lg"
              variant="default"
              className="bg-gradient-to-r from-blue-500 to-purple-500 font-semibold transition-all hover:from-blue-600 hover:to-purple-600">
              {t('cta')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="w-28 rounded-lg bg-card/30 p-1 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <LanguageSwitcher />
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}
