import { Card, CardBody, Button, Link } from '@heroui/react';
import { ArrowRight, Share2, Zap, Globe2, Sparkles } from 'lucide-react';
import { Icon } from '@iconify/react';

import FooterWithColumns from '@/components/HomePage/FooterWithColumns';
import HomePageHeader from '@/components/HomePage/Header';
import HeroSection from './hero-section';
import { createTranslation } from '@/i18n/server';

export const metadata = {
  title: 'MultiPost - Open Source Social Media Publishing Tool',
  description:
    'MultiPost is an open source browser extension that helps you publish content to multiple social media platforms with one click. Save time and boost your social media presence.',
};

// 封装通用的 Section 组件
function Section({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`py-20 ${className}`}>
      <div className="container mx-auto px-4">{children}</div>
    </section>
  );
}

// 封装通用的 SectionTitle 组件
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-16 max-w-3xl text-center">
      <h2 className="mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-4xl font-bold text-transparent">
        {title}
      </h2>
      {subtitle && <p className="text-xl text-foreground/80">{subtitle}</p>}
    </div>
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
      <main className="grow">
        <HeroSection className="h-[70vh]" />

        <Section>
          <SectionTitle
            title={t('features.title')}
            subtitle={t('features.subtitle')}
          />
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
        </Section>

        <Section className="bg-default-50">
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
        </Section>

        <Section>
          <SectionTitle
            title={t('openSource.title')}
            subtitle={t('openSource.description')}
          />
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
        </Section>

        <Section className="bg-default-50">
          <SectionTitle title={t('faq.title')} />
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
        </Section>

        <Section className="bg-gradient-to-r from-primary to-secondary text-white">
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
        </Section>
      </main>
      <FooterWithColumns />
    </div>
  );
}
