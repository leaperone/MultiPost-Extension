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
import {
  getFacebookPageAccounts,
  disconnectFacebookPageAccount,
  initiateFacebookPagesAuth,
} from '@/actions/social-media-accounts/facebook-pages';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/client';
import { Card } from '@heroui/react';
import { cn } from '@/lib/utils';

interface TikTokAccount {
  id: string;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  description: string | null;
  expiresAt: Date | null;
   
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
   
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

interface FacebookAccount {
  id: string;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  description: string | null;
  expiresAt: Date | null;
   
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
  accounts?: TikTokAccount[] | XAccount[] | FacebookAccount[];
}

export default function SocialMediaAccountsPage() {
  const [tiktokAccounts, setTikTokAccounts] = useState<TikTokAccount[]>([]);
  const [xAccounts, setXAccounts] = useState<XAccount[]>([]);
  const [facebookAccounts, setFacebookAccounts] = useState<FacebookAccount[]>([]);
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

  const loadFacebookAccounts = async () => {
    try {
      const accounts = await getFacebookPageAccounts();
      setFacebookAccounts(accounts);
    } catch (error) {
      console.error('Failed to load Facebook page accounts:', error);
      toast.error(t('socialAccounts.toast.loadFailed'));
    }
  };

  useEffect(() => {
    const loadAccounts = async () => {
      await Promise.all([loadTikTokAccounts(), loadXAccounts(), loadFacebookAccounts()]);
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
    } else if (success === 'facebook_connected') {
      toast.success(t('socialAccounts.toast.connectedSuccess'));
      router.replace('/dashboard/settings/social-media-accounts');
    } else if (error) {
      const joinedMissing = missing ? missing.split(',').join(', ') : '';
      const errorMessages: Record<string, string> = {
        oauth_failed: t('socialAccounts.toast.oauthFailed'),
        missing_code: t('socialAccounts.toast.missingCode'),
        access_denied: t('socialAccounts.toast.accessDenied'),
        insufficient_permissions: t('socialAccounts.toast.insufficientPermissions', { missing: joinedMissing }),
        facebook_session_expired: t('socialAccounts.facebook.sessionExpired'),
        oauth_state_mismatch: t('socialAccounts.toast.oauthFailed'),
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

  const handleConnectFacebook = async () => {
    try {
      setConnecting('facebook-pages');
      const { authUrl } = await initiateFacebookPagesAuth();

      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Failed to initiate Facebook OAuth:', error);
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

  const handleDisconnectFacebook = async (accountId: string) => {
    try {
      await disconnectFacebookPageAccount(accountId);
      await loadFacebookAccounts();
      toast.success(t('socialAccounts.toast.disconnectSuccess'));
    } catch (error) {
      console.error('Failed to disconnect Facebook page:', error);
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
      id: 'facebook-pages',
      title: t('socialAccounts.facebook.title'),
      description: 'Publish content to your Facebook page',
      icon: 'logos:facebook',
      isFunctional: true,
      accounts: facebookAccounts,
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
    const isTikTok = platform.id === 'tiktok';
    const isFacebook = platform.id === 'facebook-pages';
    const accounts = platform.accounts as (TikTokAccount | XAccount | FacebookAccount)[];
    const handleConnect = isX ? handleConnectX : isFacebook ? handleConnectFacebook : handleConnectTikTok;
    const handleDisconnect = isX ? handleDisconnectX : isFacebook ? handleDisconnectFacebook : handleDisconnectTikTok;
    const isLoading = connecting === platform.id;
    const showRefreshButton = isX || isTikTok;
    const emptyCopy = isX
      ? t('socialAccounts.x.empty')
      : isFacebook
        ? t('socialAccounts.facebook.empty')
        : t('socialAccounts.tiktok.empty');
    const connectLabel = isX
      ? t('socialAccounts.x.connect')
      : isFacebook
        ? t('socialAccounts.facebook.connect')
        : t('socialAccounts.tiktok.connect');
    const connectingLabel = isX
      ? t('socialAccounts.x.connecting')
      : isFacebook
        ? t('socialAccounts.facebook.connecting')
        : t('socialAccounts.tiktok.connecting');

    return (
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon icon="mingcute:loading-line" className="text-2xl text-muted-foreground" />
          </div>
        ) : accounts.length > 0 ? (
          accounts.map((account) => {
            const isVerified =
              (isTikTok || isX) && Boolean((account as TikTokAccount | XAccount).metadata?.is_verified);
            const pageCategory = isFacebook ? (account as FacebookAccount).metadata?.category : undefined;
            const pageLink = isFacebook ? (account as FacebookAccount).metadata?.link : undefined;
            return (
              <div
                key={account.id}
                className={cn(
                  'rounded-xl p-4 transition-all',
                  'bg-default-50',
                  'border',
                  'hover:bg-default-100',
                )}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Icon icon={platform.icon} className="shrink-0 text-xl text-muted-foreground" />
                    <Avatar
                      src={account.avatarUrl || undefined}
                      name={account.displayName || account.username || t('socialAccounts.common.user')}
                      size="md"
                      className="shrink-0"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {isFacebook && pageLink ? (
                          <a
                            href={pageLink}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-base font-semibold text-blue-500 underline-offset-2 hover:underline dark:text-blue-400">
                            {account.displayName || account.username || t('socialAccounts.common.unknown')}
                          </a>
                        ) : (
                          <h4 className="truncate text-base font-semibold text-foreground">
                            {account.displayName || account.username || t('socialAccounts.common.unknown')}
                          </h4>
                        )}
                        {isVerified && (
                          <Icon icon="mingcute:check-fill" className="shrink-0 text-sm text-blue-500" />
                        )}
                      </div>
                    </div>
                    {(account.description || (isFacebook && pageCategory)) && (
                      <span className="truncate text-sm text-muted-foreground">
                        {isFacebook && pageCategory ? pageCategory : account.description}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {showRefreshButton && isTokenExpired(account.expiresAt) && (
                      <Chip size="sm" color="danger" variant="flat" className="px-2 text-xs">
                        {t('socialAccounts.common.tokenExpired')}
                      </Chip>
                    )}
                    {showRefreshButton &&
                      isTokenExpiringSoon(account.expiresAt) &&
                      !isTokenExpired(account.expiresAt) && (
                        <Chip size="sm" color="warning" variant="flat" className="px-2 text-xs">
                          {t('socialAccounts.common.expiresSoon')}
                        </Chip>
                      )}
                    {showRefreshButton &&
                      (isTokenExpired(account.expiresAt) || isTokenExpiringSoon(account.expiresAt)) && (
                        <Button
                          size="sm"
                          color="primary"
                          variant="flat"
                          className="px-3 text-sm shadow-none"
                          onPress={() => handleRefreshToken(account.id, platform.id)}>
                          {t('socialAccounts.common.refreshToken')}
                        </Button>
                      )}
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      className="px-3 text-sm shadow-none"
                      onPress={() => handleDisconnect(account.id)}>
                      {t('socialAccounts.common.disconnect')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className={cn(
              'rounded-xl border p-6 text-center',
              'bg-default-50',
            )}>
            <p className="mb-4 text-sm font-medium text-foreground">{emptyCopy}</p>
            <Button variant="solid" onPress={handleConnect} isDisabled={isLoading}>
              {!isLoading && <Icon icon="mingcute:add-line" className="mr-2 text-sm" />}
              {isLoading ? connectingLabel : connectLabel}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderComingSoonRow = (platform: PlatformCard) => (
    <div
      className={cn(
        'rounded-xl p-4 opacity-60 grayscale',
        'bg-default-50',
        'border',
      )}>
      <div className="flex items-center gap-4">
        <Icon icon={platform.icon} className="shrink-0 text-2xl text-muted-foreground" />
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <h3 className="text-base font-semibold text-foreground">{platform.title}</h3>
          <p className="text-sm text-muted-foreground">{platform.description}</p>
        </div>
        <Chip size="sm" color="default" variant="flat" className="shrink-0 text-xs">
          Coming Soon
        </Chip>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('socialAccounts.title')}</h1>
          <p className="text-muted-foreground">{t('socialAccounts.subtitle')}</p>
        </div>
      </div>

      <Card className="shadow-none border space-y-4 p-6">
        {platforms.map((platform) => (
          <div key={platform.id}>
            {platform.isFunctional ? renderAccountRow(platform) : renderComingSoonRow(platform)}
          </div>
        ))}
      </Card>
    </div>
  );
}
