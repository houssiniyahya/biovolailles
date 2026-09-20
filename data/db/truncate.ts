import { db } from "./client";
import * as schema from "./schema";

/**
 * Every table in reverse-dependency order: a table only appears after everything that holds
 * a foreign key into it. Deleting in this order keeps `PRAGMA foreign_keys = ON` satisfied
 * throughout, so a mistake here fails loudly on a constraint error rather than silently
 * leaving dangling references behind (which is exactly what the integrity engine exists to
 * catch — the demo reset must not be able to manufacture that state).
 */
const DELETION_ORDER = [
  // Audit references users, lots and lot_events, so it goes first.
  schema.auditLog,
  schema.qrTokens,
  schema.relations,
  schema.products,
  schema.transformationBatches,
  schema.slaughterBatches,
  schema.collections,
  schema.destinations,
  schema.sanitaryObservations,
  schema.actionRecords,
  schema.alerts,
  schema.anomalies,
  schema.kpiValues,
  schema.kpiDefinitions,
  schema.rules,
  schema.measurements,
  schema.sensors,
  schema.devices,
  schema.environmentMeasurementRecords,
  schema.mortalityRecords,
  schema.weightMeasurementRecords,
  schema.waterUsageRecords,
  schema.feedUsageRecords,
  schema.lotEvents,
  schema.lots,
  // Users carry no FK of their own but are referenced by nearly every provenance column above.
  schema.users,
  schema.buildings,
  schema.farms,
  schema.producers,
  schema.cooperatives,
  schema.organizations,
] as const;

/**
 * Empties every application table. Used only by the demo reset (services/demo/reset.ts),
 * which gates it behind DEMO_MODE + a SUPER_ADMIN permission check — nothing else in the
 * app may call this. Deletes rows rather than dropping the database file so it works against
 * the live connection (the CLI `db:reset` still removes the file; on Windows an open
 * connection holds a lock on it).
 */
export async function truncateAllTables(): Promise<void> {
  for (const table of DELETION_ORDER) {
    await db.delete(table);
  }
}
