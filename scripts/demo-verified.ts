/**
 * Presenter toggle for the public passport's verification state.
 *
 * The hero lot ships as `CLOTURE` / `SIMULATION`, so its passport reads "Traçabilité non
 * vérifiée" with the demo-data banner — deliberate, and defended in DEMO_RUNBOOK.md §8. This
 * script flips that whole chain to a released-and-validated state so the *other* half of the
 * story can be shown live ("voici ce que voit le consommateur quand la chaîne est vérifiée"),
 * then puts it back exactly as the seed left it.
 *
 *   npm run demo:verified on     -> Traçabilité vérifiée
 *   npm run demo:verified off    -> Traçabilité non vérifiée (seed state)
 *   npm run demo:verified status -> what the passport will currently render
 *
 * Nothing is created or deleted — this only rewrites `status` / `data_status` on six existing
 * rows, so row counts, integrity totals and the /administration/demo checks are untouched.
 * Safe to run with the server up: `next start` reads these on every request, so a reload shows
 * the new state immediately. Unlike `db:reset` it never touches the file, so no EBUSY.
 *
 * Why every link and not just the lot: the passport computes the header from the lot/product
 * but each step of "Étapes de traçabilité" from that record's own dataStatus
 * (services/public/passport.ts:154). Flipping only the lot yields a page that claims
 * "vérifiée" above a list of "non vérifiée" steps — precisely the contradiction a client
 * notices. The chain moves as one.
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" }); // dotenv/config only reads .env by default — this project keeps secrets in .env.local

type Mode = "on" | "off";

/**
 * Mirrors PUBLIC_LOT_STATUS in services/public/passport.ts. Duplicated deliberately rather
 * than imported: that module pulls in the repository layer and lib/env, which would make this
 * standalone script demand SESSION_SECRET just to print a label. If the service's table
 * changes, `npm test` catches the drift — services/public/passport.test.ts asserts the real one.
 */
const LOT_STATUS_LABEL: Record<string, { label: string; verified: boolean }> = {
  PLANIFIE: { label: "En préparation", verified: false },
  CREE: { label: "En préparation", verified: false },
  ACTIF: { label: "En cours de production", verified: false },
  EN_TRANSFERT: { label: "En transfert", verified: false },
  SUSPENDU: { label: "Suspendu — accès restreint", verified: false },
  BLOQUE: { label: "Bloqué — non vérifié", verified: false },
  LIBERE: { label: "Vérifié et libéré", verified: true },
  ABATTU: { label: "Abattu — en transformation", verified: false },
  TRANSFORME: { label: "Transformé", verified: false },
  CLOTURE: { label: "Cycle clôturé", verified: false },
  ARCHIVE: { label: "Archivé", verified: false },
};

/**
 * `off` is written out as literal seed values rather than snapshotted at `on` time: a snapshot
 * file is one more thing to lose between rehearsals, and the seed is deterministic (runbook §8
 * — identical to the character across reseeds). Restoring is therefore always possible, even
 * if `on` was run in an earlier session or the process died midway.
 */
const CHAIN = [
  { table: "lots", code: "BU-2026-001", on: { status: "LIBERE", data_status: "VALIDE" }, off: { status: "CLOTURE", data_status: "SIMULATION" } },
  { table: "collections", code: "COL-2026-001", on: { data_status: "VALIDE" }, off: { data_status: "SIMULATION" } },
  { table: "slaughter_batches", code: "AB-2026-001", on: { data_status: "VALIDE" }, off: { data_status: "SIMULATION" } },
  { table: "transformation_batches", code: "TR-2026-001", on: { data_status: "VALIDE" }, off: { data_status: "SIMULATION" } },
  { table: "products", code: "BVU-PROD-2026-001", on: { data_status: "VALIDE" }, off: { data_status: "SIMULATION" } },
] as const;

// Read straight from process.env rather than lib/env: this script needs only the database
// URL, and lib/env validates the whole app environment (SESSION_SECRET included) at import
// time. Same approach, and same default, as data/db/reset.ts.
const client = createClient({ url: process.env.DATABASE_URL ?? "file:./data/db/biovolailles.db" });

