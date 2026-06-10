import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./db/schema/auth-schema.ts', './db/schema/schema.ts'],
  out: './db/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.MULTIPOST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:55432/multipost_db',
  },
  verbose: true,
  strict: true,
});
