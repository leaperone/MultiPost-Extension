import { drizzle } from 'drizzle-orm/node-postgres';
// @deno-types="npm:@types/pg@8.20.0"
import { Pool, type PoolConfig } from 'pg';
import * as authSchema from './schema/auth-schema.ts';
import * as relations from './schema/relations.ts';
import * as appSchema from './schema/schema.ts';

export const schema = {
  ...authSchema,
  ...appSchema,
  ...relations,
};

export type MultipostSchema = typeof schema;

const rootDbClientMarker = Symbol.for('multipost.rootDbClient');

export const createDb = (pool: Pool) => {
  const db = drizzle(pool, { schema });
  Object.defineProperty(db, rootDbClientMarker, {
    value: true,
    enumerable: false,
    configurable: false,
  });
  return db;
};

export type MultipostDb = ReturnType<typeof createDb>;

export function createDbPool(config: PoolConfig = {}) {
  const connectionString = config.connectionString ?? process.env.MULTIPOST_DATABASE_URL;

  if (!connectionString) {
    throw new Error('MULTIPOST_DATABASE_URL is required to create a database pool');
  }

  return new Pool({
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...config,
    connectionString,
  });
}

function readDefaultDatabaseUrl() {
  const globalScope = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
    Deno?: { env?: { get(name: string): string | undefined } };
  };

  return (
    globalScope.process?.env?.MULTIPOST_DATABASE_URL ??
    globalScope.Deno?.env?.get('MULTIPOST_DATABASE_URL')
  );
}

export function isMultipostRootDbClient(client: unknown): client is MultipostDb {
  return (
    typeof client === 'object' &&
    client !== null &&
    (client as Record<PropertyKey, unknown>)[rootDbClientMarker] === true
  );
}

export function createWorkerDb(connectionString = readDefaultDatabaseUrl()) {
  if (!connectionString) {
    throw new Error('MULTIPOST_DATABASE_URL is required to create a database pool');
  }

  const pool = createDbPool({ connectionString });

  return {
    pool,
    db: createDb(pool),
  };
}
