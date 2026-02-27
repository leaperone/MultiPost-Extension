import { Button, Card, CardBody, Link } from '@heroui/react';
import {
  MonitorIcon,
  AppleIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  MessageCircleIcon,
  GlobeIcon,
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { createTranslation } from '@/i18n/server';

const S3_BASE =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_BASE ||
  'https://2someone-web-static.s3.bitiful.net/release/multipost-desktop';
const GITHUB_RELEASE = 'https://github.com/leaperone/MultiPost-Desktop-Release/releases/latest';

interface DownloadLink {
  label: string;
  url: string;
  note?: string;
}

interface DownloadOption {
  platform: string;
  icon: React.ReactNode;
  links: DownloadLink[];
}

export default async function InstallPage() {
  const { t } = await createTranslation('desktop-download');

  const downloads: DownloadOption[] = [
    {
      platform: 'macOS',
      icon: <AppleIcon className="size-6" />,
      links: [
        {
          label: t('dmg'),
          url: `${S3_BASE}/MultiPost-mac-latest.dmg`,
          note: t('macNote'),
        },
        {
          label: t('zip'),
          url: `${S3_BASE}/MultiPost-mac-latest.zip`,
          note: t('macNote'),
        },
      ],
    },
    {
      platform: 'Windows',
      icon: <Icon icon="mdi:microsoft-windows" className="size-6" />,
      links: [
        {
          label: t('exe'),
          url: `${S3_BASE}/MultiPost-Setup-latest.exe`,
          note: 'Windows 10+ (x64)',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <main className="container mx-auto px-4 py-16">
        {/* Page Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="mb-2 text-3xl font-semibold">{t('pageTitle')}</h1>
          <p className="text-foreground/70">{t('pageDescription')}</p>
        </div>

        <div className="mx-auto max-w-3xl space-y-10">
          {/* Browser Extension Section */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <GlobeIcon className="size-6" />
              <h2 className="text-xl font-medium">{t('extensionTitle')}</h2>
            </div>
            <p className="mb-4 text-sm text-foreground/60">{t('extensionDescription')}</p>
            <div className="flex flex-wrap gap-3">
              <Button
                as="a"
                href="https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih"
                target="_blank"
                rel="noopener noreferrer"
                variant="bordered"
                startContent={<Icon icon="logos:chrome" className="size-5" />}>
                {t('chromeStore')}
              </Button>
              <Button
                as="a"
                href="https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg"
                target="_blank"
                rel="noopener noreferrer"
                variant="bordered"
                startContent={<Icon icon="logos:microsoft-edge" className="size-5" />}>
                {t('edgeStore')}
              </Button>
            </div>
          </section>

          {/* Desktop App Section */}
          <section>
            <div className="mb-2 flex items-center gap-3">
              <MonitorIcon className="size-6" />
              <h2 className="text-xl font-medium">{t('desktopTitle')}</h2>
            </div>
            <p className="mb-4 text-sm text-foreground/60">{t('description')}</p>

            <div className="grid gap-4">
              {downloads.map((item) => (
                <Card key={item.platform} className="border shadow-none">
                  <CardBody className="p-5">
                    <div className="mb-3 flex items-center gap-3">
                      {item.icon}
                      <h3 className="text-lg font-medium">{item.platform}</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {item.links.map((link) => (
                        <Button
                          key={link.url}
                          as="a"
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="bordered"
                          startContent={<DownloadIcon className="size-4" />}>
                          {link.label}
                          {link.note && (
                            <span className="ml-1 text-xs text-foreground/50">({link.note})</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            <p className="mt-3 text-xs text-foreground/40">{t('moreFormats')}</p>
          </section>

          {/* Beta notice */}
          <Card className="border shadow-none">
            <CardBody className="flex flex-row items-start gap-3 p-4">
              <FlaskConicalIcon className="mt-0.5 size-5 shrink-0 text-foreground/60" />
              <div className="text-sm text-foreground/70">
                <p>{t('betaNotice')}</p>
                <Link
                  href="https://github.com/leaperone/MultiPost-Desktop-Release/issues"
                  target="_blank"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground">
                  <MessageCircleIcon className="size-3.5" />
                  {t('feedback')}
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* GitHub Release link */}
          <div className="text-center">
            <Link
              href={GITHUB_RELEASE}
              target="_blank"
              className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground">
              <ExternalLinkIcon className="size-4" />
              {t('allReleases')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
