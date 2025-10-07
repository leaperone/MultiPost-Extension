import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  debugFacebookToken,
  exchangeCodeForFacebookUserToken,
} from '@/actions/social-media-accounts/facebook-pages/oauth';
import { updateFacebookUserAccountAfterOAuth } from '@/actions/social-media-accounts/facebook-pages';

function redirectToSettings(request: NextRequest, search: string) {
  return NextResponse.redirect(
    new URL(`${process.env.APP_URL}/dashboard/settings/social-media-accounts${search}`, request.url),
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL(`${process.env.APP_URL}/signin`, request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return redirectToSettings(request, `?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return redirectToSettings(request, '?error=missing_code');
    }

    const tokenData = await exchangeCodeForFacebookUserToken(code);
    const debugData = await debugFacebookToken(tokenData.access_token);

    if (!debugData?.data?.is_valid) {
      return redirectToSettings(request, '?error=oauth_failed');
    }

    await updateFacebookUserAccountAfterOAuth({
      userId: session.user.id,
      state,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
      scopes: debugData.data.scopes,
      granularScopes: debugData.data.granular_scopes,
      dataAccessExpiresAt: debugData.data.data_access_expires_at,
      issuedAt: debugData.data.issued_at,
      facebookUserId: debugData.data.user_id,
      application: debugData.data.application,
    });

    return NextResponse.redirect(new URL(`${process.env.APP_URL}/account/facebook`, request.url));
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return redirectToSettings(request, '?error=oauth_failed');
  }
}
