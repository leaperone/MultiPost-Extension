import crypto from 'crypto';
import { z } from 'zod';

export const X_CONFIG = {
  clientId: process.env.X_CLIENT_ID!,
  clientSecret: process.env.X_CLIENT_SECRET!,
  redirectUri: process.env.X_REDIRECT_URI || 'https://saraclick.com/api/account/x/callback',
  scopes: [
    'tweet.read',
    'tweet.write',
    'users.read',
    'offline.access',
    'media.write',
  ],
  authUrl: 'https://x.com/i/oauth2/authorize',
  tokenUrl: 'https://api.x.com/2/oauth2/token',
  userInfoUrl: 'https://api.x.com/2/users/me',
  revokeUrl: 'https://api.x.com/oauth2/invalidate_token',
};

const nonEmptyStringSchema = z.string().min(1);

export function generatePKCE(): { codeChallenge: string; codeVerifier: string } {
  const codeVerifier = process.env.X_CODE_VERIFIER!;
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  return { codeChallenge, codeVerifier };
}

export function generateXAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: X_CONFIG.clientId,
    redirect_uri: X_CONFIG.redirectUri,
    scope: X_CONFIG.scopes.join(' '),
    state: nonEmptyStringSchema.parse(state),
    code_challenge: nonEmptyStringSchema.parse(codeChallenge),
    code_challenge_method: 'S256',
  });

  return `${X_CONFIG.authUrl}?${params.toString()}`;
}

export function validateRequiredScopes(grantedScopes: string): { isValid: boolean; missingScopes: string[] } {
  const granted = nonEmptyStringSchema.parse(grantedScopes).split(' ').map((scope) => scope.trim());
  const requiredScopes = ['tweet.write'];
  const missing = requiredScopes.filter((requiredScope) => !granted.includes(requiredScope));

  return {
    isValid: missing.length === 0,
    missingScopes: missing,
  };
}

export interface XTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface XUserInfo {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  verified?: boolean;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  listed_count?: number;
}

export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<XTokenResponse> {
  const response = await fetch(X_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${X_CONFIG.clientId}:${X_CONFIG.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: nonEmptyStringSchema.parse(code),
      redirect_uri: X_CONFIG.redirectUri,
      code_verifier: nonEmptyStringSchema.parse(codeVerifier),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('X token exchange failed:', errorData);
    throw new Error(`X token exchange failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data as XTokenResponse;
}

export async function getXUserInfo(accessToken: string): Promise<XUserInfo> {
  const response = await fetch(
    `${X_CONFIG.userInfoUrl}?user.fields=id,name,username,profile_image_url,description,verified,public_metrics`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${nonEmptyStringSchema.parse(accessToken)}`,
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('X user info request failed:', errorData);
    throw new Error(`X user info request failed: ${response.statusText}`);
  }

  const data = await response.json();
  const user = data.data;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    profile_image_url: user.profile_image_url,
    description: user.description,
    verified: user.verified,
    followers_count: user.public_metrics?.followers_count,
    following_count: user.public_metrics?.following_count,
    tweet_count: user.public_metrics?.tweet_count,
    listed_count: user.public_metrics?.listed_count,
  };
}

export async function refreshXToken(refreshToken: string): Promise<XTokenResponse> {
  const response = await fetch(X_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${X_CONFIG.clientId}:${X_CONFIG.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: nonEmptyStringSchema.parse(refreshToken),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('X token refresh failed:', errorData);
    throw new Error(`X token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data as XTokenResponse;
}

export async function revokeXToken(accessToken: string): Promise<void> {
  console.log(
    'X token revocation: Local revocation only. For full revocation, OAuth 1.0a credentials are required. Access token:',
    nonEmptyStringSchema.parse(accessToken),
  );
}
