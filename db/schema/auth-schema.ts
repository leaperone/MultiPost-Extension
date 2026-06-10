import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { newId, now } from '../helpers.ts';

export const User = pgTable(
  'User',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    name: text(),
    email: text().notNull(),
    emailVerified: timestamp({ precision: 3, mode: 'date' }),
    image: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    emailVerifiedBool: boolean().default(false).notNull(),
  },
  (table) => [uniqueIndex('User_email_key').on(table.email)],
);

export const Session = pgTable(
  'Session',
  {
    sessionToken: text().notNull(),
    userId: text().notNull(),
    expires: timestamp({ precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('Session_sessionToken_key').on(table.sessionToken),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'Session_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const Account = pgTable(
  'Account',
  {
    userId: text().notNull(),
    type: text().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'Account_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({ columns: [table.provider, table.providerAccountId], name: 'Account_pkey' }),
  ],
);

export const VerificationToken = pgTable(
  'VerificationToken',
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ precision: 3, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token], name: 'VerificationToken_pkey' })],
);

export const Authenticator = pgTable(
  'Authenticator',
  {
    credentialID: text().notNull(),
    userId: text().notNull(),
    providerAccountId: text().notNull(),
    credentialPublicKey: text().notNull(),
    counter: integer().notNull(),
    credentialDeviceType: text().notNull(),
    credentialBackedUp: boolean().notNull(),
    transports: text(),
  },
  (table) => [
    uniqueIndex('Authenticator_credentialID_key').on(table.credentialID),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'Authenticator_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({ columns: [table.userId, table.credentialID], name: 'Authenticator_pkey' }),
  ],
);

export const BetterAuthSession = pgTable(
  'BetterAuthSession',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
    token: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    ipAddress: text(),
    userAgent: text(),
    userId: text().notNull(),
  },
  (table) => [
    uniqueIndex('BetterAuthSession_token_key').on(table.token),
    index('BetterAuthSession_userId_idx').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'BetterAuthSession_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const BetterAuthAccount = pgTable(
  'BetterAuthAccount',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
    refreshTokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
    scope: text(),
    password: text(),
    tokenType: text(),
    sessionState: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('BetterAuthAccount_providerId_accountId_key').on(table.providerId, table.accountId),
    index('BetterAuthAccount_userId_idx').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'BetterAuthAccount_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const BetterAuthVerification = pgTable(
  'BetterAuthVerification',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [index('BetterAuthVerification_identifier_idx').on(table.identifier)],
);

export const BetterAuthPasskey = pgTable(
  'BetterAuthPasskey',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    name: text(),
    publicKey: text().notNull(),
    userId: text().notNull(),
    credentialID: text().notNull(),
    counter: integer().notNull(),
    deviceType: text().notNull(),
    backedUp: boolean().notNull(),
    transports: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' }),
    aaguid: text(),
  },
  (table) => [
    uniqueIndex('BetterAuthPasskey_credentialID_key').on(table.credentialID),
    index('BetterAuthPasskey_userId_idx').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'BetterAuthPasskey_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);
