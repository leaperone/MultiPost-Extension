import { Button, Card } from '@heroui/react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, Globe, Shield, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { sendRequest } from '@/lib/extension';
import { cn } from '@/lib/utils';
import { useTranslation } from '../../../../i18n/client';

interface TrustedDomain {
  id: string;
  domain: string;
}

interface TrustedDomainsResponse {
  trustedDomains: TrustedDomain[];
}

interface DeleteDomainResponse {
  success: boolean;
  message?: string;
  trustedDomains?: TrustedDomain[];
}

export const Route = createFileRoute('/dashboard/settings/_tabs/trust-domains')({
  component: TrustDomainsPage,
});

function TrustDomainsPage() {
  const { t } = useTranslation('settings');
  const [domains, setDomains] = useState<TrustedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTrustedDomains = async () => {
    if (!mounted) return;

    try {
      setIsLoading(true);
      const response = await sendRequest<void, TrustedDomainsResponse>(
        'MUTLIPOST_EXTENSION_GET_TRUSTED_DOMAINS',
        undefined,
        10000,
      );

      if (response && Array.isArray(response.trustedDomains)) {
        setDomains(response.trustedDomains);
      } else {
        setDomains([]);
      }
      setError(null);
    } catch {
      setError('Failed to fetch trusted domains list');
      setDomains([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!mounted) return;

    if (!domainId) {
      setError('Domain ID is required');
      return;
    }

    try {
      setIsLoading(true);
      const response = await sendRequest<{ domainId: string }, DeleteDomainResponse>(
        'MUTLIPOST_EXTENSION_DELETE_TRUSTED_DOMAIN',
        { domainId },
      );

      if (response?.success) {
        if (Array.isArray(response.trustedDomains)) {
          setDomains(response.trustedDomains);
        } else {
          await fetchTrustedDomains();
        }
        setError(null);
      } else {
        setError(response?.message || 'Failed to delete domain');
      }
    } catch {
      setError('Failed to delete domain');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      void fetchTrustedDomains();
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded-2xl bg-default-100" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-2xl bg-default-50" />
        </div>
        <Card className="border p-6 shadow-none">
          <div className="h-10 w-full animate-pulse rounded-xl bg-default-100" />
        </Card>
      </div>
    );
  }

  const safeDomains = Array.isArray(domains) ? domains : [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('trust_domains.page.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('trust_domains.page.description')}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border p-5 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('trust_domains.stats.domain_count')}</p>
              <p className="text-2xl font-bold text-foreground">{safeDomains.length}</p>
            </div>
          </div>
        </Card>
        <Card className="border p-5 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Globe className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('trust_domains.stats.security_status')}</p>
              <p className="text-2xl font-bold text-foreground">
                {safeDomains.length > 0
                  ? t('trust_domains.status_labels.configured')
                  : t('trust_domains.status_labels.not_configured')}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border p-5 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('trust_domains.stats.extension_status')}</p>
              <p className="text-2xl font-bold text-foreground">
                {mounted
                  ? t('trust_domains.status_labels.connected')
                  : t('trust_domains.status_labels.disconnected')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border p-6 shadow-none">
        <h2 className="mb-6 text-xl font-semibold text-foreground/90">
          {t('trust_domains.domains_list.title')}
        </h2>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {safeDomains.length === 0 ? (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-default-100">
                <Shield className="size-8 text-foreground/40" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground/90">
                  {t('trust_domains.domains_list.empty.title')}
                </h3>
                <p className="mt-1 text-sm text-foreground/60">
                  {t('trust_domains.domains_list.empty.description')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {safeDomains.map((domain) => (
              <div
                key={domain.id || domain.domain}
                className={cn(
                  'flex items-center justify-between rounded-xl p-4 transition-all',
                  'border bg-default-100 hover:bg-default-200',
                )}>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/20">
                    <Globe className="size-4 text-blue-500 dark:text-blue-400" />
                  </div>
                  <span className="font-mono text-foreground/90">{domain.domain}</span>
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  variant="light"
                  isLoading={isLoading}
                  onPress={() => {
                    if (!domain.id) {
                      setError('No domain ID available');
                      return;
                    }
                    void handleDeleteDomain(domain.id);
                  }}
                  className="shadow-none">
                  <XIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
