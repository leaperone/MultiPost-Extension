import { createDb, createDbPool, type MultipostDb } from '@db/client';
import type { Pool } from 'pg';

const globalForDb = globalThis as typeof globalThis & {
  multipostPgPoolGlobal?: Pool;
  multipostDrizzleGlobal?: MultipostDb;
};

let poolInstance = globalForDb.multipostPgPoolGlobal;
let dbInstance = globalForDb.multipostDrizzleGlobal;

function getPool() {
  if (!poolInstance) {
    poolInstance = createDbPool();
    if (process.env.NODE_ENV !== 'production') {
      globalForDb.multipostPgPoolGlobal = poolInstance;
    }
  }

  return poolInstance;
}

function getDb() {
  if (!dbInstance) {
    dbInstance = createDb(getPool());
    if (process.env.NODE_ENV !== 'production') {
      globalForDb.multipostDrizzleGlobal = dbInstance;
    }
  }

  return dbInstance;
}

export const multipostPgPool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const pool = getPool();
    const value = Reflect.get(pool, prop, receiver);
    return typeof value === 'function' ? value.bind(pool) : value;
  },
  has(_target, prop) {
    return Reflect.has(getPool(), prop);
  },
  getPrototypeOf() {
    return Object.getPrototypeOf(getPool());
  },
});

export const drizzleDb = new Proxy({} as MultipostDb, {
  get(_target, prop, receiver) {
    const realDb = getDb();
    const value = Reflect.get(realDb, prop, receiver);
    return typeof value === 'function' ? value.bind(realDb) : value;
  },
  has(_target, prop) {
    return Reflect.has(getDb(), prop);
  },
  getPrototypeOf() {
    return Object.getPrototypeOf(getDb());
  },
});

export const db = drizzleDb;
