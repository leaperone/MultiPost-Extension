import { Button, Card } from '@heroui/react';
import { Icon } from '@iconify/react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Box, CheckCircle, MonitorIcon, Send, Settings, Share2Icon } from 'lucide-react';

import { HomePublisher } from '@/components/HomePage/HomePublisher';
import { useTranslation } from '../../i18n/client';

const HOME_TITLE = 'MultiPost - Open Source Multi-Platform Social Media Publishing Tool';
const HOME_DESCRIPTION =
  'MultiPost is a free, open-source multi-platform publishing tool. Download the desktop app for macOS and Windows to publish to Weibo, Xiaohongshu, Twitter, LinkedIn and 44+ platforms with one click. A browser extension is also available. Save 80% of your publishing time with AI-powered content optimization.';

export const Route = createFileRoute('/_default/')({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: 'description', content: HOME_DESCRIPTION },
    ],
  }),
  component: HomePage,
});

interface FeatureItem {
  title: string;
  description?: string;
}

function HomePage() {
  const { t } = useTranslation('home');

  const multiPostFeatures = t('multiPost.features', { returnObjects: true }) as FeatureItem[];
  const socialMediaAPIFeatures = t('draftTools.socialMedia.features', { returnObjects: true }) as string[];
  const videoTranscribeFeatures = t('draftTools.videoTranscribe.features', { returnObjects: true }) as string[];

  return (
    <>
      <h1 className="sr-only">MultiPost - 开源多平台社交媒体一键发布工具</h1>

      <HomePublisher />

      <section className="relative overflow-hidden py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-8 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              {t('finalCta.title')}
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-base text-foreground/80 sm:text-lg md:text-xl">
              {t('finalCta.description')}
            </p>
            <Card className="shadow-none border mx-auto mb-10 max-w-2xl rounded-3xl p-8">
              <div className="mb-4 flex items-center justify-center">
                <Icon
                  icon="mdi:github"
                  className="mr-3 size-8"
                />
                <h3 className="text-xl font-semibold sm:text-2xl">MultiPost-Extension</h3>
              </div>
              <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
                <img
                  src="https://img.shields.io/github/stars/leaper-one/MultiPost-Extension?style=flat&logo=github&color=yellow"
                  alt="GitHub Stars"
                  className="h-5"
                  width={100}
                  height={20}
                />
                <img
                  src="https://img.shields.io/github/forks/leaper-one/MultiPost-Extension?style=flat&logo=github&color=blue"
                  alt="GitHub Forks"
                  className="h-5"
                  width={100}
                  height={20}
                />
                <img
                  src="https://img.shields.io/github/issues/leaper-one/MultiPost-Extension?style=flat&logo=github&color=green"
                  alt="GitHub Issues"
                  className="h-5"
                  width={100}
                  height={20}
                />
              </div>
              <p className="mb-6 text-foreground/70">{t('openSource.description')}</p>
            </Card>
            <div className="flex flex-col justify-center gap-6 sm:flex-row">
              <Link to="/install">
                <Button
                  size="lg"
                  color="primary"
                  className="rounded-2xl px-10 py-7 text-lg font-medium"
                  startContent={<MonitorIcon className="size-5" />}>
                  {t('finalCta.desktop')}
                </Button>
              </Link>
              <Link to="/install">
                <Button
                  size="lg"
                  variant="bordered"
                  className="rounded-2xl px-10 py-7 text-lg font-medium">
                  {t('finalCta.install')}
                </Button>
              </Link>
              <a
                href="https://github.com/leaperone/MultiPost-Extension"
                target="_blank"
                rel="noopener noreferrer">
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
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 overflow-hidden py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="mb-3 inline-block rounded-full border bg-default-100 px-4 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-300">
              {t('multiPost.featuresBadge')}
            </span>
            <h2 className="mb-6 text-4xl font-bold text-foreground md:text-5xl">
              {t('multiPost.featuresTitle')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">{t('multiPost.featuresDesc')}</p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <FeatureCard
              icon={<Box className="size-5 text-blue-500 dark:text-blue-400" />}
              title={multiPostFeatures[0]?.title}
              description={multiPostFeatures[0]?.description}
            />
            <FeatureCard
              icon={<Settings className="size-5 text-blue-500 dark:text-blue-400" />}
              title={multiPostFeatures[1]?.title}
              description={multiPostFeatures[1]?.description}
            />
            <FeatureCard
              icon={<Send className="size-5 text-blue-500 dark:text-blue-400" />}
              title={multiPostFeatures[2]?.title}
              description={multiPostFeatures[2]?.description}
            />
            <FeatureCard
              icon={<Share2Icon className="size-5 text-blue-500 dark:text-blue-400" />}
              title={t('draftTools.socialMedia.title')}
              description={socialMediaAPIFeatures[0]}
            />
          </div>
        </div>
      </section>

      <section className="relative py-16">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <Card className="shadow-none border overflow-hidden p-3">
              <img
                src="https://2someone-web-static.s3.bitiful.net/2025/05/ea3bb50afe710d57a968c1ac5f4d055f.png"
                alt={t('images.multiPlatformPublishing')}
                className="w-full rounded-2xl"
                loading="lazy"
              />
            </Card>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <span className="mb-3 inline-block rounded-full border bg-default-100 px-4 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-300">
              {t('sectionLabels.powerfulTools')}
            </span>
            <h2 className="mb-6 text-4xl font-bold text-foreground md:text-5xl">
              {t('draftTools.videoTranscribe.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-foreground/80">
              {t('draftTools.videoTranscribe.description')}
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {videoTranscribeFeatures.map((feature, index) => (
              <Card
                key={index}
                className="shadow-none border p-5 text-center">
                <CheckCircle className="mx-auto mb-3 size-8 text-rose-500" />
                <p className="font-medium text-foreground/80">{feature}</p>
              </Card>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link to="/dashboard/video-transcribe">
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

      <section className="bg-transparent py-12">
        <div className="container mx-auto flex flex-col items-center justify-center">
          <a
            href="https://magicbox.tools"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Featured on MagicBox.tools">
            <img
              src="https://magicbox.tools/badge.svg"
              alt="Featured on MagicBox.tools"
              width={200}
              height={54}
              className="mb-2"
              loading="lazy"
            />
          </a>
          <p className="text-center text-sm text-foreground/60">{t('badges.magicBoxFeatured')}</p>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <Card className="shadow-none border p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-default-100">
          {icon}
        </div>
        <div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-foreground/70">{description}</p>
        </div>
      </div>
    </Card>
  );
}
