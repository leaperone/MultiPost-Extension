// Manual cutover script: run against production during the Better Auth cutover only.
// This is not part of Atlas migrations and must not be executed automatically.

import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { createDb, createDbPool, type MultipostDb } from '../../db/client.ts';
import {
  Account,
  Authenticator,
  BetterAuthAccount,
  BetterAuthPasskey,
  User,
} from '../../db/schema/auth-schema.ts';

export function stableId(prefix: string, ...parts: string[]) {
  return `${prefix}_${createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 32)}`;
}

export function base64ToBase64Url(value: string) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function differs<T extends Record<string, unknown>>(row: Record<string, unknown>, values: T) {
  return Object.entries(values).some(([key, value]) => row[key] !== value);
}

export async function runAuthjsToBetterAuthMigration(db: MultipostDb) {
  await db
    .update(User)
    .set({ emailVerifiedBool: true, updatedAt: new Date() })
    .where(and(isNotNull(User.emailVerified), eq(User.emailVerifiedBool, false)));

  const namelessUsers = await db.select({ id: User.id }).from(User).where(isNull(User.name));
  for (const user of namelessUsers) {
    await db
      .update(User)
      .set({ name: `user_${user.id.slice(-6)}`, updatedAt: new Date() })
      .where(and(eq(User.id, user.id), isNull(User.name)));
  }

  const accounts = await db.select().from(Account);
  for (const account of accounts) {
    const accountId = stableId('baacct', account.provider, account.providerAccountId);
    const accountValues = {
      accountId: account.providerAccountId,
      providerId: account.provider,
      userId: account.userId,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: account.scope,
      tokenType: account.token_type,
      sessionState: account.session_state,
    };

    const [existingAccount] = await db
      .select()
      .from(BetterAuthAccount)
      .where(
        and(
          eq(BetterAuthAccount.providerId, accountValues.providerId),
          eq(BetterAuthAccount.accountId, accountValues.accountId),
        ),
      )
      .limit(1);

    if (!existingAccount) {
      await db.insert(BetterAuthAccount).values({
        id: accountId,
        ...accountValues,
      });
    } else if (differs(existingAccount, accountValues)) {
      await db
        .update(BetterAuthAccount)
        .set(accountValues)
        .where(eq(BetterAuthAccount.id, existingAccount.id));
    }
  }

  const authenticators = await db.select().from(Authenticator);
  for (const authenticator of authenticators) {
    const credentialID = base64ToBase64Url(authenticator.credentialID);
    const publicKey = base64ToBase64Url(authenticator.credentialPublicKey);

    const passkeyValues = {
      userId: authenticator.userId,
      publicKey,
      credentialID,
      counter: authenticator.counter,
      deviceType: authenticator.credentialDeviceType,
      backedUp: authenticator.credentialBackedUp,
      transports: authenticator.transports,
    };

    const [existingPasskey] = await db
      .select()
      .from(BetterAuthPasskey)
      .where(eq(BetterAuthPasskey.credentialID, credentialID))
      .limit(1);

    if (!existingPasskey) {
      await db.insert(BetterAuthPasskey).values({
        id: stableId('bapasskey', authenticator.userId, credentialID),
        ...passkeyValues,
        createdAt: new Date(),
      });
    } else if (differs(existingPasskey, passkeyValues)) {
      await db
        .update(BetterAuthPasskey)
        .set(passkeyValues)
        .where(eq(BetterAuthPasskey.id, existingPasskey.id));
    }
  }
}

async function main() {
  const pool = createDbPool();
  const db = createDb(pool);

  try {
    await runAuthjsToBetterAuthMigration(db);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
