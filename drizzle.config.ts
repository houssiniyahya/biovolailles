import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// dotenv/config only reads .env by default — this project keeps secrets in .env.local.
// `.env` is read as a fallback so a one-off deploy shell (or CI) can point `db:migrate`
// at the hosted database without having to create a file named `.env.local`.
config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/db/biovolailles.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

/**
 * Same SQL either way — `turso` is drizzle-kit's remote-libSQL driver, not a different
 * dialect, so the migrations in data/db/migrations apply unchanged to a hosted database.
 * Selected off the URL so `npm run db:migrate` targets whatever DATABASE_URL points at.
 */
const isLocalFileDatabase = databaseUrl.startsWith("file:");

export default defineConfig({
  dialect: isLocalFileDatabase ? "sqlite" : "turso",
  schema: "./data/db/schema.ts",
  out: "./data/db/migrations",
  dbCredentials: isLocalFileDatabase ? { url: databaseUrl } : { url: databaseUrl, authToken },
});
