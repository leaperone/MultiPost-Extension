import { Button, Card } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, Globe, Shield, XIcon } from 'lucide-react';

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

const TRUSTED_DOMAINS_QUERY_KEY = ['extension', 'trusted-domains'] as const;

function TrustDomainsPage() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  const domainsQuery = useQuery({
    queryKey: TRUSTED_DOMAINS_QUERY_KEY,
    queryFn: async () => {
      const response = await sendRequest<void, TrustedDomainsResponse>(
        'MUTLIPOST_EXTENSION_GET_TRUSTED_DOMAINS',
        undefined,
        10000,
      );
      return Array.isArray(response?.trustedDomains) ? response.trustedDomains : [];
    },
  });

  const deleteDomain = useMutation({
    mutationFn: async (domainId: string) => {
      const response = await sendRequest<{ domainId: string }, DeleteDomainResponse>(
        'MUTLIPOST_EXTENSION_DELETE_TRUSTED_DOMAIN',
        { domainId },
      );
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to delete domain');
      }
      return response.trustedDomains;
    },
    onSuccess: (nextDomains) => {
      if (Array.isArray(nextDomains)) {
        queryClient.setQueryData(TRUSTED_DOMAINS_QUERY_KEY, nextDomains);
      } else {
        void queryClient.invalidateQueries({ queryKey: TRUSTED_DOMAINS_QUERY_KEY });
      }
    },
  });

  const error = domainsQuery.isError
    ? 'Failed to fetch trusted domains list'
    : deleteDomain.error?.message ?? null;

  if (domainsQuery.isPending) {
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

  const safeDomains = domainsQuery.data ?? [];

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
                {domainsQuery.isSuccess
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
                  isLoading={deleteDomain.isPending}
                  onPress={() => {
                    if (!domain.id) return;
                    deleteDomain.mutate(domain.id);
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
