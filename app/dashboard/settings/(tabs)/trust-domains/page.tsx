'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { XIcon, Shield, Globe, AlertTriangle } from 'lucide-react';
import { sendRequest } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';
import {
  LiquidGlassCard,
  LiquidGlassHeader,
  LiquidGlassStatCard,
} from '@/components/ui/liquid-glass';
import { cn } from '@/lib/utils';

// 域名接口定义
interface TrustedDomain {
  id: string;
  domain: string;
}

// 请求响应接口
interface TrustedDomainsResponse {
  trustedDomains: TrustedDomain[];
}

// 删除域名接口
interface DeleteDomainResponse {
  success: boolean;
  message?: string;
  trustedDomains?: TrustedDomain[];
}

export default function TrustDomainsPage() {
  const { t } = useTranslation('settings');
  // 使用useState而不是直接从window获取值，避免服务器/客户端分支问题
  const [domains, setDomains] = useState<TrustedDomain[]>([]); // 默认为空数组
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 等待客户端挂载完成后再进行渲染和数据获取
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取信任域名列表
  const fetchTrustedDomains = async () => {
    if (!mounted) return; // 确保只在客户端执行

    try {
      setIsLoading(true);
      const response = await sendRequest<void, TrustedDomainsResponse>(
        'MUTLIPOST_EXTENSION_GET_TRUSTED_DOMAINS',
        undefined,
        10000,
      );

      console.log('Trusted domains response:', response);

      // 确保始终设置为数组
      if (response && Array.isArray(response.trustedDomains)) {
        setDomains(response.trustedDomains);
      } else {
        console.error('Invalid response format:', response);
        setDomains([]);
      }
      setError(null);
    } catch (error) {
      console.error('Failed to fetch trusted domains:', error);
      setError('Failed to fetch trusted domains list');
      // 发生错误时重置为空数组
      setDomains([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除信任域名
  const handleDeleteDomain = async (domainId: string) => {
    if (!mounted) return; // 确保只在客户端执行

    if (!domainId) {
      setError('Domain ID is required');
      return;
    }

    console.log('Deleting domain with ID:', domainId);

    try {
      setIsLoading(true);

      // 明确定义与后端API匹配的请求结构
      const data = {
        domainId: domainId,
      };

      console.log('Sending delete request with data:', data);

      const response = await sendRequest<{ domainId: string }, DeleteDomainResponse>(
        'MUTLIPOST_EXTENSION_DELETE_TRUSTED_DOMAIN',
        data,
      );

      console.log('Delete domain response:', response);

      if (response?.success) {
        // 如果API返回了更新后的域名列表，直接使用
        if (response && Array.isArray(response.trustedDomains)) {
          setDomains(response.trustedDomains);
        } else {
          // 否则重新获取列表
          await fetchTrustedDomains();
        }
        setError(null);
      } else {
        setError(response?.message || 'Failed to delete domain');
      }
    } catch (error) {
      console.error('Failed to delete domain:', error);
      setError('Failed to delete domain');
    } finally {
      setIsLoading(false);
    }
  };

  // 只在客户端挂载后获取数据，避免服务器端获取
  useEffect(() => {
    if (mounted) {
      fetchTrustedDomains();
    }
  }, [mounted]);

  // 完全客户端渲染，避免水合错误
  if (!mounted) {
    // 返回一个骨架屏或加载指示器而不是null，确保DOM结构一致
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded-2xl bg-white/10 dark:bg-black/20"></div>
          <div className="mt-2 h-4 w-64 animate-pulse rounded-2xl bg-white/5 dark:bg-black/10"></div>
        </div>
        <LiquidGlassCard className="p-6">
          <div className="h-10 w-full animate-pulse rounded-xl bg-white/10 dark:bg-black/20"></div>
        </LiquidGlassCard>
      </div>
    );
  }

  // 确保domains始终是数组
  const safeDomains = Array.isArray(domains) ? domains : [];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header Section */}
      <LiquidGlassHeader
        title={t('trust_domains.page.title')}
        description={t('trust_domains.page.description')}
      />

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <LiquidGlassStatCard
          icon={<Shield className="size-5" />}
          iconColor="primary"
          label={t('trust_domains.stats.domain_count')}
          value={safeDomains.length}
        />
        <LiquidGlassStatCard
          icon={<Globe className="size-5" />}
          iconColor="success"
          label={t('trust_domains.stats.security_status')}
          value={
            safeDomains.length > 0
              ? t('trust_domains.status_labels.configured')
              : t('trust_domains.status_labels.not_configured')
          }
        />
        <LiquidGlassStatCard
          icon={<AlertTriangle className="size-5" />}
          iconColor="warning"
          label={t('trust_domains.stats.extension_status')}
          value={mounted ? t('trust_domains.status_labels.connected') : t('trust_domains.status_labels.disconnected')}
        />
      </div>

      {/* Domains List */}
      <LiquidGlassCard className="p-6">
        <h2 className="mb-6 text-xl font-semibold text-foreground/90">{t('trust_domains.domains_list.title')}</h2>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {safeDomains.length === 0 ? (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10 dark:bg-black/20">
                <Shield className="size-8 text-foreground/40" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground/90">{t('trust_domains.domains_list.empty.title')}</h3>
                <p className="mt-1 text-sm text-foreground/60">{t('trust_domains.domains_list.empty.description')}</p>
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
                  'bg-white/10 dark:bg-black/20',
                  'border border-white/20 dark:border-white/10',
                  'hover:bg-white/15 dark:hover:bg-black/30',
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
                    handleDeleteDomain(domain.id);
                  }}
                  className="shadow-none">
                  <XIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </LiquidGlassCard>
    </div>
  );
}
