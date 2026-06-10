import { passkey } from '@better-auth/passkey';
import { Decimal } from '@prisma/client/runtime/library';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { nanoid } from 'nanoid';

import { RechargeStatus, RechargeType } from '@/src/actions/credit/types';
import { sendVerificationRequest as sendVerificationRequestDev } from '@/lib/devauth';
import { sendVerificationRequest as sendVerificationRequestMailgun } from '@/lib/mailgun';
import type { SigninMethod } from '@/lib/posthog/events';
import {
  trackGithubSignupBonusServer,
  trackSigninCompletedServer,
  trackUserCreatedServer,
} from '@/lib/posthog/server-events';

import { prisma } from './db';

const AUTH_BASE_PATH = '/api/auth';
const createdUserByContext = new WeakMap<object, string>();
const signInFlowByContext = new WeakMap<
  object,
  {
    method: SigninMethod;
    userId: string;
    isNewUser: boolean;
  }
>();
const signinMethods = new Set<SigninMethod>([
  'github',
  'google',
  'passkey',
  'email',
  'http-email',
]);

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function withoutAuthPath(url: URL) {
  if (url.pathname === AUTH_BASE_PATH || url.pathname === `${AUTH_BASE_PATH}/`) {
    url.pathname = '/';
  }
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function authBaseURL() {
  const explicit = process.env.BETTER_AUTH_URL || process.env.AUTH_URL || process.env.APP_URL;
  if (!explicit) {
    if (isProduction()) {
      throw new Error(
        'BETTER_AUTH_URL, AUTH_URL, or APP_URL must be configured in production',
      );
    }

    return 'http://localhost:3000';
  }

  try {
    const url = new URL(explicit);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Auth base URL must use http or https');
    }

    return withoutAuthPath(url);
  } catch {
    if (isProduction()) {
      throw new Error(
        'BETTER_AUTH_URL, AUTH_URL, or APP_URL must be a valid http(s) URL in production',
      );
    }

    return 'http://localhost:3000';
  }
}

function authSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.BETTER_AUTH_SECRET;
}

async function sendMagicLink(data: { email: string; url: string }) {
  const apiKey = process.env.AUTH_MAILGUN_KEY;
  const from = process.env.AUTH_MAILGUN_FROM;

  if (!apiKey || !from) {
    if (isProduction()) {
      throw new Error(
        'AUTH_MAILGUN_KEY and AUTH_MAILGUN_FROM must be configured for production magic links',
      );
    }

    await sendVerificationRequestDev({
      identifier: data.email,
      url: data.url,
    });
    return;
  }

  await sendVerificationRequestMailgun({
    identifier: data.email,
    url: data.url,
    provider: {
      apiKey,
      from,
      name: 'MultiPost',
    },
  });
}

function toSigninMethod(method: unknown): SigninMethod | null {
  if (typeof method === 'string' && signinMethods.has(method as SigninMethod)) {
    return method as SigninMethod;
  }

  return null;
}

function getContextRecord(context: object) {
  return context as {
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
    path?: unknown;
    request?: Request;
    url?: unknown;
  };
}

function inferSigninMethodFromContext(context: object): SigninMethod | null {
  const record = getContextRecord(context);
  const provider = toSigninMethod(record.body?.provider) || toSigninMethod(record.params?.id);

  if (provider) {
    return provider;
  }

  const path =
    typeof record.path === 'string'
      ? record.path
      : record.request
        ? new URL(record.request.url).pathname
        : typeof record.url === 'string'
          ? new URL(record.url).pathname
          : '';
  const callbackProvider = path.match(/\/callback\/([^/?]+)/)?.[1];

  return (
    toSigninMethod(callbackProvider) ||
    (path.includes('/magic-link/verify') ? 'email' : null) ||
    (path.includes('/sign-in/email') ? 'email' : null) ||
    (path.includes('/passkey/verify-authentication') ? 'passkey' : null)
  );
}

function setSignInFlow(
  context: object | null,
  method: SigninMethod,
  userId: string,
  isNewUser: boolean,
) {
  if (!context) {
    return;
  }

  signInFlowByContext.set(context, {
    method,
    userId,
    isNewUser,
  });
}

