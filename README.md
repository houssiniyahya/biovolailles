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

---

## Deploying to Vercel

Next.js itself needs no configuration to run on Vercel. **The database does.** The app stores data
in libSQL, which locally is a plain SQLite file — and a serverless filesystem is ephemeral and
read-only, so a file database on Vercel would be empty on every request (and `.db` files are
gitignored, so nothing would be uploaded in the first place).

The fix is to point the same libSQL driver at a hosted libSQL database — [Turso](https://turso.tech).
The SQL, the schema, and the migrations are unchanged; only the connection URL differs. The app
**refuses to boot on Vercel with a `file:` URL** rather than serving a silently empty database, so a
misconfiguration fails the build with a clear message instead of reaching users.

### 1. Create the hosted database

```bash
# https://docs.turso.tech/quickstart
turso db create biovolailles
turso db show biovolailles --url        # -> libsql://biovolailles-<org>.turso.io
turso db tokens create biovolailles     # -> the auth token
```

Pick a database location near your Vercel region — every page renders server-side, so the
round-trip between the function and the database is the dominant latency.

### 2. Migrate and seed it, once, from your machine

Point the migrate and seed scripts at the hosted database **using shell variables**. This matters:
these scripts load `.env.local` and `.env`, and neither file can override a variable that is already
set in the shell — so a shell variable reliably wins, while editing a file would not (your existing
`.env.local` would keep pointing at the local file, and you would seed your laptop instead of Turso
without noticing).

PowerShell (Windows):

```powershell
$env:DATABASE_URL="libsql://biovolailles-<org>.turso.io"
$env:DATABASE_AUTH_TOKEN="<token>"
npm run db:migrate
npm run db:seed
```

bash/zsh (macOS, Linux):

```bash
export DATABASE_URL="libsql://biovolailles-<org>.turso.io"
export DATABASE_AUTH_TOKEN="<token>"
npm run db:migrate
npm run db:seed
```

Use a fresh terminal for this, and close it afterwards, so the token and the remote URL don't leak
into a later `npm run dev`.

`SESSION_SECRET` is read from your existing `.env.local`; these two scripts don't otherwise use it.

Seeding writes ~1,100 rows one at a time, so over a network connection it takes a minute or two
rather than the second it takes locally. It is a one-off — re-running `db:seed` against a database
that already has data does nothing.

To confirm it landed in the right place: `turso db shell biovolailles "SELECT COUNT(*) FROM lots;"`
should report 12.

### 3. Import the repo into Vercel

New Project → import this repository. Framework preset, build command, and output directory are all
detected automatically — accept the defaults.

### 4. Set the environment variables

In **Project Settings → Environment Variables** (Production, and Preview if you use it):

| Variable              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`        | `libsql://biovolailles-<org>.turso.io`                                 |
| `DATABASE_AUTH_TOKEN` | the Turso token                                                        |
| `SESSION_SECRET`      | a **new** 32+ character random value — not the one from your laptop    |
| `APP_URL`             | *Only if you use a custom domain.* Otherwise leave it unset.           |

`SESSION_SECRET` is validated at build time, so a missing one fails the build rather than the first
login.

`APP_URL` is the absolute origin encoded into QR passports. Left unset on Vercel it is derived from
the deployment's own URL, so production and preview deployments each link back to themselves. Set it
explicitly once you serve the app from a custom domain, otherwise printed QR codes will point at the
`*.vercel.app` hostname.

Do **not** set `DEMO_MODE` on Vercel. It defaults to off in production, which is what you want: it
gates the destructive demo reset, and that reset replays the entire seed — far slower than a
serverless function is allowed to run. Use it on a local demo machine instead.

### 5. Deploy

Push to the default branch, or hit Deploy. Every route that reads data is server-rendered on demand,
so no database connection is needed during the build itself.

### Deploying somewhere else

Nothing above is Vercel-specific except step 3. Any Node.js host works with `npm run build` &&
`npm run start`. A host with a persistent writable disk (a VM, a container with a volume, Fly.io) can
keep the `file:` SQLite database and skip Turso entirely — set `DATABASE_URL` to a path on the
mounted volume.
