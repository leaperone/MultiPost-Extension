import { Card, CardBody, Button, Link } from '@heroui/react';
import { Sparkles, LayoutDashboardIcon, PenToolIcon, ChromeIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { BackgroundLines } from '@/components/background-lines';

import ScrollScreenChevronDown from '@/components/HomePage/ScrollScreenChevronDown';
import { createTranslation } from '@/i18n/server';
import { auth } from '@/auth';
import SocialShareNotifications from '@/components/HomePage/SocialShareNotifications';
import Image from 'next/image';
// import { redirect } from 'next/navigation';

export const metadata = {
  title: 'MultiPost - Open Source Social Media Publishing Tool',
  description:
    'MultiPost是一个开源浏览器扩展，帮助您一键将内容发布到多个社交媒体平台。支持短视频、博客文章等多种内容格式，提供网页内容提取、搜索引擎接口和社交媒体数据分析功能，全面提升您的社交媒体存在感。',
};

interface TranslationFunction {
  (key: string): string;
  (key: string, options: { returnObjects: boolean }): string | Record<string, unknown>;
}

function HeroSection({ t, className }: { t: TranslationFunction; className?: string }) {
  const description = t('hero.description');
  const platformText = t('hero.platform');
  const [before, after] = description.split('all platforms');

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
            '-left-[100px] -top-7 group-hover:-rotate-[30deg] group-hover:-translate-y-14 md:-left-40 md:-top-16',
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
    {
      text: t('hero.features.analytics'),
      hoverColor: 'text-blue-400',
      emojis: [
        {
          emoji: '📊',
          position: '-left-20 -top-6 group-hover:rotate-[15deg] group-hover:-translate-y-12 group-hover:-translate-x-8',
        },
        {
          emoji: '📈',
          position: 'left-32 -top-8 group-hover:rotate-[25deg] group-hover:-translate-y-16 group-hover:translate-x-6',
        },
        {
          emoji: '🔍',
          position:
            '-left-12 -top-2 group-hover:-rotate-[20deg] group-hover:-translate-y-10 group-hover:-translate-x-4',
        },
      ],
    },
  ];

  return (
    <BackgroundLines className={cn('relative w-full min-h-screen', className)}>
      <div className="z-40 m-auto flex min-h-screen w-[90%] flex-col items-center justify-center py-20">
        <div className="flex w-full flex-col items-center">
          {/* 大标题 - 新增 */}
          <h1 className="mb-6 text-center text-5xl font-bold tracking-tighter md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              MultiPost
            </span>
          </h1>

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
          <p className="mb-10 mt-4 w-full max-w-2xl px-4 text-center text-lg leading-7 text-foreground-600 sm:text-xl sm:leading-8">
            {before}
            <span className="cursor-pointer font-semibold underline decoration-blue-500 decoration-wavy dark:decoration-yellow-300">
              {platformText}
            </span>
            {after}
          </p>

          {/* 操作按钮 - 修改样式 */}
          <div className="flex w-full flex-col justify-center gap-4 px-4 sm:flex-row sm:gap-4 sm:px-0">
            <Button
              as={Link}
              href="/dashboard/publish"
              startContent={<LayoutDashboardIcon className="size-4 sm:size-5" />}
              className="rounded-xl bg-gradient-to-r from-blue-400 to-sky-300 py-6 text-lg font-medium">
              {t('hero.buttons.post')}
            </Button>
            <Button
              as={Link}
              href="https://md.multipost.app"
              target="_blank"
              startContent={<PenToolIcon className="size-4 sm:size-5" />}
              className="rounded-xl bg-gradient-to-r from-green-600 to-lime-400 py-6 text-lg font-medium">
              {t('hero.buttons.markdown')}
            </Button>
            <Button
              as={Link}
              href="/extension"
              startContent={<ChromeIcon className="size-4 sm:size-5" />}
              className="rounded-xl bg-gradient-to-r from-purple-400 to-pink-300 py-6 text-lg font-medium">
              {t('hero.buttons.install')}
            </Button>
          </div>

          {/* 装饰元素 - 新增 */}
          <div className="mt-12 flex items-center justify-center gap-3">
            <span className="size-3 animate-pulse rounded-full bg-blue-400"></span>
            <span
              className="size-3 animate-pulse rounded-full bg-green-400"
              style={{ animationDelay: '0.3s' }}></span>
            <span
              className="size-3 animate-pulse rounded-full bg-purple-400"
              style={{ animationDelay: '0.6s' }}></span>
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

interface AnalyticsFeature {
  title: string;
  description: string;
}

interface MultiPostFeature {
  title: string;
  description: string;
}

// 修正类型定义，使用string[]类型而不是接口继承String
type WebReaderFeature = string;
type SearchFeature = string;
type SocialMediaAPIFeature = string;

export default async function HomePage() {
  const session = await auth();
  if (session) {
    // TODO: 测试阶段，暂时不跳转
    // redirect('/dashboard');
  }
  const { t } = await createTranslation('home');

  // 定义类型
  interface FAQItem {
    question: string;
    answer: string;
  }

  // 使用类型断言来处理数组
  const features = t('demo.features', { returnObjects: true }) as string[];
  const faqItems = t('faq.items', { returnObjects: true }) as FAQItem[];

  // 在 features 定义后添加
  const webTraceFeatures = t('analytics.webTrace.features', { returnObjects: true }) as AnalyticsFeature[];
  const socialMediaFeatures = t('analytics.socialMedia.features', { returnObjects: true }) as AnalyticsFeature[];

  // 获取多平台发布功能数据
  const multiPostFeatures = t('multiPost.features', { returnObjects: true }) as MultiPostFeature[];

  // 获取草稿工具功能数据
  const webreaderFeatures = t('draftTools.webreader.features', { returnObjects: true }) as WebReaderFeature[];
  const searchFeatures = t('draftTools.search.features', { returnObjects: true }) as SearchFeature[];
  const socialMediaAPIFeatures = t('draftTools.socialMedia.features', {
    returnObjects: true,
  }) as SocialMediaAPIFeature[];

  return (
    <>
      <SocialShareNotifications />
      <div className="relative w-full">
        <HeroSection t={t} />
      </div>

      {/* 融合多平台发布功能和演示 Section */}
      <section className="relative py-24">
        {/* 装饰背景 */}
        <div className="absolute right-0 top-0 h-80 w-1/3 rounded-bl-[100px] bg-blue-50 opacity-50 dark:bg-blue-900/10"></div>
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-secondary/5 blur-3xl"></div>

        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="mb-3 inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              {t('sectionLabels.powerfulSimple')}
            </span>
            <h2 className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('multiPost.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">{t('multiPost.subtitle')}</p>
          </div>

          {/* 多平台发布功能特性 */}
          <div className="mb-20 grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 flex flex-col justify-center md:order-1">
              <div className="mb-10 rounded-2xl bg-white p-6 shadow-lg backdrop-blur-sm dark:bg-gray-800/50">
                <p className="text-lg leading-relaxed text-foreground/80">{t('multiPost.description')}</p>
              </div>

              <div className="space-y-8">
                {multiPostFeatures.map((feature, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-5">
                    <div className="rounded-2xl bg-blue-100 p-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-200 dark:bg-blue-900/30 dark:group-hover:bg-blue-800/40">
                      <Icon
                        icon={i === 0 ? 'lucide:file-type' : i === 1 ? 'lucide:settings' : 'lucide:send'}
                        className="size-6 text-blue-600 dark:text-blue-300"
                      />
                    </div>
                    <div>
                      <h4 className="mb-2 text-xl font-semibold text-foreground transition-colors group-hover:text-blue-500 dark:group-hover:text-blue-300">
                        {feature.title}
                      </h4>
                      <p className="text-lg text-foreground/70">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative order-1 md:order-2">
              <div className="relative z-10 aspect-video overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="https://2someone-web-static.s3.bitiful.net/2025/04/40e625c0dfdc264852fc23eb3829fc79.png"
                  alt="Multi Platform Publishing"
                  fill
                  className="object-cover"
                />
              </div>

              {/* 装饰元素 */}
              <div className="absolute -bottom-6 -right-6 -z-0 size-32 rounded-2xl bg-blue-100 dark:bg-blue-900/30"></div>
              <div className="absolute -left-6 -top-6 -z-0 size-32 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30"></div>
            </div>
          </div>

          {/* 演示部分特性 */}
          <div className="mx-auto mt-24 max-w-4xl">
            <h3 className="mb-10 text-center text-3xl font-bold text-foreground">{t('combinedSection.usageTitle')}</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800/50">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Sparkles className="size-5 text-primary" />
                  </div>
                  <span className="text-lg font-medium text-foreground/90">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center gap-4">
              <Button
                className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 py-6 text-lg font-medium"
                size="lg"
                as={Link}
                href="/extension">
                {t('multiPost.cta')}
              </Button>

              <Button
                className="rounded-xl border border-gray-200 bg-white py-6 text-lg font-medium text-foreground dark:border-gray-700 dark:bg-gray-800"
                size="lg"
                as={Link}
                href="/dashboard/publish">
                {t('demo.cta')}
              </Button>
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

          <div className="mt-16 text-center">
            <Button
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-10 py-7 text-lg font-medium"
              size="lg"
              as={Link}
              href="/dashboard/publish">
              {t('draftTools.cta')}
            </Button>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-default-50 py-24">
        {/* 背景装饰 */}
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-secondary/5 blur-3xl"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="mb-2 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              {t('sectionLabels.analytics')}
            </span>
            <h2 className="mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('analytics.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">{t('analytics.subtitle')}</p>
          </div>

          <div className="grid gap-10 md:grid-cols-2">
            {/* Web Trace */}
            <Card className="overflow-hidden border-none shadow-lg">
              <div className="h-2 bg-gradient-to-r from-primary to-blue-400"></div>
              <CardBody className="p-8">
                <h3 className="mb-6 text-2xl font-semibold text-primary">{t('analytics.webTrace.title')}</h3>
                <p className="mb-8 text-lg text-foreground/80">{t('analytics.webTrace.description')}</p>
                <div className="space-y-5">
                  {webTraceFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4">
                      <div className="mt-1 rounded-xl bg-primary/10 p-3">
                        <Icon
                          icon={i === 0 ? 'lucide:activity' : i === 1 ? 'lucide:users' : 'lucide:gauge'}
                          className="size-5 text-primary"
                        />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-foreground">{feature.title}</h4>
                        <p className="text-foreground/70">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Social Media Analytics */}
            <Card className="overflow-hidden border-none shadow-lg">
              <div className="h-2 bg-gradient-to-r from-secondary to-purple-400"></div>
              <CardBody className="p-8">
                <h3 className="mb-6 text-2xl font-semibold text-secondary">{t('analytics.socialMedia.title')}</h3>
                <p className="mb-8 text-lg text-foreground/80">{t('analytics.socialMedia.description')}</p>
                <div className="space-y-5">
                  {socialMediaFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4">
                      <div className="mt-1 rounded-xl bg-secondary/10 p-3">
                        <Icon
                          icon={i === 0 ? 'lucide:bar-chart' : i === 1 ? 'lucide:users-2' : 'lucide:trending-up'}
                          className="size-5 text-secondary"
                        />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-foreground">{feature.title}</h4>
                        <p className="text-foreground/70">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-24 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="mb-3 inline-block rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-600 dark:bg-green-900/30 dark:text-green-300">
              {t('sectionLabels.openSource')}
            </span>
            <h2 className="mb-6 bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('openSource.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">{t('openSource.description')}</p>
          </div>

          {/* GitHub 卡片 */}
          <div className="mx-auto mb-10 max-w-2xl rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
            <div className="mb-4 flex items-center">
              <Icon
                icon="mdi:github"
                className="mr-3 size-8"
              />
              <h3 className="text-2xl font-semibold">MultiPost-Extension</h3>
            </div>
            <div className="mb-6 flex items-center gap-6">
              <div className="flex items-center">
                <Icon
                  icon="octicon:star-fill-16"
                  className="mr-2 size-5 text-amber-400"
                />
                <span>1.4k</span>
              </div>
              <div className="flex items-center">
                <Icon
                  icon="octicon:repo-forked-16"
                  className="mr-2 size-5"
                />
                <span>127</span>
              </div>
              <div className="flex items-center">
                <Icon
                  icon="octicon:issue-opened-16"
                  className="mr-2 size-5"
                />
                <span>15</span>
              </div>
            </div>
            <p className="mb-6 text-foreground/70">一个开源的浏览器扩展，帮助您一键发布内容到多个社交媒体平台。</p>
          </div>

          <div className="text-center">
            <Button
              as={Link}
              href="https://github.com/leaperone/MultiPost-Extension"
              target="_blank"
              className="rounded-xl bg-default-100 px-10 py-6 text-foreground hover:bg-default-200"
              size="lg"
              startContent={
                <Icon
                  icon="mdi:github"
                  className="size-5"
                />
              }>
              {t('openSource.cta')}
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-default-50 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="mb-3 inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              {t('sectionLabels.faq')}
            </span>
            <h2 className="mb-8 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {t('faq.title')}
            </h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-6">
            {faqItems.map((faq, i) => (
              <Card
                key={i}
                className="border-none shadow-md transition-shadow hover:shadow-lg">
                <CardBody className="p-6">
                  <h3 className="mb-3 text-xl font-semibold">{faq.question}</h3>
                  <p className="text-lg text-foreground/80">{faq.answer}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary via-blue-500 to-secondary py-24 text-white">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-8 text-5xl font-bold">{t('finalCta.title')}</h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-white/90">{t('finalCta.description')}</p>
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

            {/* 装饰元素 */}
            <div className="mt-16 flex items-center justify-center gap-4">
              <span className="h-2 w-16 rounded-full bg-white/30"></span>
              <span className="h-2 w-6 rounded-full bg-white/60"></span>
              <span className="h-2 w-10 rounded-full bg-white/30"></span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