function hasVerifiedEmail(user: Record<string, unknown>) {
  return user.emailVerified === true || user.emailVerifiedBool === true;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

async function grantCreditOnce(userId: string, type: RechargeType, amount: Decimal) {
  const orderId = `AUTH-${type}-${userId}`;

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.rechargeCredit.findFirst({
        where: {
          userId,
          type,
          status: RechargeStatus.SUCCESS,
        },
        select: { id: true },
      });

      if (existing) {
        return false;
      }

      await tx.rechargeCredit.create({
        data: {
          userId,
          amount,
          orderId,
          type,
          status: RechargeStatus.SUCCESS,
        },
      });

      await tx.credit.upsert({
        where: { userId },
        update: {
          credits: { increment: new Decimal(0) },
          freeCredits: { increment: amount },
        },
        create: {
          userId,
          credits: new Decimal(0),
          freeCredits: amount,
        },
      });

      return true;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }
    throw error;
  }
}

const baseURL = authBaseURL();
const origin = new URL(baseURL).origin;
const rpID = new URL(baseURL).hostname;

export const auth = betterAuth({
  appName: 'MultiPost',
  baseURL,
  basePath: AUTH_BASE_PATH,
  secret: authSecret(),
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  advanced: {
    database: {
      generateId: false,
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    },
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    },
  },
  user: {
    modelName: 'User',
    fields: {
      emailVerified: 'emailVerifiedBool',
    },
  },
  session: {
    modelName: 'BetterAuthSession',
  },
  account: {
    modelName: 'BetterAuthAccount',
    encryptOAuthTokens: true,
    additionalFields: {
      tokenType: {
        type: 'string',
        required: false,
        returned: false,
      },
      sessionState: {
        type: 'string',
        required: false,
        returned: false,
      },
    },
  },
  verification: {
    modelName: 'BetterAuthVerification',
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (typeof user.name === 'string' && user.name.trim().length > 0) {
            return;
          }

          return {
            data: {
              name: `user_${nanoid(6)}`,
            },
          };
        },
        after: async (user, context) => {
          if (context) {
            createdUserByContext.set(context, user.id);

            if (hasVerifiedEmail(user)) {
              // Better Auth 1.6.15 does not pass magic-link isNewUser to session hooks.
              setSignInFlow(context, 'email', user.id, true);
            }
          }

          if (hasVerifiedEmail(user)) {
            await prisma.user.updateMany({
              where: {
                id: user.id,
                emailVerified: null,
              },
              data: {
                emailVerified: new Date(),
              },
            });
          }

          await grantCreditOnce(user.id, RechargeType.SIGNUP, new Decimal(0.5));
          trackUserCreatedServer(user.id);
        },
      },
      update: {
        after: async (user) => {
          const emailVerified =
            user.emailVerified === true || user.emailVerifiedBool === true;

          if (!emailVerified) {
            return;
          }

          await prisma.user.updateMany({
            where: {
              id: user.id,
              emailVerified: null,
            },
            data: {
              emailVerified: new Date(),
            },
          });
        },
      },
    },
    session: {
      create: {
        after: async (session, context) => {
          if (!context) {
            return;
          }

          const flow = signInFlowByContext.get(context);
          const method = flow?.method || inferSigninMethodFromContext(context);

          if (!method) {
            return;
          }

          trackSigninCompletedServer(
            session.userId,
            method,
            flow?.isNewUser ?? createdUserByContext.get(context) === session.userId,
          );
        },
      },
    },
    account: {
      create: {
        after: async (account, context) => {
          const isNewUserInThisAuthFlow =
            !!context && createdUserByContext.get(context) === account.userId;
          const method = toSigninMethod(account.providerId);

          if (method) {
            setSignInFlow(context, method, account.userId, isNewUserInThisAuthFlow);
          }

          if (account.providerId !== 'github' || !isNewUserInThisAuthFlow) {
            return;
          }

          const granted = await grantCreditOnce(
            account.userId,
            RechargeType.GITHUB_SIGNUP,
            new Decimal(1),
          );

          if (granted) {
            trackGithubSignupBonusServer(account.userId, 1);
          }
        },
      },
      update: {
        after: async (account, context) => {
          const method = toSigninMethod(account.providerId);

          if (!method) {
            return;
          }

          setSignInFlow(
            context,
            method,
            account.userId,
            !!context && createdUserByContext.get(context) === account.userId,
          );
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 60 * 24,
      storeToken: 'hashed',
      sendMagicLink,
    }),
    passkey({
      rpName: 'MultiPost',
      rpID,
      origin,
      schema: {
        passkey: {
          modelName: 'BetterAuthPasskey',
        },
      },
    }),
    tanstackStartCookies(),
  ],
});

export default auth;
