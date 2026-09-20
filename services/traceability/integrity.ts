import { repositories } from "../../data/repositories";
import { checkProvenance } from "../../domain/quality/checks";
import { validateProcessingYield, validateTransferQuantity } from "../../domain/production/quantity-integrity";
import type { Lot } from "../../domain/production/types";
import { isRelationAllowed } from "../../domain/traceability/relation-rules";
import type { AlertSeverity } from "../../domain/shared/enums";
import { entityExists } from "./entity-resolver";
import { resolveAvailableQuantity } from "./collection";
import type { TraceabilityChain } from "./chain";

export interface TraceabilityIssue {
  severity: AlertSeverity;
  code: string;
  message: string;
  entityType: string;
  entityId: string;
}

/**
 * Automated traceability validation (phase-7 brief §13-§15) over an already-built chain —
 * never a second quantity/provenance engine: quantity checks reuse Phase-3's
 * validateTransferQuantity/validateProcessingYield, provenance checks reuse Phase-3's
 * checkProvenance. Every issue is explainable (a code + a concrete message), never a bare flag.
 */
export async function checkTraceabilityIntegrity(chain: TraceabilityChain, lot: Lot): Promise<TraceabilityIssue[]> {
  const issues: TraceabilityIssue[] = [];

  // Relationship validity — every edge in the chain re-checked against the same rules createRelation() enforces.
  for (const edge of chain.edges) {
    if (!isRelationAllowed(edge.relationType, edge.from.type, edge.to.type)) {
      issues.push({
        severity: "CRITICAL",
        code: "INVALID_RELATIONSHIP",
        message: `La relation "${edge.relationType}" entre ${edge.from.label} et ${edge.to.label} n'est pas autorisée.`,
        entityType: edge.from.type,
        entityId: edge.from.id,
      });
    }
  }

  const collectionRecords = await Promise.all(
    chain.nodes.filter((n) => n.type === "COLLECTION").map((n) => repositories.collections.findById(n.id))
  );
  const slaughterRecords = await Promise.all(
    chain.nodes.filter((n) => n.type === "SLAUGHTER_BATCH").map((n) => repositories.slaughterBatches.findById(n.id))
  );
  const transformationRecords = await Promise.all(
    chain.nodes.filter((n) => n.type === "TRANSFORMATION_BATCH").map((n) => repositories.transformationBatches.findById(n.id))
  );
  const productRecords = await Promise.all(
    chain.nodes.filter((n) => n.type === "PRODUCT").map((n) => repositories.products.findById(n.id))
  );

  // Missing / dangling source — each stage's structural pointer must actually resolve.
  for (const batch of slaughterRecords) {
    if (!batch) continue;
    if (!(await repositories.lots.findById(batch.sourceLotId))) {
      issues.push({
        severity: "CRITICAL",
        code: "MISSING_SOURCE",
        message: `Le lot d'abattage ${batch.code} référence un lot source introuvable.`,
        entityType: "SLAUGHTER_BATCH",
        entityId: batch.id,
      });
    }
  }
  for (const batch of transformationRecords) {
    if (!batch) continue;
    if (!(await entityExists(batch.upstreamType, batch.upstreamId))) {
      issues.push({
        severity: "CRITICAL",
        code: "MISSING_SOURCE",
        message: `Le lot de transformation ${batch.code} référence une source introuvable.`,
        entityType: "TRANSFORMATION_BATCH",
        entityId: batch.id,
      });
    }
  }
  for (const product of productRecords) {
    if (!product) continue;
    if (!(await repositories.transformationBatches.findById(product.transformationBatchId))) {
      issues.push({
        severity: "CRITICAL",
        code: "MISSING_SOURCE",
        message: `Le produit ${product.code} n'a pas de transformation source valide.`,
        entityType: "PRODUCT",
        entityId: product.id,
      });
    }
  }

  // Quantity mismatch — re-verify each stage's own math against the persisted quantities, not just at creation time.
  for (const record of collectionRecords) {
    if (!record) continue;
    const ceiling = await resolveAvailableQuantity(lot, record.unit).catch(() => null);
    if (ceiling === null) continue; // no weight reference to convert against — nothing safe to compare, not itself an error
    const check = validateTransferQuantity(ceiling, record.quantity);
    if (!check.ok) {
      issues.push({ severity: "WARNING", code: "QUANTITY_MISMATCH", message: check.error, entityType: "COLLECTION", entityId: record.id });
    }
  }
  for (const record of slaughterRecords) {
    if (!record) continue;
    const check = validateProcessingYield(record.quantityIn, record.quantityOut, record.losses, 0);
    if (!check.ok) {
      issues.push({ severity: "CRITICAL", code: "QUANTITY_MISMATCH", message: check.error, entityType: "SLAUGHTER_BATCH", entityId: record.id });
    }
  }
  for (const record of transformationRecords) {
    if (!record) continue;
    const check = validateProcessingYield(record.inputQuantity, record.outputQuantity, record.losses, record.rejects);
    if (!check.ok) {
      issues.push({ severity: "CRITICAL", code: "QUANTITY_MISMATCH", message: check.error, entityType: "TRANSFORMATION_BATCH", entityId: record.id });
    }
  }

  // Blocked source producing downstream product (phase-7 brief §14) — detect and report, never silently correct.
  if ((lot.status === "BLOQUE" || lot.status === "SUSPENDU") && productRecords.some(Boolean)) {
    issues.push({
      severity: "CRITICAL",
      code: "BLOCKED_SOURCE_DOWNSTREAM",
      message: `Le lot source ${lot.code} est ${lot.status === "BLOQUE" ? "bloqué" : "suspendu"} alors que des produits en aval existent déjà.`,
      entityType: "LOT",
      entityId: lot.id,
    });
  }

  // Missing provenance — same rule Phase 3 uses for structured records (REEL/VALIDE data should be traceable to something).
  const allRecords: { type: string; id: string; code: string; fields: Parameters<typeof checkProvenance>[0] }[] = [
    ...collectionRecords.filter((r) => r !== null).map((r) => ({ type: "COLLECTION", id: r.id, code: r.code, fields: r })),
    ...slaughterRecords.filter((r) => r !== null).map((r) => ({ type: "SLAUGHTER_BATCH", id: r.id, code: r.code, fields: r })),
    ...transformationRecords.filter((r) => r !== null).map((r) => ({ type: "TRANSFORMATION_BATCH", id: r.id, code: r.code, fields: r })),
    ...productRecords.filter((r) => r !== null).map((r) => ({ type: "PRODUCT", id: r.id, code: r.code, fields: r })),
  ];
  for (const entry of allRecords) {
    const issue = checkProvenance(entry.fields);
    if (issue) {
      issues.push({
        severity: "WARNING",
        code: "MISSING_PROVENANCE",
        message: `${entry.code} : ${issue.message}`,
        entityType: entry.type,
        entityId: entry.id,
      });
    }
  }

  // Chronology — along the discovered edges, the source (to) must not be dated after its dependent (from).
  for (const edge of chain.edges) {
    if (!edge.from.occurredAt || !edge.to.occurredAt) continue;
    if (new Date(edge.from.occurredAt).getTime() < new Date(edge.to.occurredAt).getTime()) {
      issues.push({
        severity: "WARNING",
        code: "INVALID_CHRONOLOGY",
        message: `${edge.from.label} est daté avant ${edge.to.label} — chronologie invraisemblable.`,
        entityType: edge.from.type,
        entityId: edge.from.id,
      });
    }
  }

  return issues;
}
