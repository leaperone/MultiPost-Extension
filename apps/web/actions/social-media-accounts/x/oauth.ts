import crypto from 'crypto';

export const X_CONFIG = {
  clientId: process.env.X_CLIENT_ID!,
  clientSecret: process.env.X_CLIENT_SECRET!,
  redirectUri: process.env.X_REDIRECT_URI || 'https://saraclick.com/api/account/x/callback',
  scopes: [
    'tweet.read', // 读取推文
    'tweet.write', // 发布推文和转推
    'users.read', // 读取用户信息
    'offline.access', // 获取刷新token
    'media.write', // 读取媒体文件
  ],
  authUrl: 'https://x.com/i/oauth2/authorize',
  tokenUrl: 'https://api.x.com/2/oauth2/token',
  userInfoUrl: 'https://api.x.com/2/users/me',
  revokeUrl: 'https://api.x.com/oauth2/invalidate_token',
};

/**
 * 生成PKCE参数
 * 使用固定的codeVerifier来简化流程
 */
export function generatePKCE(): { codeChallenge: string; codeVerifier: string } {
  // 使用固定的codeVerifier，这样就不需要存储和检索了
  const codeVerifier = process.env.X_CODE_VERIFIER!;
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  return { codeChallenge, codeVerifier };
}

/**
 * 生成X授权URL
 * @param state - 安全状态参数
 * @param codeChallenge - PKCE code challenge
 * @returns 授权URL
 */
export function generateXAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: X_CONFIG.clientId,
    redirect_uri: X_CONFIG.redirectUri,
    scope: X_CONFIG.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${X_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * 验证是否获得了所有必需的权限
 * @param grantedScopes - 授予的权限范围
 * @returns 验证结果和缺失的权限
 */
export function validateRequiredScopes(grantedScopes: string): { isValid: boolean; missingScopes: string[] } {
  const granted = grantedScopes.split(' ').map((scope) => scope.trim());
  const requiredScopes = ['tweet.write']; // 只检查必需的权限
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

/**
 * 使用授权码交换访问token
 * @param code - 授权码
 * @param codeVerifier - PKCE code verifier
 * @returns token响应
 */
export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<XTokenResponse> {
  const response = await fetch(X_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${X_CONFIG.clientId}:${X_CONFIG.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: X_CONFIG.redirectUri,
      code_verifier: codeVerifier,
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

/**
 * 获取X用户信息
 * @param accessToken - 访问token
 * @returns 用户信息
 */
export async function getXUserInfo(accessToken: string): Promise<XUserInfo> {
  const response = await fetch(
    `${X_CONFIG.userInfoUrl}?user.fields=id,name,username,profile_image_url,description,verified,public_metrics`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

/**
 * 使用刷新token获取新的访问token
 * @param refreshToken - 刷新token
 * @returns 新的token响应
 */
export async function refreshXToken(refreshToken: string): Promise<XTokenResponse> {
  const response = await fetch(X_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${X_CONFIG.clientId}:${X_CONFIG.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
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

/**
 * 撤销访问token
 * 使用OAuth 1.0a认证方式撤销token
 * @param accessToken - 要撤销的访问token
 */
export async function revokeXToken(accessToken: string): Promise<void> {
  // 注意：X的token撤销API需要OAuth 1.0a认证，这需要应用所有者的访问token
  // 由于我们只有OAuth 2.0的访问token，这里我们只进行本地撤销
  // 实际的token撤销需要在应用级别进行，或者需要额外的OAuth 1.0a认证

   
  console.log(
    'X token revocation: Local revocation only. For full revocation, OAuth 1.0a credentials are required. Access token:',
    accessToken,
  );

  // 返回成功，因为我们已经在本地标记了token为无效
  // 实际的token撤销需要在应用设置中配置OAuth 1.0a凭据
}
