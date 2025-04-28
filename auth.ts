import NextAuth, { User } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import Github from 'next-auth/providers/github';
import Passkey from 'next-auth/providers/passkey';
import { sendVerificationRequest } from './lib/devauth';
import { sendVerificationRequest as sendVerificationRequestMailgun } from './lib/mailgun';
import Google from 'next-auth/providers/google';
import Mailgun from 'next-auth/providers/mailgun';
import { nanoid } from 'nanoid';
import { Decimal } from '@prisma/client/runtime/library';

declare module 'next-auth' {
  interface Session {
    user: {
      createdAt: Date;
      username: string;
    } & User;
  }
}

function getProviders() {
  const providers = [
    Github,
    Passkey,
    Google,
    Mailgun({
      apiKey: process.env.AUTH_MAILGUN_KEY,
      from: process.env.AUTH_MAILGUN_FROM,
      name: 'MultiPost',
      sendVerificationRequest: sendVerificationRequestMailgun,
    }),
  ];
  if (process.env.NODE_ENV === 'development') {
    providers.push({
      id: 'http-email',
      name: 'Email',
      type: 'email',
      maxAge: 60 * 60 * 24,
      sendVerificationRequest,
    });
  }
  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: getProviders(),
  experimental: {
    enableWebAuthn: true,
  },
  pages: {
    error: '/auth/error',
    signIn: '/signin',
  },
  events: {
    async createUser({ user }) {
      if (!user.id) {
        return;
      }
      if (!user.name) {
        // 如果用户没有名字，则生成一个随机名字
        await prisma.user.update({
          where: { id: user.id },
          data: { name: `user_${nanoid(6)}` },
        });
      }
      // 创建 Credit 记录
      await prisma.credit.create({
        data: {
          userId: user.id,
          credits: new Decimal(0),
          freeCredits: new Decimal(0),
        },
      });
    },
  },
});
