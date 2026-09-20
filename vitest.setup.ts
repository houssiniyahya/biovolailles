import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

// Each test file gets its own migrated database in the OS temp dir — Vitest isolates test
// files into separate module graphs (and often separate workers), so a single shared file
// path caused Windows file-lock errors when two setups raced to delete/recreate it.
const dbPath = join(tmpdir(), `biovolailles-test-${randomUUID()}.db`);
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
// NODE_ENV is already "test" here — Vitest sets it before any setup file runs, and
// its type (Next.js augments NodeJS.ProcessEnv) is readonly, so this file doesn't touch it.

const client = createClient({ url: process.env.DATABASE_URL });
await migrate(drizzle(client), { migrationsFolder: "./data/db/migrations" });
client.close();
