import { createFileRoute } from '@tanstack/react-router';

import { updateFacebookUserAccountAfterOAuth } from '../../../../actions/social-media-accounts/facebook-pages/server';
import {
  debugFacebookToken,
  exchangeCodeForFacebookUserToken,
} from '../../../../actions/social-media-accounts/facebook-pages/oauth';
import { redirectToApp, redirectToSettings, requireOAuthSession } from '../-oauth';

export const Route = createFileRoute('/api/account/facebook/callback')({
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

    return redirectToApp(request, '/account/facebook');
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return redirectToSettings(request, '?error=oauth_failed');
  }
}
