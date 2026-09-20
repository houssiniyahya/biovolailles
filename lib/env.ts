import { z } from "zod";

/**
 * Validates the process environment once, at import time, so a missing/malformed
 * variable fails loudly at startup instead of surfacing as a confusing error deep
 * in a repository or session call. Only this module (and scripts run outside
 * Next.js, which load .env.local manually — see data/seed/run.ts) should read
 * process.env directly.
 *
 * Deliberately NOT `import "server-only"` here: this module (like data/db/client.ts
 * and data/repositories/*) is also imported by standalone scripts run via `tsx`
 * (db:seed, db:reset), which never pass through Next's bundler — the `server-only`
 * marker throws unconditionally outside that bundler, which would break those
 * scripts. It stays safe in the browser anyway because nothing here is reachable
 * from a Client Component without also pulling in Node-only packages (@libsql/client,
 * node:crypto) that Turbopack already refuses to bundle for the client.
 */
/**
 * Vercel injects the deployment's own hostname but no scheme, and the value differs between
 * a production deployment and a preview one. Deriving APP_URL from it means QR passports on a
 * preview deployment link back to *that* preview rather than to localhost — and a production
 * deploy needs no manual APP_URL at all. An explicit APP_URL always wins over this.
 */
function vercelOrigin(): string | undefined {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return host ? `https://${host}` : undefined;
}

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1).default("file:./data/db/biovolailles.db"),
    /**
     * Turso/remote-libSQL credential. Empty for a local `file:` database, required for a
     * `libsql:`/`https:` one — a serverless host (Vercel) has an ephemeral, read-only
     * filesystem, so the local SQLite file cannot be the production database. See
     * README.md "Deploying to Vercel".
     */
    DATABASE_AUTH_TOKEN: z.string().min(1).optional(),
    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET must be at least 32 characters (used as the iron-session encryption key)."),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    /**
     * Public origin the QR codes point at. A scanned QR needs an absolute URL, so this can't be
     * derived from a relative path — but it is NOT `NEXT_PUBLIC_`: only server code (the QR
     * image generator and the admin passport panel) ever reads it. No trailing slash.
     */
    APP_URL: z
      .string()
      .url()
      .default(vercelOrigin() ?? "http://localhost:3000")
      .transform((value) => value.replace(/\/+$/, "")),
    DEMO_MODE: z.enum(["true", "false"]).optional(),
  })
  .transform((raw) => ({
    ...raw,
    /**
     * Gates the demo tooling (the health screen and, critically, the destructive demo reset).
     * Secure by default: ON outside production, and in production it must be opted into
     * explicitly with DEMO_MODE=true rather than merely left unset.
     */
    DEMO_MODE: raw.DEMO_MODE ? raw.DEMO_MODE === "true" : raw.NODE_ENV !== "production",
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(
    `Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env.local and fill in the missing values.`
  );
}

/**
 * A `file:` database is a local development convenience only. Serverless hosts give each
 * invocation a fresh, read-only filesystem, so a file database there is silently empty on
 * every request — and `.db` files are gitignored, so nothing would be deployed anyway.
 * Failing the build with an actionable message beats a deployment that 500s on every page.
 */
if (process.env.VERCEL && parsed.data.DATABASE_URL.startsWith("file:")) {
  throw new Error(
    [
      "DATABASE_URL points at a local file database, which cannot work on Vercel (ephemeral, read-only filesystem).",
      "Set DATABASE_URL to a remote libSQL/Turso URL (libsql://…) and DATABASE_AUTH_TOKEN to its token.",
      'See README.md → "Deploying to Vercel".',
    ].join("\n")
  );
}

export const env = parsed.data;
