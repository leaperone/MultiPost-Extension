import { createFileRoute } from '@tanstack/react-router';
import { SocialMediaAccount } from '@db/schema/schema';

import {
  exchangeCodeForToken,
  getTikTokUserInfo,
  validateRequiredScopes,
} from '../../../../actions/social-media-accounts/tiktok/oauth';
import { db } from '../../../../lib/db';
import { redirectToSettings, requireOAuthSession } from '../-oauth';

export const Route = createFileRoute('/api/account/tiktok/callback')({
  server: {
    handlers: {
      GET,
    },
  },
});

async function GET({ request }: { request: Request }) {
  try {
    const { session, response } = await requireOAuthSession(request);
    if (!session) {
      return response;
    }

    const searchParams = new URL(request.url).searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return redirectToSettings(request, `?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return redirectToSettings(request, '?error=missing_code');
    }

    const tokenData = await exchangeCodeForToken(code);
    const scopeValidation = validateRequiredScopes(tokenData.scope);
    if (!scopeValidation.isValid) {
      console.error('Missing required TikTok scopes:', scopeValidation.missingScopes);
      return redirectToSettings(
        request,
        `?error=insufficient_permissions&missing=${scopeValidation.missingScopes.join(',')}`,
      );
    }

    const userInfo = await getTikTokUserInfo(tokenData.access_token);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await db
      .insert(SocialMediaAccount)
      .values({
        userId: session.user.id,
        platform: 'tiktok',
        platformId: userInfo.open_id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        expiresAt,
        username: userInfo.username || userInfo.display_name,
        displayName: userInfo.display_name,
        avatarUrl: userInfo.avatar_url,
        isActive: true,
        metadata: { ...userInfo },
      })
      .onConflictDoUpdate({
        target: [
          SocialMediaAccount.userId,
          SocialMediaAccount.platform,
          SocialMediaAccount.platformId,
        ],
        set: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          expiresAt,
          username: userInfo.username || userInfo.display_name,
          displayName: userInfo.display_name,
          avatarUrl: userInfo.avatar_url,
          isActive: true,
          metadata: { ...userInfo },
          updatedAt: new Date(),
        },
      });

    return redirectToSettings(request, '?success=tiktok_connected');
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    return redirectToSettings(request, '?error=oauth_failed');
  }
}
