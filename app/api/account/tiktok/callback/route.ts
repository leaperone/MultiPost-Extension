import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  exchangeCodeForToken,
  getTikTokUserInfo,
  validateRequiredScopes,
} from '@/actions/social-media-accounts/tiktok/oauth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL(`${process.env.APP_URL}/signin`, request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    // const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(
          `${process.env.APP_URL}/dashboard/settings/social-media-accounts?error=${encodeURIComponent(error)}`,
          request.url,
        ),
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(`${process.env.APP_URL}/dashboard/settings/social-media-accounts?error=missing_code`, request.url),
      );
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // 验证是否获得了所有必需的权限
    const scopeValidation = validateRequiredScopes(tokenData.scope);
    if (!scopeValidation.isValid) {
      console.error('Missing required TikTok scopes:', scopeValidation.missingScopes);
      return NextResponse.redirect(
        new URL(
          `${process.env.APP_URL}/dashboard/settings/social-media-accounts?error=insufficient_permissions&missing=${scopeValidation.missingScopes.join(',')}`,
          request.url,
        ),
      );
    }

    // Get user info from TikTok
    const userInfo = await getTikTokUserInfo(tokenData.access_token);

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Check if account already exists
    const existingAccount = await prisma.socialMediaAccount.findUnique({
      where: {
        userId_platform_platformId: {
          userId: session.user.id,
          platform: 'tiktok',
          platformId: userInfo.open_id,
        },
      },
    });

    if (existingAccount) {
      // Update existing account
      await prisma.socialMediaAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          expiresAt,
          username: userInfo.username || userInfo.display_name,
          displayName: userInfo.display_name,
          avatarUrl: userInfo.avatar_url,
          isActive: true,
          metadata: {
            ...userInfo,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new account
      await prisma.socialMediaAccount.create({
        data: {
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
          metadata: {
            ...userInfo,
          },
        },
      });
    }

    // Redirect back to social media accounts page with success
    return NextResponse.redirect(
      new URL(`${process.env.APP_URL}/dashboard/settings/social-media-accounts?success=tiktok_connected`, request.url),
    );
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`${process.env.APP_URL}/dashboard/settings/social-media-accounts?error=oauth_failed`, request.url),
    );
  }
}
