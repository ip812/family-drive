import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: 'db/schemas.ts',
  out: 'migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.PROD_CF_ACCOUNT_ID!,
    databaseId: process.env.PROD_CF_DATABASE_ID!,
    token: process.env.PROD_CF_D1_TOKEN!,
  },
});
