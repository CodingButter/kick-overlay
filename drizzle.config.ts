import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/db/drizzle-schema.ts',
  dbCredentials: {
    url: './data/kick-overlay.db',
  },
  verbose: true,
  strict: true,
});
