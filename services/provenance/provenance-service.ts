import { repositories } from "../../data/repositories";
import type { ProvenanceFields, ProvenanceSummary } from "../../domain/shared/provenance";

export interface ProvenanceContext {
  occurredAt: string;
  lotId?: string | null;
  buildingId?: string | null;
  /** Set only for a derived/computed value — none exist yet in Phase 3, reserved for the KPI engine. */
  formula?: string | null;
}

/**
 * The single place that turns a record's raw provenance fields into the answer to
 * "where did this value come from?" (phase-3 brief §11) — resolves the actor's name,
 * the lot's business code, and the building's code, all of which need a lookup that a
 * pure domain function can't do. Every record type (feed/water/weight/mortality/
 * environment, lot_events) can be described this way since they share ProvenanceFields.
 */
export async function describeProvenance(fields: ProvenanceFields, context: ProvenanceContext): Promise<ProvenanceSummary> {
  const [actor, lot, building] = await Promise.all([
    fields.actorId ? repositories.users.findById(fields.actorId) : Promise.resolve(null),
    context.lotId ? repositories.lots.findById(context.lotId) : Promise.resolve(null),
    context.buildingId ? repositories.buildings.findById(context.buildingId) : Promise.resolve(null),
  ]);

  return {
    status: fields.dataStatus,
    source: fields.sourceType,
    actorName: actor?.fullName ?? null,
    timestamp: context.occurredAt,
    lotCode: lot?.code ?? null,
    buildingCode: building?.code ?? null,
    deviceId: fields.deviceId,
    documentId: fields.documentId,
    measurementMethod: fields.measurementMethod,
    validationStatus: fields.validationStatus,
    formula: context.formula ?? null,
  };
}
