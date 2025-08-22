'use client';

import React, { useEffect, useState } from 'react';
import { Button, Avatar, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import {
  getTikTokAccounts,
  disconnectTikTokAccount,
  refreshTikTokAccountToken,
  initiateTikTokAuth,
} from '@/actions/social-media-accounts/tiktok';
import {
  getXAccounts,
  disconnectXAccount,
  refreshXAccountToken,
  initiateXAuth,
} from '@/actions/social-media-accounts/x';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/client';

interface TikTokAccount {
  id: string;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  description: string | null;
  expiresAt: Date | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

interface XAccount {
  id: string;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  description: string | null;
  expiresAt: Date | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

interface PlatformCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  isFunctional: boolean;
  accounts?: TikTokAccount[] | XAccount[];
}

export default function SocialMediaAccountsPage() {
  const [tiktokAccounts, setTikTokAccounts] = useState<TikTokAccount[]>([]);
  const [xAccounts, setXAccounts] = useState<XAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation('settings');

  const loadTikTokAccounts = async () => {
    try {
      const accounts = await getTikTokAccounts();
      setTikTokAccounts(accounts);
    } catch (error) {
      console.error('Failed to load TikTok accounts:', error);
      toast.error(t('socialAccounts.toast.loadFailed'));
    }
  };

  const loadXAccounts = async () => {
    try {
      const accounts = await getXAccounts();
      setXAccounts(accounts);
    } catch (error) {
      console.error('Failed to load X accounts:', error);
      toast.error(t('socialAccounts.toast.loadFailed'));
    }
  };

  useEffect(() => {
    const loadAccounts = async () => {
      await Promise.all([loadTikTokAccounts(), loadXAccounts()]);
      setLoading(false);
    };
    loadAccounts();

    // Handle OAuth callback results
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const missing = searchParams.get('missing');

    if (success === 'tiktok_connected') {
      toast.success(t('socialAccounts.toast.connectedSuccess'));
      router.replace('/dashboard/settings/social-media-accounts');
    } else if (success === 'x_connected') {
      toast.success(t('socialAccounts.toast.connectedSuccess'));
      router.replace('/dashboard/settings/social-media-accounts');
    } else if (error) {
      const joinedMissing = missing ? missing.split(',').join(', ') : '';
      const errorMessages: Record<string, string> = {
        oauth_failed: t('socialAccounts.toast.oauthFailed'),
        missing_code: t('socialAccounts.toast.missingCode'),
        access_denied: t('socialAccounts.toast.accessDenied'),
        insufficient_permissions: t('socialAccounts.toast.insufficientPermissions', { missing: joinedMissing }),
      };
      toast.error(errorMessages[error] || t('socialAccounts.toast.connectError'));
      router.replace('/dashboard/settings/social-media-accounts');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  const handleConnectTikTok = async () => {
    try {
      setConnecting('tiktok');
      const { authUrl } = await initiateTikTokAuth();

      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Failed to initiate TikTok OAuth:', error);
      toast.error(t('socialAccounts.toast.connectFailed'));
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectX = async () => {
    try {
      setConnecting('x');
      const { authUrl } = await initiateXAuth();

      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Failed to initiate X OAuth:', error);
      toast.error(t('socialAccounts.toast.connectFailed'));
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnectTikTok = async (accountId: string) => {
    try {
      await disconnectTikTokAccount(accountId);
      await loadTikTokAccounts();
      toast.success(t('socialAccounts.toast.disconnectSuccess'));
    } catch (error) {
      console.error('Failed to disconnect TikTok account:', error);
      toast.error(t('socialAccounts.toast.disconnectFailed'));
    }
  };

  const handleDisconnectX = async (accountId: string) => {
    try {
      await disconnectXAccount(accountId);
      await loadXAccounts();
      toast.success(t('socialAccounts.toast.disconnectSuccess'));
    } catch (error) {
      console.error('Failed to disconnect X account:', error);
      toast.error(t('socialAccounts.toast.disconnectFailed'));
    }
  };

  const handleRefreshToken = async (accountId: string, platform: string) => {
    try {
      if (platform === 'tiktok') {
        await refreshTikTokAccountToken(accountId);
        await loadTikTokAccounts();
      } else if (platform === 'x') {
        await refreshXAccountToken(accountId);
        await loadXAccounts();
      }
      toast.success(t('socialAccounts.toast.refreshSuccess'));
    } catch (error) {
      console.error('Failed to refresh token:', error);
      toast.error(t('socialAccounts.toast.refreshFailed'));
    }
  };

  const isTokenExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expires = new Date(expiresAt);
    return expires < now;
  };

  const isTokenExpiringSoon = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expires = new Date(expiresAt);
    const timeDiff = expires.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    return daysDiff < 7 && daysDiff > 0;
  };

  // Define all platforms
  const platforms: PlatformCard[] = [
    {
      id: 'x',
      title: t('socialAccounts.x.title'),
      description: 'Share thoughts and media in real-time',
      icon: 'logos:twitter',
      isFunctional: true,
      accounts: xAccounts,
    },
    {
      id: 'tiktok',
      title: t('socialAccounts.tiktok.title'),
      description: 'Share short-form videos with your audience',
      icon: 'logos:tiktok-icon',
      isFunctional: true,
      accounts: tiktokAccounts,
    },
    {
      id: 'linkedin',
      title: t('socialAccounts.linkedin.title'),
      description: 'Share professional content and build your network',
      icon: 'logos:linkedin-icon',
      isFunctional: false,
    },
    {
      id: 'instagram',
      title: t('socialAccounts.instagram.title'),
      description: 'Share photos and videos with your audience',
      icon: 'logos:instagram-icon',
      isFunctional: false,
    },
    {
      id: 'facebook',
      title: t('socialAccounts.facebook.title'),
      description: 'Publish content to your Facebook page',
      icon: 'logos:facebook',
      isFunctional: false,
    },
    {
      id: 'youtube',
      title: t('socialAccounts.youtube.title'),
      description: 'Upload and manage your video content',
      icon: 'logos:youtube-icon',
      isFunctional: false,
    },
  ];

  const renderAccountRow = (platform: PlatformCard) => {
    if (!platform.accounts) return null;

    const isX = platform.id === 'x';
    const accounts = platform.accounts as (TikTokAccount | XAccount)[];
    const handleConnect = isX ? handleConnectX : handleConnectTikTok;
    const handleDisconnect = isX ? handleDisconnectX : handleDisconnectTikTok;
    const isLoading = connecting === platform.id;

    return (
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon
              icon="mingcute:loading-line"
              className="text-2xl text-muted-foreground"
            />
          </div>
        ) : accounts.length > 0 ? (
          accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-lg border border-border bg-background p-4 hover:shadow-md">
              <div className="flex items-center gap-4">
                <Avatar
                  src={account.avatarUrl || undefined}
                  name={account.displayName || account.username || t('socialAccounts.common.user')}
                  size="md"
                  className="shrink-0 ring-2 ring-border"
                />
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-base font-semibold">
                      {account.displayName || account.username || t('socialAccounts.common.unknown')}
                    </h4>
                    {account.metadata?.is_verified && (
                      <Icon
                        icon="mingcute:check-fill"
                        className="shrink-0 text-sm text-primary"
                      />
                    )}
                  </div>
                  {account.description && (
                    <span className="truncate text-sm text-muted-foreground">{account.description}</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isTokenExpired(account.expiresAt) && (
                    <Chip
                      size="sm"
                      color="danger"
                      variant="flat"
                      className="px-2 text-xs">
                      {t('socialAccounts.common.tokenExpired')}
                    </Chip>
                  )}
                  {isTokenExpiringSoon(account.expiresAt) && !isTokenExpired(account.expiresAt) && (
                    <Chip
                      size="sm"
                      color="warning"
                      variant="flat"
                      className="px-2 text-xs">
                      {t('socialAccounts.common.expiresSoon')}
                    </Chip>
                  )}
                  {(isTokenExpired(account.expiresAt) || isTokenExpiringSoon(account.expiresAt)) && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      className="px-3 text-sm"
                      onPress={() => handleRefreshToken(account.id, platform.id)}>
                      {t('socialAccounts.common.refreshToken')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="px-3 text-sm"
                    onPress={() => handleDisconnect(account.id)}>
                    {t('socialAccounts.common.disconnect')}
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-background p-6 text-center">
            <p className="mb-4 text-sm font-medium text-foreground">
              {isX ? t('socialAccounts.x.empty') : t('socialAccounts.tiktok.empty')}
            </p>
            <Button
              color="primary"
              variant="flat"
              size="sm"
              onPress={handleConnect}
              isLoading={isLoading}
              startContent={
                !isLoading && (
                  <Icon
                    icon="mingcute:add-line"
                    className="text-sm"
                  />
                )
              }>
              {isLoading
                ? isX
                  ? t('socialAccounts.x.connecting')
                  : t('socialAccounts.tiktok.connecting')
                : isX
                  ? t('socialAccounts.x.connect')
                  : t('socialAccounts.tiktok.connect')}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderComingSoonRow = (platform: PlatformCard) => (
    <div className="rounded-lg border border-border bg-background p-4 opacity-60 grayscale">
      <div className="flex items-center gap-4">
        <Icon
          icon={platform.icon}
          className="shrink-0 text-2xl text-muted-foreground"
        />
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <h3 className="text-base font-semibold">{platform.title}</h3>
          <p className="text-sm text-muted-foreground">{platform.description}</p>
        </div>
        <Chip
          size="sm"
          color="default"
          variant="flat"
          className="shrink-0 text-xs">
          Coming Soon
        </Chip>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">{t('socialAccounts.title')}</h1>
        <p className="text-muted-foreground">{t('socialAccounts.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {platforms.map((platform) => (
          <div key={platform.id}>
            {platform.isFunctional ? renderAccountRow(platform) : renderComingSoonRow(platform)}
          </div>
        ))}
      </div>
    </div>
  );
}
