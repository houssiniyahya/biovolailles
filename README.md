# BIOVOLAILLES

Plateforme de gestion et de traçabilité avicole — production, IoT, qualité, alertes, et passeport
public de traçabilité par QR code.

Built with Next.js 16 (App Router, Server Components + Server Actions), TypeScript, Drizzle ORM on
libSQL/SQLite, Tailwind CSS v4, and `iron-session` cookie auth.

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — layering, data model, and the decisions behind them.
- **[DEMO_RUNBOOK.md](DEMO_RUNBOOK.md)** — running the demo scenario end to end.

---

## Running locally

Requires **Node.js 20.9+**.

```bash
npm install
cp .env.example .env.local     # then edit .env.local — see below
npm run db:migrate             # creates data/db/biovolailles.db and applies migrations
npm run db:seed                # loads the deterministic demo dataset
npm run dev                    # http://localhost:3000
```

The only value you must edit in `.env.local` is `SESSION_SECRET` (32+ characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Demo accounts are created by the seed, which prints the list of addresses (one per role, e.g.
`admin@biovolailles.demo` for SUPER_ADMIN). They all share one password, which the seed deliberately
does *not* print — its output is often on a projector. See [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md) §1.

`npm run db:seed` does nothing if the database already holds data; use `npm run db:reset` to rebuild
it from scratch.

### Everyday commands

| Command              | What it does                                                        |
| -------------------- | ------------------------------------------------------------------- |
| `npm run dev`        | Dev server                                                          |
| `npm run build`      | Production build                                                    |
| `npm run start`      | Serve the production build (runs with `NODE_ENV=production`)        |
| `npm test`           | Vitest suite                                                        |
| `npm run typecheck`  | `tsc --noEmit`                                                      |
| `npm run lint`       | ESLint                                                              |
| `npm run db:generate`| Generate a migration from `data/db/schema.ts`                       |
| `npm run db:migrate` | Apply migrations to whatever `DATABASE_URL` points at               |
| `npm run db:seed`    | Load the demo dataset                                               |
| `npm run db:reset`   | Delete the local database file, re-migrate, re-seed (local only)    |
| `npm run db:deploy`  | Migrate **and** seed a hosted database in one step (refuses `file:`) |

---

## Deploying to Vercel

Next.js needs no configuration here. **The database does.** The app stores data in libSQL, which
locally is a plain SQLite file — and a serverless filesystem is ephemeral and read-only, so a file
database on Vercel would be empty on every request (and `.db` files are gitignored, so nothing would
be uploaded anyway). Production points the same driver at a hosted libSQL database
([Turso](https://turso.tech)); the schema, the SQL and the migrations are unchanged.

Four steps, about five minutes.

### 1. Create the database

Either from the Vercel dashboard (**Storage → Browse Marketplace → Turso**), which provisions it and
injects the credentials into the project for you — the app reads whatever variable names that
integration chooses, so there is nothing to configure afterwards — or from the Turso CLI:

```bash
turso db create biovolailles
turso db show biovolailles --url        # -> libsql://biovolailles-<org>.turso.io
turso db tokens create biovolailles     # -> the auth token
```

Pick a database location near your Vercel region: every page renders server-side, so the round trip
between function and database is the dominant latency.

### 2. Fill it — one command

```powershell
# PowerShell (Windows)
$env:DATABASE_URL="libsql://biovolailles-<org>.turso.io"
$env:DATABASE_AUTH_TOKEN="<token>"
npm run db:deploy
```

```bash
# bash / zsh
export DATABASE_URL="libsql://biovolailles-<org>.turso.io"
export DATABASE_AUTH_TOKEN="<token>"
npm run db:deploy
```

`db:deploy` applies every migration and then loads the demo dataset, printing the host it is writing
to first. It **refuses to run against a local file database**, so it cannot quietly seed your laptop
instead of the deployment — the failure mode that makes this step worth a dedicated command.

Set these in the shell, not in `.env.local`: these scripts read `.env.local` and `.env`, and neither
file can override a variable already present in the shell. Use a throwaway terminal so the token
doesn't linger into a later `npm run dev`.

Seeding writes ~1,100 rows one at a time, so it takes a minute or two over the network. It is a
one-off; re-running it against a non-empty database does nothing.

### 3. Set the environment variables in Vercel

**Project Settings → Environment Variables**, for Production (and Preview, if you use it):

| Variable              | Value                                                                |
| --------------------- | -------------------------------------------------------------------- |
| `SESSION_SECRET`      | a fresh 32+ character random string — **not** the one from your laptop |
| `DATABASE_URL`        | `libsql://biovolailles-<org>.turso.io`                               |
| `DATABASE_AUTH_TOKEN` | the Turso token                                                      |

Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If the Turso marketplace integration provisioned the database, it already injected the URL and token
— only `SESSION_SECRET` is left to add.

> **These are required at build time, not just at runtime.** `lib/env.ts` validates the environment
> when the module is first evaluated, which happens during `next build`. A missing `SESSION_SECRET`
> fails the build with `Failed to collect page data`, and the deployment never appears. If Vercel
> shows *No Production Deployment*, check this first — it is the most likely cause.

`APP_URL` is deliberately absent: left unset on Vercel it is derived from the project's production
domain, so QR passports encode a stable URL even when minted from a preview deployment — which is
what you want for a code that gets printed and outlives the deployment. Set `APP_URL` explicitly
only once you serve the app from a custom domain.

Don't set `DEMO_MODE`. It defaults to off in production, which is what you want — it gates the
destructive demo reset, and that reset replays the entire seed, far longer than a serverless function
is allowed to run. Keep it for a local demo machine.

### 4. Deploy

Push to `master`, or hit **Redeploy** in the Vercel dashboard. Every route that reads data is
server-rendered on demand, so the build itself never needs to reach the database — a build can
succeed before step 2 has run.

Then open the deployment and sign in with a demo account (see [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md) §1).

### Deploying somewhere else

Only step 3 is Vercel-specific — everywhere else, set the same three variables however that host
does it. Any Node.js host works with `npm run build` && `npm run start`.

A host with a persistent writable disk (a VM, a container with a volume, Fly.io) can keep the `file:`
SQLite database and skip Turso entirely: point `DATABASE_URL` at a path on the mounted volume and run
`npm run db:migrate && npm run db:seed` there once. The build-time guard that rejects a `file:` URL
only applies on Vercel.
