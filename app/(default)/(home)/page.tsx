import { Card, CardBody, Button, Link, Image } from '@heroui/react';
import { Sparkles, Box, Settings, Send, SendIcon, FileTypeIcon, CheckCircle } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { BackgroundLines } from '@/components/background-lines';

import ScrollScreenChevronDown from '@/components/HomePage/ScrollScreenChevronDown';
import { createTranslation } from '@/i18n/server';
import { auth } from '@/auth';
import SocialShareNotifications from '@/components/HomePage/SocialShareNotifications';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { SocialProof } from '@/components/HomePage/SocialProof';
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

function HeroSection({ t, className }: { t: TranslationFunction; className?: string }) {
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
            <Button
              as={Link}
              href="/signin"
              size="lg"
              color="primary"
              className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 px-12 py-7 text-lg font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              startContent={<Sparkles className="size-5 animate-pulse" />}>
              {t('hero.buttons.start_free')}
              <span className="ml-2 animate-bounce">→</span>
            </Button>

            {/* 次要CTA */}
            <Button
              as={Link}
              href="#demo"
              size="md"
              variant="light"
              className="text-foreground-600">
              {t('hero.buttons.watch_demo')}
            </Button>

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
  const webreaderFeatures = t('draftTools.webreader.features', { returnObjects: true }) as string[];
  const searchFeatures = t('draftTools.search.features', { returnObjects: true }) as string[];
  const socialMediaAPIFeatures = t('draftTools.socialMedia.features', { returnObjects: true }) as string[];

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

  // 统一功能点数组
  const unifiedFeatures = [
    {
      icon: <FileTypeIcon className="size-5 text-primary" />,
      title: multiPostFeatures[0]?.title,
      description: multiPostFeatures[0]?.description,
    },
    {
      icon: <SendIcon className="size-5 text-primary" />,
      title: multiPostFeatures[2]?.title,
      description: multiPostFeatures[2]?.description,
    },
    {
      icon: <Sparkles className="size-5 text-primary" />,
      title: multiPostFeatures[1]?.title,
      description: multiPostFeatures[1]?.description,
    },
  ];

  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SocialShareNotifications />
      <div className="relative w-full">
        <HeroSection t={t} />
      </div>

      {/* MultiPost Bento Grid Section */}
      <section className="relative z-10 overflow-hidden bg-background py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="mb-3 inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              {t('multiPost.featuresBadge')}
            </span>
            <h2 className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('multiPost.featuresTitle')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">{t('multiPost.featuresDesc')}</p>
          </div>
          <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
            {/* Card 1: Multiple Content Formats */}
            <BentoGridItem
              area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
              icon={<Box className="size-5 text-blue-500 dark:text-blue-300" />}
              title={multiPostFeatures[0]?.title}
              description={multiPostFeatures[0]?.description}
            />
            {/* Card 2: Platform-Specific Optimization */}
            <BentoGridItem
              area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
              icon={<Settings className="size-5 text-blue-500 dark:text-blue-300" />}
              title={multiPostFeatures[1]?.title}
              description={multiPostFeatures[1]?.description}
            />
            {/* Card 3: One-Click Publishing */}
            <BentoGridItem
              area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
              icon={<Send className="size-5 text-blue-500 dark:text-blue-300" />}
              title={multiPostFeatures[2]?.title}
              description={multiPostFeatures[2]?.description}
            />
            {/* Card 4: Web Content Extraction */}
            <BentoGridItem
              area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
              icon={
                <Icon
                  icon="lucide:globe"
                  className="size-5 text-blue-500 dark:text-blue-300"
                />
              }
              title={t('draftTools.webreader.title')}
              description={(t('draftTools.webreader.features', { returnObjects: true }) as string[])[0]}
            />
            {/* Card 5: Search Engine Writing Assistant */}
            <BentoGridItem
              area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
              icon={
                <Icon
                  icon="lucide:search"
                  className="size-5 text-blue-500 dark:text-blue-300"
                />
              }
              title={t('draftTools.search.title')}
              description={(t('draftTools.search.features', { returnObjects: true }) as string[])[0]}
            />
          </ul>
        </div>
      </section>

      {/* 融合多平台发布功能和演示 Section */}
      <section className="relative py-16">
        <div className="absolute right-0 top-0 h-80 w-1/3 rounded-bl-[100px] bg-blue-50 opacity-50 dark:bg-blue-900/10"></div>
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-secondary/5 blur-3xl"></div>

        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <span className="mb-3 inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              {t('sectionLabels.powerfulSimple')}
            </span>
            <h2 className="mb-4 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('multiPost.title')}
            </h2>
          </div>

          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {unifiedFeatures.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl bg-white p-4 shadow transition-shadow hover:shadow-md dark:bg-gray-800/50">
                    <div className="rounded-full bg-primary/10 p-3">{feature.icon}</div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground transition-colors group-hover:text-blue-500 dark:group-hover:text-blue-300">
                        {feature.title}
                      </h4>
                      {feature.description && <p className="text-base text-foreground/70">{feature.description}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-10 py-4 text-base font-medium"
                  size="lg"
                  as={Link}
                  href="/extension">
                  {t('multiPost.cta')}
                </Button>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="relative z-10 aspect-video overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="https://2someone-web-static.s3.bitiful.net/2025/05/ea3bb50afe710d57a968c1ac5f4d055f.png"
                  alt="Multi Platform Publishing"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 -z-0 size-32 rounded-2xl bg-blue-100 dark:bg-blue-900/30"></div>
              <div className="absolute -left-6 -top-6 -z-0 size-32 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 草稿工具功能 Section */}
      <section className="relative overflow-hidden bg-default-50 py-24">
        {/* 背景装饰 */}
        <div className="absolute left-0 top-1/4 size-72 rounded-full bg-gradient-to-br from-purple-300/20 to-blue-300/20 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 size-80 rounded-full bg-gradient-to-br from-amber-300/20 to-orange-300/20 blur-3xl"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="mb-2 inline-block rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
              {t('sectionLabels.powerfulTools')}
            </span>
            <h2 className="mb-6 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('draftTools.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">{t('draftTools.subtitle')}</p>
          </div>

          <p className="mx-auto mb-12 max-w-3xl text-center text-lg leading-relaxed text-foreground/80">
            {t('draftTools.description')}
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Webreader */}
            <Card className="group overflow-hidden border-none shadow-lg transition-shadow duration-300 hover:shadow-xl">
              <div className="h-3 bg-gradient-to-r from-blue-400 to-teal-400"></div>
              <CardBody className="p-8">
                <div className="mb-4 flex items-center">
                  <div className="mr-4 rounded-xl bg-blue-100 p-3 transition-transform duration-300 group-hover:scale-110 dark:bg-blue-900/30">
                    <Icon
                      icon="lucide:globe"
                      className="size-6 text-blue-500"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-blue-500">{t('draftTools.webreader.title')}</h3>
                </div>
                <p className="mb-6 text-lg leading-relaxed text-foreground/80">
                  {t('draftTools.webreader.description')}
                </p>
                <ul className="space-y-3">
                  {webreaderFeatures.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg py-2 pl-2 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10">
                      <Icon
                        icon="lucide:check-circle"
                        className="size-5 shrink-0 text-blue-500"
                      />
                      <span className="text-lg">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            {/* Search Engine */}
            <Card className="group overflow-hidden border-none shadow-lg transition-shadow duration-300 hover:shadow-xl">
              <div className="h-3 bg-gradient-to-r from-amber-400 to-orange-400"></div>
              <CardBody className="p-8">
                <div className="mb-4 flex items-center">
                  <div className="mr-4 rounded-xl bg-amber-100 p-3 transition-transform duration-300 group-hover:scale-110 dark:bg-amber-900/30">
                    <Icon
                      icon="lucide:search"
                      className="size-6 text-amber-500"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-amber-500">{t('draftTools.search.title')}</h3>
                </div>
                <p className="mb-6 text-lg leading-relaxed text-foreground/80">{t('draftTools.search.description')}</p>
                <ul className="space-y-3">
                  {searchFeatures.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg py-2 pl-2 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/10">
                      <Icon
                        icon="lucide:check-circle"
                        className="size-5 shrink-0 text-amber-500"
                      />
                      <span className="text-lg">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            {/* Social Media API */}
            <Card className="group overflow-hidden border-none shadow-lg transition-shadow duration-300 hover:shadow-xl">
              <div className="h-3 bg-gradient-to-r from-purple-400 to-pink-400"></div>
              <CardBody className="p-8">
                <div className="mb-4 flex items-center">
                  <div className="mr-4 rounded-xl bg-purple-100 p-3 transition-transform duration-300 group-hover:scale-110 dark:bg-purple-900/30">
                    <Icon
                      icon="lucide:share-2"
                      className="size-6 text-purple-500"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-purple-500">{t('draftTools.socialMedia.title')}</h3>
                </div>
                <p className="mb-6 text-lg leading-relaxed text-foreground/80">
                  {t('draftTools.socialMedia.description')}
                </p>
                <ul className="space-y-3">
                  {socialMediaAPIFeatures.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg py-2 pl-2 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/10">
                      <Icon
                        icon="lucide:check-circle"
                        className="size-5 shrink-0 text-purple-500"
                      />
                      <span className="text-lg">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary via-blue-500 to-secondary py-24 text-white">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-8 text-5xl font-bold">{t('finalCta.title')}</h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-white/90">{t('finalCta.description')}</p>
            <div className="mx-auto mb-10 max-w-2xl rounded-xl bg-white/10 p-8 shadow-lg dark:bg-gray-800/30">
              <div className="mb-4 flex items-center justify-center">
                <Icon
                  icon="mdi:github"
                  className="mr-3 size-8"
                />
                <h3 className="text-2xl font-semibold">MultiPost-Extension</h3>
              </div>
              <div className="mb-6 flex items-center justify-center gap-3">
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
              <p className="mb-6 text-white/80">{t('openSource.description')}</p>
            </div>
            <div className="flex flex-col justify-center gap-6 sm:flex-row">
              <Button
                size="lg"
                as={Link}
                href="/extension"
                className="rounded-xl bg-white px-10 py-7 text-lg font-medium text-primary hover:bg-white/90">
                {t('finalCta.install')}
              </Button>
              <Button
                size="lg"
                as={Link}
                href="https://github.com/leaperone/MultiPost-Extension"
                target="_blank"
                className="rounded-xl border-2 border-white bg-transparent px-10 py-7 text-lg font-medium text-white hover:bg-white/10"
                startContent={
                  <Icon
                    icon="mdi:github"
                    className="size-5"
                  />
                }>
                {t('finalCta.github')}
              </Button>
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
          <p className="text-center text-sm text-foreground/60">This project is featured on MagicBox.tools</p>
        </div>
      </section>
    </>
  );
}

// BentoGridItem 组件定义
interface BentoGridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

function BentoGridItem({ area, icon, title, description }: BentoGridItemProps) {
  return (
    <li className={`min-h-56 list-none ${area}`}>
      <div className="relative h-full rounded-2xl border border-foreground/10 bg-background p-2 shadow-lg md:rounded-3xl md:p-3">
        <GlowingEffect
          blur={0}
          borderWidth={3}
          spread={80}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] md:p-6">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border border-blue-200 p-2 dark:border-blue-900">{icon}</div>
            <div className="space-y-3">
              <h3 className="text-balance pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-black dark:text-white md:text-2xl/[1.875rem]">
                {title}
              </h3>
              <h2 className="font-sans text-sm/[1.125rem] text-black dark:text-neutral-400 md:text-base/[1.375rem]">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
