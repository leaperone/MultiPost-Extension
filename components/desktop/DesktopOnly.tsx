'use client';

import { useIsDesktop } from '@/lib/desktop-bridge';
import { Card, CardBody } from '@heroui/react';
import { Monitor } from 'lucide-react';

interface DesktopOnlyProps {
  children: React.ReactNode;
  /** Custom fallback to show when not in Desktop environment. Defaults to a message card. */
  fallback?: React.ReactNode;
  /** If true, render nothing when not in Desktop (instead of fallback) */
  hideOnWeb?: boolean;
}

/**
 * Wrapper component that only renders children in Desktop (Electron) environment.
 * In web browser, shows a fallback message or nothing.
 */
export function DesktopOnly({ children, fallback, hideOnWeb }: DesktopOnlyProps) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    if (hideOnWeb) return null;

    if (fallback) return <>{fallback}</>;

    return (
      <div className="p-6">
        <Card className="shadow-none border">
          <CardBody>
            <div className="flex items-center gap-3">
              <Monitor className="size-5 text-muted-foreground" />
              <p className="text-muted-foreground">
                This feature is only available in MultiPost Desktop.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
