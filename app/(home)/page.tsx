import { Card, CardBody, Button, Link, Badge } from '@heroui/react';
import { ArrowRight, Share2, Zap, Globe2, Sparkles, LayoutDashboardIcon, PenToolIcon } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { BackgroundLines } from '@/components/background-lines';

import FooterWithColumns from '@/components/HomePage/FooterWithColumns';
import HomePageHeader from '@/components/HomePage/Header';
import ScrollScreenChevronDown from '@/components/HomePage/ScrollScreenChevronDown';
import SocialShareNotifications from '@/components/HomePage/SocialShareNotifications';
import { createTranslation } from '@/i18n/server';

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
      text: t('hero.features.save'),
      hoverColor: 'text-purple-400',
      emojis: [
        {
          emoji: '💾',
          position: '-left-24 -top-6 group-hover:rotate-[15deg] group-hover:-translate-y-10 group-hover:-translate-x-8',
        },
        {
          emoji: '📥',
          position:
            'left-[105px] -top-4 group-hover:rotate-[35deg] group-hover:translate-x-16 group-hover:-translate-y-12',
        },
        {
          emoji: '✅',
          position:
            '-left-8 -top-12 group-hover:-rotate-[25deg] group-hover:-translate-y-16 group-hover:-translate-x-4',
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
  ];

  return (
    <BackgroundLines className={cn('relative w-full', className)}>
      <div className="z-40 m-auto flex h-[80vh] w-[90%] flex-col items-center justify-center bg-transparent">
        <div className="flex w-full flex-col items-center">
          <div className="relative min-h-[60px] w-full rounded-2xl pt-4">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 p-4 text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl">
                {features.map((feature, featureIndex) => (
                  <div
                    key={featureIndex}
                    className="group relative flex items-center">
                    <span
                      className={cn(
                        'text-foreground transition-colors duration-300',
                        `group-hover:${feature.hoverColor}`,
                      )}>
                      {feature.text}
                    </span>
                    <div className="absolute inset-0 cursor-pointer opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                      {feature.emojis.map((item, index) => (
                        <span
                          key={index}
                          className={cn(
                            'pointer-events-none absolute transform text-2xl transition-all duration-500 group-hover:scale-110 sm:text-3xl md:text-4xl lg:text-5xl',
                            item.position,
                          )}>
                          {item.emoji}
                        </span>
                      ))}
                    </div>
                    {featureIndex < features.length - 1 && (
                      <span className="ml-3 text-gray-400">
                        {featureIndex === features.length - 2
                          ? t('hero.features.conjunction.and')
                          : t('hero.features.conjunction.comma')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mb-8 w-full max-w-2xl text-center text-lg leading-8 text-foreground-600">
            {before}
            <span className="cursor-pointer underline decoration-blue-500 decoration-wavy dark:decoration-yellow-300">
              {platformText}
            </span>
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
            <Badge
              color="danger"
              content="New">
              <Button
                as={Link}
                href="https://md.multipost.app"
                target="_blank"
                size="lg"
                startContent={<PenToolIcon />}
                className="bg-gradient-to-r from-green-600 to-lime-400 text-white transition-opacity hover:opacity-90">
                Markdown 文章编辑器
              </Button>
            </Badge>
            <Button
              as={Link}
              href="/extension"
              size="lg"
              startContent={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z" />
                </svg>
              }
              className="bg-gradient-to-r from-purple-400 to-pink-300 text-white transition-opacity hover:opacity-90">
              {t('hero.buttons.install')}
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-12 left-1/2 z-40 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2">
          <ScrollScreenChevronDown />
        </div>
      </div>
    </BackgroundLines>
  );
}

export default async function HomePage() {
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <HomePageHeader />
      <SocialShareNotifications />
      <main className="flex-1">
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
                href="https://github.com/leaper-one/MultiPost-Extension"
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
                  href="https://github.com/leaper-one/MultiPost-Extension"
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
      </main>
      <FooterWithColumns />
    </div>
  );
}
