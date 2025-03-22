import NextAuth, { User } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import Github from 'next-auth/providers/github';
import Passkey from 'next-auth/providers/passkey';
declare module 'next-auth' {
  interface Session {
    user: {
      createdAt: Date;
      username: string;
    } & User;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: [Github, Passkey],
  experimental: {
    enableWebAuthn: true,
  },
});
