import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { exchangeCodeForToken, getXUserInfo, validateRequiredScopes } from '@/actions/social-media-accounts/x/oauth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL(`${process.env.APP_URL}/signin`, request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
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

    // 使用固定的codeVerifier，与generatePKCE函数中的值保持一致
    const codeVerifier = process.env.X_CODE_VERIFIER!;

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code, codeVerifier);

    // Validate that we got the required tweet.write scope
    const scopeValidation = validateRequiredScopes(tokenData.scope);
    if (!scopeValidation.isValid) {
      console.error('Missing required X scopes:', scopeValidation.missingScopes);
      return NextResponse.redirect(
        new URL(
          `${process.env.APP_URL}/dashboard/settings/social-media-accounts?error=insufficient_permissions&missing=${scopeValidation.missingScopes.join(',')}`,
          request.url,
        ),
      );
    }

    // Get user info from X
    const userInfo = await getXUserInfo(tokenData.access_token);

    // Calculate token expiration (X tokens typically expire in 2 hours)
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000);

    // Check if account already exists
    const existingAccount = await prisma.socialMediaAccount.findUnique({
      where: {
        userId_platform_platformId: {
          userId: session.user.id,
          platform: 'x',
          platformId: userInfo.id,
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
          username: userInfo.username,
          displayName: userInfo.name,
          avatarUrl: userInfo.profile_image_url,
          description: userInfo.description,
          isActive: true,
          metadata: {
            verified: userInfo.verified,
            followers_count: userInfo.followers_count,
            following_count: userInfo.following_count,
            tweet_count: userInfo.tweet_count,
            listed_count: userInfo.listed_count,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new account
      await prisma.socialMediaAccount.create({
        data: {
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
          metadata: {
            verified: userInfo.verified,
            followers_count: userInfo.followers_count,
            following_count: userInfo.following_count,
            tweet_count: userInfo.tweet_count,
            listed_count: userInfo.listed_count,
          },
        },
      });
    }

    // Redirect back to social media accounts page with success
    return NextResponse.redirect(
      new URL(`${process.env.APP_URL}/dashboard/settings/social-media-accounts?success=x_connected`, request.url),
    );
  } catch (error) {
    console.error('X OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`${process.env.APP_URL}/dashboard/settings/social-media-accounts?error=oauth_failed`, request.url),
    );
  }
}
