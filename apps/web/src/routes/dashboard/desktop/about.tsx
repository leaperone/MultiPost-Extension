import { createFileRoute } from '@tanstack/react-router';
import { Button, Card, CardBody, Link } from '@heroui/react';
import { ExternalLinkIcon, GithubIcon, GlobeIcon, HeartIcon } from 'lucide-react';

import { getDesktopBridge, useIsDesktop } from '@/lib/desktop-bridge';
import { routeMeta } from '../../../lib/seo';
import { DesktopPageShell, DesktopRequiredCard, useDesktopVersion } from './-components';

export const Route = createFileRoute('/dashboard/desktop/about')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop About | MultiPost',
      description: 'MultiPost Desktop app information.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopAboutPage,
});

function DesktopAboutPage() {
  const isDesktop = useIsDesktop();
  const { version, platform } = useDesktopVersion();

  if (!isDesktop) return <DesktopRequiredCard />;

  const openExternal = (url: string) => {
    const bridge = getDesktopBridge();
    if (bridge) {
      void bridge.app.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <DesktopPageShell
      title="MultiPost Desktop"
      description={`${version ? `Version ${version}` : 'Loading version'} · ${platform}`}
      maxWidth="max-w-2xl">
      <div className="space-y-6">
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-rose-500 text-3xl font-bold text-white">
            M
          </div>
          <p className="mx-auto max-w-md text-muted-foreground">
            Publish content to multiple social platforms from one desktop workspace.
          </p>
        </div>

        <Card className="shadow-none border">
          <CardBody className="gap-2">
            {[
              ['Website', 'https://multipost.app', <GlobeIcon className="size-4" />],
              ['GitHub', 'https://github.com/leaper-one/multipost', <GithubIcon className="size-4" />],
              ['Support MultiPost', 'https://multipost.app/pricing', <HeartIcon className="size-4" />],
            ].map(([label, url, icon]) => (
              <Button
                key={url as string}
                variant="light"
                className="justify-start"
                startContent={icon}
                endContent={<ExternalLinkIcon className="size-4 text-muted-foreground" />}
                onPress={() => openExternal(url as string)}>
                {label}
              </Button>
            ))}
          </CardBody>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="#"
            className="text-sm"
            onPress={() => openExternal('https://multipost.app/legal/privacy')}>
            Privacy
          </Link>
          {' · '}
          <Link
            href="#"
            className="text-sm"
            onPress={() => openExternal('https://multipost.app/legal/terms')}>
            Terms
          </Link>
        </p>
      </div>
    </DesktopPageShell>
  );
}
