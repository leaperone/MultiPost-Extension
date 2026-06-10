import assert from 'node:assert/strict';

import { eq } from 'drizzle-orm';

import { createDb, createDbPool } from '../../db/client.ts';
import {
  Account,
  Authenticator,
  BetterAuthAccount,
  BetterAuthPasskey,
  User,
} from '../../db/schema/auth-schema.ts';
import {
  base64ToBase64Url,
  runAuthjsToBetterAuthMigration,
  stableId,
} from './authjs-to-betterauth.ts';

const defaultDatabaseUrl =
  'postgres://postgres:postgres@localhost:55432/multipost_atlas_replay?sslmode=disable';

process.env.MULTIPOST_DATABASE_URL ??= defaultDatabaseUrl;

const fixtureUserId = 'fixture-authjs-user-1';
const provider = 'github';
const providerAccountId = 'fixture-provider-account-1';
const credentialID = '+/8=';
const credentialPublicKey = '/+7=';

function normalizeRows(rows: unknown[]) {
  return JSON.parse(
    JSON.stringify(rows, (_key, value) => value instanceof Date ? value.toISOString() : value),
  );
}

async function cleanup(db: ReturnType<typeof createDb>) {
  await db.delete(User).where(eq(User.id, fixtureUserId));
}

async function seed(db: ReturnType<typeof createDb>) {
  await db.insert(User).values({
    id: fixtureUserId,
    name: null,
    email: 'fixture-authjs-to-betterauth@example.test',
    emailVerified: new Date('2026-06-10T00:00:00.000Z'),
    image: null,
    emailVerifiedBool: false,
  });

  await db.insert(Account).values({
    userId: fixtureUserId,
    type: 'oauth',
    provider,
    providerAccountId,
    scope: 'read write',
    token_type: 'Bearer',
    session_state: 'fixture-session',
  });

  await db.insert(Authenticator).values({
    credentialID,
    userId: fixtureUserId,
    providerAccountId,
    credentialPublicKey,
    counter: 7,
    credentialDeviceType: 'singleDevice',
    credentialBackedUp: false,
    transports: 'internal,usb',
  });
}

async function readMigratedRows(db: ReturnType<typeof createDb>) {
  const [user] = await db.select().from(User).where(eq(User.id, fixtureUserId));
  const accounts = await db.select().from(BetterAuthAccount).where(eq(BetterAuthAccount.userId, fixtureUserId));
  const passkeys = await db.select().from(BetterAuthPasskey).where(eq(BetterAuthPasskey.userId, fixtureUserId));

  return normalizeRows([user, ...accounts, ...passkeys]);
}

async function main() {
  const pool = createDbPool();
  const db = createDb(pool);

  try {
    await cleanup(db);
    await seed(db);

    await runAuthjsToBetterAuthMigration(db);
    const firstRun = await readMigratedRows(db);

    await runAuthjsToBetterAuthMigration(db);
    const secondRun = await readMigratedRows(db);

    assert.deepEqual(secondRun, firstRun);

    const [user, account, passkey] = secondRun as Array<Record<string, unknown>>;
    assert.equal(user.emailVerifiedBool, true);
    assert.equal(user.name, `user_${fixtureUserId.slice(-6)}`);

    assert.equal(account.id, stableId('baacct', provider, providerAccountId));
    assert.equal(account.accessToken, null);
    assert.equal(account.refreshToken, null);

    assert.equal(passkey.id, stableId('bapasskey', fixtureUserId, base64ToBase64Url(credentialID)));
    assert.equal(passkey.credentialID, '-_8');
    assert.equal(passkey.publicKey, '_-7');
  } finally {
    await cleanup(db);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
