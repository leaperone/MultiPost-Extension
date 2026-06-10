import { createFileRoute } from '@tanstack/react-router';
import { SocialMediaAccount } from '@db/schema/schema';

import {
  exchangeCodeForToken,
  getXUserInfo,
  validateRequiredScopes,
} from '../../../../actions/social-media-accounts/x/oauth';
import { db } from '../../../../lib/db';
import { redirectToSettings, requireOAuthSession } from '../-oauth';

export const Route = createFileRoute('/api/account/x/callback')({
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

    const codeVerifier = process.env.X_CODE_VERIFIER!;
    const tokenData = await exchangeCodeForToken(code, codeVerifier);

    const scopeValidation = validateRequiredScopes(tokenData.scope);
    if (!scopeValidation.isValid) {
      console.error('Missing required X scopes:', scopeValidation.missingScopes);
      return redirectToSettings(
        request,
        `?error=insufficient_permissions&missing=${scopeValidation.missingScopes.join(',')}`,
      );
    }

    const userInfo = await getXUserInfo(tokenData.access_token);
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000);

    const metadata = {
      verified: userInfo.verified ?? null,
      followers_count: userInfo.followers_count ?? null,
      following_count: userInfo.following_count ?? null,
      tweet_count: userInfo.tweet_count ?? null,
      listed_count: userInfo.listed_count ?? null,
    };

    await db
      .insert(SocialMediaAccount)
      .values({
        userId: session.user.id,
        platform: 'x',
        platformId: userInfo.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        expiresAt,
        username: userInfo.username,
        displayName: userInfo.name,
        avatarUrl: userInfo.profile_image_url,
        description: userInfo.description,
        isActive: true,
        metadata,
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
          username: userInfo.username,
          displayName: userInfo.name,
          avatarUrl: userInfo.profile_image_url,
          description: userInfo.description,
          isActive: true,
          metadata,
          updatedAt: new Date(),
        },
      });

    return redirectToSettings(request, '?success=x_connected');
  } catch (error) {
    console.error('X OAuth callback error:', error);
    return redirectToSettings(request, '?error=oauth_failed');
  }
}
