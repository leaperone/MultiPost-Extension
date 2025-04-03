import { Card, CardBody, Button, Link } from '@heroui/react';
import { ArrowRight, Share2, Zap, Globe2, Sparkles, LayoutDashboardIcon, PenToolIcon, ChromeIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { BackgroundLines } from '@/components/background-lines';

import ScrollScreenChevronDown from '@/components/HomePage/ScrollScreenChevronDown';
import { createTranslation } from '@/i18n/server';
import { auth } from '@/auth';
import SocialShareNotifications from '@/components/HomePage/SocialShareNotifications';
// import { redirect } from 'next/navigation';

export const metadata = {
  title: 'MultiPost - Open Source Social Media Publishing Tool',
  description:
    'MultiPost is an open source browser extension that helps you publish content to multiple social media platforms with one click. Save time and boost your social media presence.',
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
          {/* 特性文本展示 */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 p-4 text-xl font-bold sm:text-2xl md:text-3xl lg:text-5xl">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative flex items-center">
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

          {/* 描述文本 */}
          <p className="mb-8 w-full max-w-2xl px-4 text-center text-base leading-7 text-foreground-600 sm:text-lg sm:leading-8">
            {before}
            <span className="cursor-pointer underline decoration-blue-500 decoration-wavy dark:decoration-yellow-300">
              {platformText}
            </span>
            {after}
          </p>

          {/* 操作按钮 */}
          <div className="flex w-full flex-col justify-center gap-3 px-4 sm:flex-row sm:gap-2 sm:px-0">
            <Button
              as={Link}
              href="/dashboard/publish"
              startContent={<LayoutDashboardIcon className="size-4 sm:size-5" />}
              className="bg-gradient-to-r from-blue-400 to-sky-300">
              {t('hero.buttons.post')}
            </Button>
            <Button
              as={Link}
              href="https://md.multipost.app"
              target="_blank"
              startContent={<PenToolIcon className="size-4 sm:size-5" />}
              className="bg-gradient-to-r from-green-600 to-lime-400">
              {t('hero.buttons.markdown')}
            </Button>
            <Button
              as={Link}
              href="/extension"
              startContent={<ChromeIcon className="size-4 sm:size-5" />}
              className="bg-gradient-to-r from-purple-400 to-pink-300">
              {t('hero.buttons.install')}
            </Button>
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

  const keyFeatures = [
    {
      icon: <Zap className="size-6 text-primary" />,
      title: t('features.oneClick.title'),
      description: t('features.oneClick.description'),
      gradient: 'bg-primary/10',
      textColor: 'text-primary',
    },
    {
      icon: <Share2 className="size-6 text-secondary" />,
      title: t('features.noLogin.title'),
      description: t('features.noLogin.description'),
      gradient: 'bg-secondary/10',
      textColor: 'text-secondary',
    },
    {
      icon: <Globe2 className="size-6 text-success" />,
      title: t('features.optimization.title'),
      description: t('features.optimization.description'),
      gradient: 'bg-success/10',
      textColor: 'text-success',
    },
  ];

  // 在 features 定义后添加
  const webTraceFeatures = t('analytics.webTrace.features', { returnObjects: true }) as AnalyticsFeature[];
  const socialMediaFeatures = t('analytics.socialMedia.features', { returnObjects: true }) as AnalyticsFeature[];

  return (
    <>
      <SocialShareNotifications />
      <div className="relative w-full">
        <HeroSection t={t} />
      </div>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-4xl font-bold text-transparent">
              {t('features.title')}
            </h2>
            <p className="text-xl text-foreground/80">{t('features.subtitle')}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {keyFeatures.map((feature, i) => (
              <Card
                key={i}
                className="group border-none transition-all duration-300 hover:scale-105 hover:shadow-lg"
                isPressable>
                <CardBody className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-full ${feature.gradient} p-3`}>{feature.icon}</div>
                    <div>
                      <h3 className={`mb-2 text-xl font-semibold ${feature.textColor} flex items-center gap-2`}>
                        {feature.title}
                        <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </h3>
                      <p className="text-foreground/80">{feature.description}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-default-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-4xl font-bold text-transparent">
              {t('analytics.title')}
            </h2>
            <p className="text-xl text-foreground/80">{t('analytics.subtitle')}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Web Trace */}
            <Card className="overflow-hidden border-none shadow-md">
              <div className="h-2 bg-gradient-to-r from-primary to-blue-400"></div>
              <CardBody className="p-6">
                <h3 className="mb-4 text-2xl font-semibold text-primary">{t('analytics.webTrace.title')}</h3>
                <p className="mb-6 text-foreground/80">{t('analytics.webTrace.description')}</p>
                <div className="space-y-4">
                  {webTraceFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Icon
                          icon={i === 0 ? 'lucide:activity' : i === 1 ? 'lucide:users' : 'lucide:gauge'}
                          className="size-5 text-primary"
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{feature.title}</h4>
                        <p className="text-sm text-foreground/70">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Social Media Analytics */}
            <Card className="overflow-hidden border-none shadow-md">
              <div className="h-2 bg-gradient-to-r from-secondary to-purple-400"></div>
              <CardBody className="p-6">
                <h3 className="mb-4 text-2xl font-semibold text-secondary">{t('analytics.socialMedia.title')}</h3>
                <p className="mb-6 text-foreground/80">{t('analytics.socialMedia.description')}</p>
                <div className="space-y-4">
                  {socialMediaFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3">
                      <div className="rounded-full bg-secondary/10 p-2">
                        <Icon
                          icon={i === 0 ? 'lucide:bar-chart' : i === 1 ? 'lucide:users-2' : 'lucide:trending-up'}
                          className="size-5 text-secondary"
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{feature.title}</h4>
                        <p className="text-sm text-foreground/70">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-default-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-4xl font-bold text-transparent">
                {t('demo.title')}
              </h2>
              <div className="space-y-6">
                {features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Sparkles className="size-5 text-primary" />
                    </div>
                    <span className="text-lg text-foreground/90">{feature}</span>
                  </div>
                ))}
              </div>
              <Button
                className="mt-8 rounded-xl bg-gradient-to-r from-primary to-secondary px-8 py-6 text-white"
                size="lg"
                as={Link}
                href="/extension">
                {t('demo.cta')}
              </Button>
            </div>
            <div className="aspect-video rounded-xl bg-content1 shadow-xl" />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-4xl font-bold text-transparent">
              {t('openSource.title')}
            </h2>
            <p className="text-xl text-foreground/80">{t('openSource.description')}</p>
          </div>
          <div className="mt-12 text-center">
            <Button
              as={Link}
              href="https://github.com/leaperone/MultiPost-Extension"
              target="_blank"
              className="bg-default-100 text-foreground hover:bg-default-200"
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

      <section className="bg-default-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-4xl font-bold text-transparent">
              {t('faq.title')}
            </h2>
          </div>
          <div className="mx-auto max-w-3xl space-y-4">
            {faqItems.map((faq, i) => (
              <Card key={i}>
                <CardBody className="p-6">
                  <h3 className="mb-2 text-lg font-semibold">{faq.question}</h3>
                  <p className="text-foreground/80">{faq.answer}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary to-secondary py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-6 text-4xl font-bold">{t('finalCta.title')}</h2>
            <p className="mx-auto mb-8 max-w-2xl text-white/90">{t('finalCta.description')}</p>
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                as={Link}
                href="/extension"
                className="bg-white text-primary hover:bg-white/90">
                {t('finalCta.install')}
              </Button>
              <Button
                size="lg"
                as={Link}
                href="https://github.com/leaperone/MultiPost-Extension"
                target="_blank"
                className="border-2 border-white bg-transparent text-white hover:bg-white/10"
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
    </>
  );
}
