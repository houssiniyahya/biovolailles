import { config } from "dotenv";

// dotenv/config only reads .env by default — this project keeps secrets in .env.local.
// `.env` is read as a fallback so the one-off "seed the hosted database" step can supply
// DATABASE_URL/DATABASE_AUTH_TOKEN without disturbing a developer's local .env.local.
config({ path: ".env.local" });
config({ path: ".env" });

// Dynamic import: static `import` declarations are hoisted above this file's own code
// by the bundler tsx uses, which would run seed.ts's eager env validation (lib/env.ts,
// pulled in via data/db/client.ts) before the config() call above had a chance to run.
// A dynamic import() is a runtime expression, not a hoisted declaration, so it genuinely
// runs after config() here.
void import("./seed");