async function apply(mode: Mode): Promise<void> {
  for (const row of CHAIN) {
    const values = row[mode] as Record<string, string>;
    const assignments = Object.keys(values).map((column) => `${column} = ?`);
    const result = await client.execute({
      sql: `update ${row.table} set ${assignments.join(", ")} where code = ?`,
      args: [...Object.values(values), row.code],
    });

    // A silent no-op here would leave a half-flipped chain on screen, which is worse than
    // failing loudly before anyone is watching.
    if (result.rowsAffected === 0) {
      throw new Error(`${row.table}: no row with code ${row.code} — is the database seeded? (npm run db:reset)`);
    }
    console.log(`  ${row.table.padEnd(24)} ${row.code.padEnd(20)} ${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  }
}

async function report(): Promise<void> {
  const lot = await client.execute("select status, data_status from lots where code = 'BU-2026-001'");
  if (lot.rows.length === 0) {
    console.log("Hero lot BU-2026-001 not found — database not seeded.");
    return;
  }

  const { status, data_status: dataStatus } = lot.rows[0] as unknown as { status: string; data_status: string };
  const steps = await client.execute(
    "select count(*) as pending from (" +
      "select data_status from collections where code = 'COL-2026-001' " +
      "union all select data_status from slaughter_batches where code = 'AB-2026-001' " +
      "union all select data_status from transformation_batches where code = 'TR-2026-001' " +
      "union all select data_status from products where code = 'BVU-PROD-2026-001'" +
      ") where data_status not in ('REEL', 'VALIDE')",
  );
  const pending = Number((steps.rows[0] as unknown as { pending: number }).pending);

  const lotVerdict = LOT_STATUS_LABEL[status] ?? { label: status, verified: false };

  // The product passport ignores the lot's status unless the lot is restricted, in which case
  // a released product must not keep reading as verified (passport.ts:85).
  const restricted = status === "BLOQUE" || status === "SUSPENDU";
  const productLabel = restricted ? "Restreint — non vérifié" : pending === 0 ? "Vérifié" : "En attente de validation";
  const productVerified = !restricted && pending === 0;

  console.log(`  lot BU-2026-001      status=${status} data_status=${dataStatus}`);
  console.log(`  chain steps          ${4 - pending}/4 vérifiée`);
  console.log("");
  console.log(`  Passeport lot     -> ${lotVerdict.verified ? "Traçabilité vérifiée" : "Traçabilité NON vérifiée"}  ·  ${lotVerdict.label}`);
  console.log(`  Passeport produit -> ${productVerified ? "Traçabilité vérifiée" : "Traçabilité NON vérifiée"}  ·  ${productLabel}`);
  console.log(`  Bandeau démo      -> ${dataStatus === "SIMULATION" ? "affiché" : "masqué"}`);
}

/**
 * Sets only the hero lot's status, leaving every dataStatus alone. This is how the *other*
 * ten public labels are reached — "Bloqué — non vérifié", "En cours de production", and so on.
 * It intentionally does not touch the chain: those labels are all unverified anyway, so the
 * demo banner and per-step states staying as the seed left them is the honest rendering.
 */
async function setLotStatus(status: string): Promise<void> {
  const result = await client.execute({
    sql: "update lots set status = ? where code = 'BU-2026-001'",
    args: [status],
  });
  if (result.rowsAffected === 0) {
    throw new Error("lots: no row with code BU-2026-001 — is the database seeded? (npm run db:reset)");
  }
  console.log(`  lots                     BU-2026-001          status=${status}`);
}

async function main(): Promise<void> {
  const mode = process.argv[2];

  if (mode === "status") {
    await report();
    return;
  }

  if (mode === "set") {
    const target = (process.argv[3] ?? "").toUpperCase();
    if (!LOT_STATUS_LABEL[target]) {
      console.error(`Statut inconnu : ${target || "(vide)"}`);
      console.error(`Valeurs possibles : ${Object.keys(LOT_STATUS_LABEL).join(", ")}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Statut du lot -> ${target} :`);
    await setLotStatus(target);
    console.log("");
    await report();
    console.log("");
    console.log("Rechargez la page du passeport pour voir le changement.");
    return;
  }

  if (mode !== "on" && mode !== "off") {
    console.error("Usage: npm run demo:verified <on|off|status|set <STATUT>>");
    process.exitCode = 1;
    return;
  }

  console.log(mode === "on" ? "Chaîne vérifiée — activation :" : "Retour à l'état du semis :");
  await apply(mode);
  console.log("");
  await report();
  console.log("");
  console.log("Rechargez la page du passeport pour voir le changement.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });
