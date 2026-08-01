import { Link, createFileRoute } from '@tanstack/react-router';
import { CheckCircleIcon, ChromeIcon, ExternalLinkIcon, PuzzleIcon, RefreshCwIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '../../i18n/client';
import { checkServiceStatus } from '../../lib/extension';
import { routeMeta } from '../../lib/seo';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih';
const EDGE_STORE_URL = 'https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg';

export const Route = createFileRoute('/_default/extension')({
  head: () => ({
    meta: routeMeta({
      title: 'MultiPost Browser Extension',
      description: 'Check, install, and start using the MultiPost browser extension.',
    }),
  }),
  component: ExtensionPage,
});

function ExtensionPage() {
  const { t } = useTranslation('extension');
  const [isChecking, setIsChecking] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);

  const checkExtension = useCallback(async () => {
    setIsChecking(true);
    const isServiceRunning = await checkServiceStatus();
    setIsInstalled(isServiceRunning);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    void checkExtension();
  }, [checkExtension]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-balance text-xl font-semibold text-foreground">{t('title')}</h1>
          <p className="max-w-[70ch] text-pretty text-sm leading-6 text-muted-foreground">{t('description')}</p>
        </header>

        <section
          className="rounded-xl bg-card p-5 sm:p-6"
          aria-live="polite"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                {isInstalled ? <CheckCircleIcon /> : <PuzzleIcon />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="text-base font-semibold text-foreground">
                  {isChecking ? t('checking') : isInstalled ? t('extension_ready') : t('extension_not_detected')}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {isChecking
                    ? t('checking_description')
                    : isInstalled
                      ? t('ready_description')
                      : t('install_description')}
                </p>
              </div>
            </div>

            {isInstalled ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg bg-muted px-4 py-3 text-sm leading-6 text-foreground">{t('pin_tip')}</div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/dashboard/publish">{t('start_publishing')}</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void checkExtension()}
                    disabled={isChecking}
                  >
                    <RefreshCwIcon className={isChecking ? 'animate-spin motion-reduce:animate-none' : undefined} />
                    {t('recheck')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <a
                      href={CHROME_STORE_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ChromeIcon />
                      {t('chrome_store')}
                      <ExternalLinkIcon />
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                  >
                    <a
                      href={EDGE_STORE_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <PuzzleIcon />
                      {t('edge_store')}
                      <ExternalLinkIcon />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void checkExtension()}
                    disabled={isChecking}
                  >
                    <RefreshCwIcon className={isChecking ? 'animate-spin motion-reduce:animate-none' : undefined} />
                    {t('recheck')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
