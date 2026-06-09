import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

const AUTH_BASE_PATH = '/api/auth';

function authClientBaseURL() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  const env = (typeof process !== 'undefined' ? process.env : {}) as Partial<
    Record<string, string | undefined>
  >;
  const explicit = env.BETTER_AUTH_URL || env.AUTH_URL || env.APP_URL;
  if (!explicit) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'BETTER_AUTH_URL, AUTH_URL, or APP_URL must be configured in production',
      );
    }

    return 'http://localhost:3000';
  }

  try {
    const url = new URL(explicit);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Auth client base URL must use http or https');
    }

    if (url.pathname === AUTH_BASE_PATH || url.pathname === `${AUTH_BASE_PATH}/`) {
      url.pathname = '/';
    }
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'BETTER_AUTH_URL, AUTH_URL, or APP_URL must be a valid http(s) URL in production',
      );
    }

    return 'http://localhost:3000';
  }
}

export const authClient = createAuthClient({
  baseURL: authClientBaseURL(),
  basePath: AUTH_BASE_PATH,
  plugins: [passkeyClient(), magicLinkClient()],
});

export const useBetterAuthSession = authClient.useSession;

export function useSession() {
  const { data, isPending } = useBetterAuthSession();

  return {
    data,
    status: data
      ? 'authenticated'
      : isPending
        ? 'loading'
        : 'unauthenticated',
    isPending,
  };
}

export const {
  signIn,
  signOut,
  passkey,
} = authClient;

export const registerPasskey = authClient.passkey.addPasskey;
export const authenticatePasskey = authClient.signIn.passkey;
