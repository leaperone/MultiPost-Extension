// Manual cutover script: run against production during the Better Auth cutover only.
// This is not part of Prisma migrate and must not be executed automatically.

import { createHash } from 'node:crypto';

import { PrismaClient } from '../client_multipost';

const prisma = new PrismaClient();

function stableId(prefix: string, ...parts: string[]) {
  return `${prefix}_${createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 32)}`;
}

function base64ToBase64Url(value: string) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main() {
  await prisma.user.updateMany({
    where: { emailVerified: { not: null } },
    data: { emailVerifiedBool: true },
  });

  // Optional compatibility cleanup for Better Auth's required logical name field.
  // Keep the Prisma field nullable in the first migration.
  const namelessUsers = await prisma.user.findMany({
    where: { name: null },
    select: { id: true },
  });
  for (const user of namelessUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: `user_${user.id.slice(-6)}` },
    });
  }

  const accounts = await prisma.account.findMany();
  for (const account of accounts) {
    // Login OAuth tokens are intentionally not migrated. Better Auth exposes
    // account tokens through token endpoints, while posting tokens live in
    // SocialMediaAccount and are migrated separately from auth login accounts.
    await prisma.betterAuthAccount.upsert({
      where: {
        providerId_accountId: {
          providerId: account.provider,
          accountId: account.providerAccountId,
        },
      },
      create: {
        id: stableId('baacct', account.provider, account.providerAccountId),
        userId: account.userId,
        providerId: account.provider,
        accountId: account.providerAccountId,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        scope: account.scope,
        tokenType: account.token_type,
        sessionState: account.session_state,
      },
      update: {
        userId: account.userId,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        scope: account.scope,
        tokenType: account.token_type,
        sessionState: account.session_state,
      },
    });
  }

  const authenticators = await prisma.authenticator.findMany();
  for (const authenticator of authenticators) {
    // Auth.js stores credentialID as base64; Better Auth looks it up as base64url.
    const credentialID = base64ToBase64Url(authenticator.credentialID);

    await prisma.betterAuthPasskey.upsert({
      where: { credentialID },
      create: {
        id: stableId('bapasskey', authenticator.userId, credentialID),
        userId: authenticator.userId,
        publicKey: authenticator.credentialPublicKey,
        credentialID,
        counter: authenticator.counter,
        deviceType: authenticator.credentialDeviceType,
        backedUp: authenticator.credentialBackedUp,
        transports: authenticator.transports,
        createdAt: new Date(),
      },
      update: {
        userId: authenticator.userId,
        publicKey: authenticator.credentialPublicKey,
        credentialID,
        counter: authenticator.counter,
        deviceType: authenticator.credentialDeviceType,
        backedUp: authenticator.credentialBackedUp,
        transports: authenticator.transports,
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
