import NextAuth, { User } from 'next-auth';
// import { PrismaAdapter } from '@auth/prisma-adapter';
// import Github from 'next-auth/providers/github';
// import { prisma } from '@/lib/db';
import Google from 'next-auth/providers/google';

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
  // adapter: PrismaAdapter(prisma as any),
  providers: [
    // Github,
    Google
  ],
  // callbacks: {
  //   async session({ session, user }) {
  //     // TODO: When get session, we need to do something
  //     console.log('get session', session, user);
  //     return session;
  //   },
  // },
  // events: {
  //   async createUser({ user }) {
  //     // TODO: When create user, we need to do something
  //     console.log('create user', user);
  //   },
  // },
});
