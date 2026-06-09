import { z } from 'zod';

export interface TikTokTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  refresh_expires_in: number;
  open_id: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id: string;
  avatar_url: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  username?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export const TIKTOK_CONFIG = {
  clientKey: process.env.TIKTOK_CLIENT_KEY!,
  clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
  redirectUri: process.env.TIKTOK_REDIRECT_URI || 'https://saraclick.com/api/account/tiktok/callback',
  scopes: [
    'user.info.basic',
    'video.publish',
    'video.upload',
  ],
  authUrl: 'https://www.tiktok.com/v2/auth/authorize',
  tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
};

const nonEmptyStringSchema = z.string().min(1);

export function generateTikTokAuthUrl(state: string): string {
  const validatedState = nonEmptyStringSchema.parse(state);
  const params = new URLSearchParams({
    client_key: TIKTOK_CONFIG.clientKey,
    response_type: 'code',
    scope: TIKTOK_CONFIG.scopes.join(','),
    redirect_uri: TIKTOK_CONFIG.redirectUri,
    state: validatedState,
  });

  return `${TIKTOK_CONFIG.authUrl}?${params.toString()}`;
}

export function validateRequiredScopes(grantedScopes: string): { isValid: boolean; missingScopes: string[] } {
  const granted = nonEmptyStringSchema.parse(grantedScopes).split(',').map((scope) => scope.trim());
  const missing = TIKTOK_CONFIG.scopes.filter((requiredScope) => !granted.includes(requiredScope));

  return {
    isValid: missing.length === 0,
    missingScopes: missing,
  };
}

export async function exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
  const validatedCode = nonEmptyStringSchema.parse(code);
  const response = await fetch(TIKTOK_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: TIKTOK_CONFIG.clientKey,
      client_secret: TIKTOK_CONFIG.clientSecret,
      code: validatedCode,
      grant_type: 'authorization_code',
      redirect_uri: TIKTOK_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`TikTok token exchange failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data as TikTokTokenResponse;
}

export async function getTikTokUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const validatedAccessToken = nonEmptyStringSchema.parse(accessToken);
  const response = await fetch(
    `${TIKTOK_CONFIG.userInfoUrl}?fields=open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validatedAccessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`TikTok user info request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.user as TikTokUserInfo;
}

export async function refreshTikTokToken(refreshToken: string): Promise<TikTokTokenResponse> {
  const validatedRefreshToken = nonEmptyStringSchema.parse(refreshToken);
  const response = await fetch(TIKTOK_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: TIKTOK_CONFIG.clientKey,
      client_secret: TIKTOK_CONFIG.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: validatedRefreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`TikTok token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data as TikTokTokenResponse;
}

export async function revokeTikTokToken(accessToken: string): Promise<void> {
  const validatedAccessToken = nonEmptyStringSchema.parse(accessToken);
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: TIKTOK_CONFIG.clientKey,
      client_secret: TIKTOK_CONFIG.clientSecret,
      token: validatedAccessToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`TikTok token revocation failed: ${response.statusText}`);
  }
}
