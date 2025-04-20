'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, CardBody } from '@heroui/react';
import { XIcon } from 'lucide-react';
import { sendRequest } from '@/lib/extension';

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
      <div className="flex flex-col gap-4">
        <Card className="bg-default-50 shadow-none">
          <CardBody>
            <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // 确保domains始终是数组
  const safeDomains = Array.isArray(domains) ? domains : [];

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-default-50 shadow-none">
        <CardBody>
          {error && <p className="mb-4 text-sm text-danger">{error}</p>}

          {safeDomains.length === 0 ? (
            <p className="text-center text-gray-500">No trusted domains yet</p>
          ) : (
            <div className="space-y-2">
              {safeDomains.map((domain) => (
                <div
                  key={domain.id || domain.domain}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <span className="font-mono">{domain.domain}</span>
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
                    }}>
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
