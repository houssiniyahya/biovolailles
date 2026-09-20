import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { env } from "../../lib/env";
import * as schema from "./schema";

/**
 * Singleton libSQL client + Drizzle instance, cached on `globalThis` so Next.js
 * dev-mode module reloads don't open a new SQLite connection on every edit.
 * No `import "server-only"` — the seed/reset scripts (run via `tsx`, outside Next's
 * bundler) import this module directly; see lib/env.ts for the full reasoning.
 */
declare global {
  var __biovolailles_db__: { client: Client; db: LibSQLDatabase<typeof schema> } | undefined;
}

/** A local file database vs. a remote libSQL/Turso one — the two differ in how FKs get enabled. */
const isLocalFileDatabase = env.DATABASE_URL.startsWith("file:");

/** Foreign keys are OFF by default per SQLite connection — must be enabled explicitly. */
export async function enableForeignKeys(client: Client): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON;");
}

function createDb() {
  const client = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
  if (isLocalFileDatabase) {
    // Fire-and-forget: a local connection executes commands in submission order, so every
    // later query is already covered. `.catch` because an unhandled rejection here would
    // take the process down on a problem the next real query reports far more clearly.
    void enableForeignKeys(client).catch(() => {});
  }
  // A remote libSQL/Turso connection is deliberately left alone: it is a pool of short-lived
  // HTTP requests, not one long-lived connection, so a one-shot PRAGMA would apply to a single
  // request and then be gone. Turso enforces foreign keys server-side instead.
  const db = drizzle(client, { schema });
  return { client, db };
}

const instance = globalThis.__biovolailles_db__ ?? createDb();
if (env.NODE_ENV !== "production") {
  globalThis.__biovolailles_db__ = instance;
}

export const db = instance.db;
export const dbClient = instance.client;
