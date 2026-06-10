import { createFileRoute } from '@tanstack/react-router';
import { Card, CardBody, CardHeader, Divider, Switch } from '@heroui/react';

import { useIsDesktop } from '@/lib/desktop-bridge';
import { routeMeta } from '../../../lib/seo';
import { DesktopPageShell, DesktopRequiredCard, useDesktopVersion } from './-components';

export const Route = createFileRoute('/dashboard/desktop/settings')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Settings | MultiPost',
      description: 'Configure MultiPost Desktop.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopSettingsPage,
});

function DesktopSettingsPage() {
  const isDesktop = useIsDesktop();
  const { version, platform } = useDesktopVersion();

  if (!isDesktop) return <DesktopRequiredCard />;

  return (
    <DesktopPageShell
      title="Settings"
      description="Configure MultiPost Desktop."
      maxWidth="max-w-2xl">
      <Card className="shadow-none border">
        <CardHeader>
          <h2 className="font-semibold">Application</h2>
        </CardHeader>
        <CardBody className="gap-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>{version || 'Loading...'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Platform</span>
            <span>{platform}</span>
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-none border">
        <CardHeader>
          <h2 className="font-semibold">Publishing</h2>
        </CardHeader>
        <CardBody className="gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Autosave drafts</p>
              <p className="text-sm text-muted-foreground">
                Keep a local draft while editing publish content.
              </p>
            </div>
            <Switch defaultSelected />
          </div>
          <Divider />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Check for updates</p>
              <p className="text-sm text-muted-foreground">
                Let Desktop check for app updates on startup.
              </p>
            </div>
            <Switch defaultSelected />
          </div>
        </CardBody>
      </Card>
    </DesktopPageShell>
  );
}
