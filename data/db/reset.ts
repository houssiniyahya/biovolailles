import { existsSync, unlinkSync } from "node:fs";
import { config } from "dotenv";
import { logger } from "../../lib/logger";

config({ path: ".env.local" }); // dotenv/config only reads .env by default — this project keeps secrets in .env.local

/**
 * Deletes the local dev database file (and its -wal/-shm siblings). Explicit,
 * developer-invoked command only — nothing else in the app calls this automatically.
 * Refuses to run against anything that isn't an obviously-local file database.
 */
function main() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data/db/biovolailles.db";

  if (nodeEnv === "production") {
    throw new Error("db:reset refuses to run with NODE_ENV=production.");
  }
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`db:reset only supports local file databases, got "${databaseUrl}".`);
  }

  const path = databaseUrl.replace(/^file:/, "");
  for (const suffix of ["", "-wal", "-shm"]) {
    const target = `${path}${suffix}`;
    if (existsSync(target)) {
      unlinkSync(target);
      logger.info("db", `Removed ${target}`);
    }
  }
}

main();
