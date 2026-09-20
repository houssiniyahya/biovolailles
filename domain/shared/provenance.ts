import type { DataStatus, MeasurementSourceType, ValidationStatus } from "./enums";

/**
 * Reusable provenance shape — every structured analytical record (feed/water/weight/
 * mortality/environment, and already lot_events since Phase 1) embeds these fields
 * directly rather than pointing at a generic polymorphic table (ARCHITECTURE.md §7's
 * "embedding for MVP simplicity" decision, kept consistent here). This is what lets the
 * provenance service answer "where did this value come from?" for any record type.
 */
export interface ProvenanceFields {
  sourceType: MeasurementSourceType;
  /** Free-form pointer to the originating record (a feed lot, a device reading batch, etc.) — polymorphic, not FK'd. */
  sourceId: string | null;
  actorId: string | null;
  dataStatus: DataStatus;
  measurementMethod: string | null;
  /** Loose reference — no `devices` table is populated yet (reserved for the IoT phase). */
  deviceId: string | null;
  /** Loose reference — no `documents` table exists yet (reserved for a later phase). */
  documentId: string | null;
  validationStatus: ValidationStatus | null;
}

/**
 * A resolved answer to "where did this value come from?" — see services/provenance.
 * Deliberately raw (status/source as enum values, not display strings): resolving a
 * name from an id (actorName, lotCode, buildingCode) needs a repository lookup, which
 * is why this is a service concern, but *labeling* an enum for display stays with the
 * UI layer (lib/status-colors.ts), so services never import presentation strings.
 */
export interface ProvenanceSummary {
  status: DataStatus;
  source: MeasurementSourceType;
  actorName: string | null;
  timestamp: string;
  lotCode: string | null;
  buildingCode: string | null;
  deviceId: string | null;
  documentId: string | null;
  measurementMethod: string | null;
  validationStatus: ValidationStatus | null;
  /** Set only for derived/computed values (none yet in Phase 3 — reserved for the KPI engine). */
  formula: string | null;
}
