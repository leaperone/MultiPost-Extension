import { Button, Link, Image } from '@heroui/react';
import { Sparkles, Box, Settings, Send, CheckCircle, Share2Icon, VideoIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { BackgroundLines } from '@/components/background-lines';

import ScrollScreenChevronDown from '@/components/HomePage/ScrollScreenChevronDown';
import { createTranslation } from '@/i18n/server';
import { auth } from '@/auth';
import SocialShareNotifications from '@/components/HomePage/SocialShareNotifications';
import { LiquidGlassMotionCard, LiquidGlassCard, LiquidGlassIconContainer, glassBaseStyles } from '@/components/ui/liquid-glass';
import { SocialProof } from '@/components/HomePage/SocialProof';
import { FeatureAnnouncementBanner } from '@/components/HomePage/FeatureAnnouncementBanner';
import packageJson from '../../../package.json';

export const metadata = {
  title: 'MultiPost - Open Source Social Media Publishing Tool',
  description:
    'MultiPost is an open-source browser extension that helps you publish content to multiple social media platforms with one click. It supports various content formats including short videos and blog posts, offering web content extraction, search engine interfaces, and social media data analysis features to enhance your social media presence.',
};

interface TranslationFunction {
  (key: string): string;
  (key: string, options: { returnObjects: boolean }): string | Record<string, unknown>;
}

interface HeroSectionProps {
  t: TranslationFunction;
  className?: string;
  announcement?: {
    text: string;
    cta: string;
  };
}

function HeroSection({ t, className, announcement }: HeroSectionProps) {
  const description = t('hero.description');

  const features = [
    {
      text: t('hero.features.draft'),
      hoverColor: 'text-sky-400',
      emojis: [
        {
          emoji: '✍️',
          position: '-left-20 -top-3 group-hover:-rotate-[20deg] group-hover:-translate-y-12 md:-left-28 md:-top-2',
        },
        {
          emoji: '📝',
          position:
            '-left-[72px] top-0 group-hover:-rotate-[30deg] group-hover:-translate-x-10 group-hover:-translate-y-8 md:-left-[135px] md:-top-2',
        },
        {
          emoji: '✨',
          position: '-left-12 -top-8 group-hover:rotate-[25deg] group-hover:-translate-y-16 group-hover:translate-x-6',
        },
      ],
    },
    {
      text: t('hero.features.post'),
      hoverColor: 'text-orange-400',
      emojis: [
        {
          emoji: '📤',
          position:
            '-left-[100px] -top-7 group-hover:-rotate-[30deg] group-hover:-translate-y-14 md:-left-6 md:-top-16',
        },
        {
          emoji: '🚀',
          position:
            'left-32 -top-12 group-hover:rotate-[-10deg] group-hover:-translate-y-10 group-hover:translate-x-8 md:left-[200px]',
        },
        {
          emoji: '✨',
          position:
            '-left-16 -top-2 group-hover:-rotate-[20deg] group-hover:-translate-y-20 group-hover:-translate-x-6',
        },
      ],
    },
  ];

  return (
    <BackgroundLines className={cn('relative w-full min-h-screen', className)}>
      <div className="z-40 m-auto flex min-h-screen w-[90%] flex-col items-center justify-center py-20">
        <div className="flex w-full flex-col items-center">
          {/* TODO: Remove FeatureAnnouncementBanner after 2026-03 */}
          {announcement && (
            <div className="mb-6">
              <FeatureAnnouncementBanner text={announcement.text} cta={announcement.cta} />
            </div>
          )}

          {/* 特性文本展示 - 修改样式 */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 p-4 text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative flex items-center transition-all duration-300 hover:scale-105">
                <span
                  className={cn('text-foreground transition-colors duration-300', `group-hover:${feature.hoverColor}`)}>
                  {feature.text}
                </span>
                {/* 悬停时显示的emoji */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                  {feature.emojis.map((emoji, i) => (
                    <span
                      key={i}
                      className={cn(
                        'pointer-events-none absolute transform text-2xl transition-all duration-500 group-hover:scale-110 sm:text-3xl md:text-4xl lg:text-5xl',
                        emoji.position,
                      )}>
                      {emoji.emoji}
                    </span>
                  ))}
                </div>
                {index < features.length - 1 && (
                  <span className="ml-3 text-gray-400">
                    {index === features.length - 2
                      ? t('hero.features.conjunction.and')
                      : t('hero.features.conjunction.comma')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 描述文本 - 修改样式 */}
          <p className="mb-8 mt-4 w-full max-w-2xl px-4 text-center text-lg leading-7 text-foreground-600 sm:text-xl sm:leading-8">
            {description}
          </p>

          {/* 操作按钮 - 优化样式 */}
          <div className="flex flex-col items-center gap-4">
            {/* 主CTA - 更突出 */}
            <Link href="/signin">
              <Button
                size="lg"
                color="primary"
                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 px-12 py-7 text-lg font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                startContent={<Sparkles className="size-5 animate-pulse" />}>
                {t('hero.buttons.start_free')}
                <span className="ml-2 animate-bounce">→</span>
              </Button>
            </Link>

            {/* 应用商店按钮 */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih"
                target="_blank">
                <Button
                  size="md"
                  variant="bordered"
                  className="min-w-[180px]"
                  startContent={
                    <Icon
                      icon="logos:chrome"
                      className="size-5"
                    />
                  }>
                  {t('hero.buttons.chromeStore')}
                </Button>
              </Link>
              <Link
                href="https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg"
                target="_blank">
                <Button
                  size="md"
                  variant="bordered"
                  className="min-w-[180px]"
                  startContent={
                    <Icon
                      icon="logos:microsoft-edge"
                      className="size-5"
                    />
                  }>
                  {t('hero.buttons.edgeStore')}
                </Button>
              </Link>
            </div>

            {/* 信任标记 */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-foreground-600 sm:gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 shrink-0 text-green-500" />
                <span>{t('hero.trust.free')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 shrink-0 text-green-500" />
                <span>{t('hero.trust.no_card')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 shrink-0 text-green-500" />
                <span>{t('hero.trust.quick_start')}</span>
              </div>
            </div>

            {/* 社会认证 */}
            <SocialProof />
          </div>
        </div>
      </div>

      {/* 滚动提示 */}
      <div className="absolute bottom-8 left-1/2 z-40 -translate-x-1/2">
        <ScrollScreenChevronDown />
      </div>
    </BackgroundLines>
  );
}

// 类型定义集中
interface FeatureItem {
  title: string;
  description?: string;
}

export default async function HomePage() {
  await auth();
  // TODO: 测试阶段，暂时不跳转
  // if (session) redirect('/dashboard');
  const { t } = await createTranslation('home');

  // 统一数据获取
  const multiPostFeatures = t('multiPost.features', { returnObjects: true }) as FeatureItem[];
  const socialMediaAPIFeatures = t('draftTools.socialMedia.features', { returnObjects: true }) as string[];
  const videoTranscribeFeatures = t('draftTools.videoTranscribe.features', { returnObjects: true }) as string[];

  // JSON-LD 结构化数据
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MultiPost',
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome, Firefox, Edge, Safari',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
      bestRating: '5',
      worstRating: '1',
    },
    description:
      'MultiPost 是一款开源浏览器插件,支持一键将内容分发到微博、小红书、Twitter、LinkedIn 等多个社交平台。提供智能内容提取、AI 辅助创作、平台优化等功能。',
    url: 'https://multipost.app',
    image: 'https://multipost.app/og-image.png',
    author: {
      '@type': 'Organization',
      name: 'MultiPost Team',
      url: 'https://multipost.app',
    },
    softwareVersion: packageJson.version,
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString().split('T')[0],
    license: 'https://github.com/leaperone/MultiPost-Extension/blob/main/LICENSE',
    downloadUrl: 'https://multipost.app/extension',
    featureList: [
      '一键多平台发布',
      '智能内容提取',
      'AI 辅助创作',
      '平台优化',
      '草稿管理',
      '数据分析',
    ],
    screenshot: [
      'https://2someone-web-static.s3.bitiful.net/2025/05/ea3bb50afe710d57a968c1ac5f4d055f.png',
    ],
  };

  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 统一固定背景 */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-background dark:to-slate-950" />

      <SocialShareNotifications />
      <div className="relative w-full">
        {/* TODO: Remove announcement prop after 2026-03 */}
        <HeroSection
          t={t}
          announcement={{
            text: t('announcement.videoTranscribe.text'),
            cta: t('announcement.videoTranscribe.cta'),
          }}
        />
      </div>

      {/* 核心功能展示 Section */}
      <section className="relative z-10 overflow-hidden py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className={cn(glassBaseStyles, 'mb-3 inline-block rounded-full px-4 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-300')}>
              {t('multiPost.featuresBadge')}
            </span>
            <h2 className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('multiPost.featuresTitle')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">{t('multiPost.featuresDesc')}</p>
          </div>

          {/* 2x2 功能卡片网格 */}
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <LiquidGlassMotionCard className="p-6">
              <div className="flex items-start gap-4">
                <LiquidGlassIconContainer size="sm" color="primary">
                  <Box className="size-5 text-blue-500 dark:text-blue-400" />
                </LiquidGlassIconContainer>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground/90">{multiPostFeatures[0]?.title}</h3>
                  <p className="text-foreground/70">{multiPostFeatures[0]?.description}</p>
                </div>
              </div>
            </LiquidGlassMotionCard>

            <LiquidGlassMotionCard className="p-6">
              <div className="flex items-start gap-4">
                <LiquidGlassIconContainer size="sm" color="primary">
                  <Settings className="size-5 text-blue-500 dark:text-blue-400" />
                </LiquidGlassIconContainer>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground/90">{multiPostFeatures[1]?.title}</h3>
                  <p className="text-foreground/70">{multiPostFeatures[1]?.description}</p>
                </div>
              </div>
            </LiquidGlassMotionCard>

            <LiquidGlassMotionCard className="p-6">
              <div className="flex items-start gap-4">
                <LiquidGlassIconContainer size="sm" color="primary">
                  <Send className="size-5 text-blue-500 dark:text-blue-400" />
                </LiquidGlassIconContainer>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground/90">{multiPostFeatures[2]?.title}</h3>
                  <p className="text-foreground/70">{multiPostFeatures[2]?.description}</p>
                </div>
              </div>
            </LiquidGlassMotionCard>

            <LiquidGlassMotionCard className="p-6">
              <div className="flex items-start gap-4">
                <LiquidGlassIconContainer size="sm" color="primary">
                  <Share2Icon className="size-5 text-blue-500 dark:text-blue-400" />
                </LiquidGlassIconContainer>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground/90">{t('draftTools.socialMedia.title')}</h3>
                  <p className="text-foreground/70">{socialMediaAPIFeatures[0]}</p>
                </div>
              </div>
            </LiquidGlassMotionCard>
          </div>

          {/* CTA 按钮 */}
          <div className="mt-12 flex justify-center">
            <Link href="/extension">
              <Button
                size="lg"
                color="primary"
                className="px-10 py-7 text-lg font-medium">
                {t('multiPost.cta')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 产品演示 Section */}
      <section className="relative py-16">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <LiquidGlassCard className="overflow-hidden p-3">
              <Image
                src="https://2someone-web-static.s3.bitiful.net/2025/05/ea3bb50afe710d57a968c1ac5f4d055f.png"
                alt={t('images.multiPlatformPublishing')}
                className="rounded-2xl"
              />
            </LiquidGlassCard>
          </div>
        </div>
      </section>

      {/* 视频转录功能 Section */}
      <section className="relative overflow-hidden py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <span className={cn(glassBaseStyles, 'mb-3 inline-block rounded-full px-4 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-300')}>
              {t('sectionLabels.powerfulTools')}
            </span>
            <h2 className="mb-6 bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('draftTools.videoTranscribe.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">{t('draftTools.videoTranscribe.description')}</p>
          </div>

          {/* 视频转录功能特性 - 横向排列 */}
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {videoTranscribeFeatures.map((feature, i) => (
              <LiquidGlassCard key={i} className="p-5 text-center">
                <CheckCircle className="mx-auto mb-3 size-8 text-rose-500" />
                <p className="font-medium text-foreground/80">{feature}</p>
              </LiquidGlassCard>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 flex justify-center">
            <Link href="/dashboard/video-transcribe">
              <Button
                size="lg"
                variant="bordered"
                className="px-8 py-6 text-base font-medium">
                {t('announcement.videoTranscribe.cta')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section - Liquid Glass on gradient */}
      <section className="relative overflow-hidden py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-8 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl md:text-5xl">{t('finalCta.title')}</h2>
            <p className="mx-auto mb-10 max-w-2xl text-base text-foreground/80 sm:text-lg md:text-xl">{t('finalCta.description')}</p>
            {/* GitHub card - Liquid Glass */}
            <div className={cn(
              glassBaseStyles,
              'mx-auto mb-10 max-w-2xl rounded-3xl p-8'
            )}>
              <div className="mb-4 flex items-center justify-center">
                <Icon
                  icon="mdi:github"
                  className="mr-3 size-8"
                />
                <h3 className="text-xl font-semibold sm:text-2xl">MultiPost-Extension</h3>
              </div>
              <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://img.shields.io/github/stars/leaper-one/MultiPost-Extension?style=flat&logo=github&color=yellow"
                  alt="GitHub Stars"
                  className="h-5"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://img.shields.io/github/forks/leaper-one/MultiPost-Extension?style=flat&logo=github&color=blue"
                  alt="GitHub Forks"
                  className="h-5"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://img.shields.io/github/issues/leaper-one/MultiPost-Extension?style=flat&logo=github&color=green"
                  alt="GitHub Issues"
                  className="h-5"
                />
              </div>
              <p className="mb-6 text-foreground/70">{t('openSource.description')}</p>
            </div>
            <div className="flex flex-col justify-center gap-6 sm:flex-row">
              <Link href="/extension">
                <Button
                  size="lg"
                  color="primary"
                  className="rounded-2xl px-10 py-7 text-lg font-medium">
                  {t('finalCta.install')}
                </Button>
              </Link>
              <Link
                href="https://github.com/leaperone/MultiPost-Extension"
                target="_blank">
                <Button
                  size="lg"
                  variant="bordered"
                  className="rounded-2xl px-10 py-7 text-lg font-medium"
                  startContent={
                    <Icon
                      icon="mdi:github"
                      className="size-5"
                    />
                  }>
                  {t('finalCta.github')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MagicBox.tools Badge Section */}
      <section className="bg-transparent py-12">
        <div className="container mx-auto flex flex-col items-center justify-center">
          <a
            href="https://magicbox.tools"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Featured on MagicBox.tools">
            <Image
              src="https://magicbox.tools/badge.svg"
              alt="Featured on MagicBox.tools"
              width={200}
              height={54}
              className="mb-2"
            />
          </a>
          <p className="text-center text-sm text-foreground/60">{t('badges.magicBoxFeatured')}</p>
        </div>
      </section>
    </>
  );
}

