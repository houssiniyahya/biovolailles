import type { DataStatus } from "../shared/enums";
import type { ProvenanceFields } from "../shared/provenance";
import type { QualityCheckResult, QualityIssue } from "./types";

/**
 * Small, composable checks — each returns a single QualityIssue or null. Per-record-type
 * validators (production-data-quality.ts) compose these instead of duplicating logic,
 * per the phase-3 brief's "reusable data-quality validation layer" requirement.
 */

export function checkRequired(value: unknown, field: string, label: string): QualityIssue | null {
  if (value === null || value === undefined || value === "") {
    return { severity: "error", code: "MISSING_REQUIRED_FIELD", message: `${label} est requis.`, field };
  }
  return null;
}

export function checkPositive(value: number, field: string, label: string): QualityIssue | null {
  if (!Number.isFinite(value) || value <= 0) {
    return { severity: "error", code: "INVALID_QUANTITY", message: `${label} doit être un nombre positif.`, field };
  }
  return null;
}

export function checkNonNegative(value: number, field: string, label: string): QualityIssue | null {
  if (!Number.isFinite(value) || value < 0) {
    return { severity: "error", code: "NEGATIVE_QUANTITY", message: `${label} ne peut pas être négatif.`, field };
  }
  return null;
}

export function checkValidDate(
  value: string,
  field: string,
  label: string,
  options?: { notFuture?: boolean; notBefore?: string }
): QualityIssue | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { severity: "error", code: "INVALID_DATE", message: `${label} n'est pas une date valide.`, field };
  }
  if (options?.notFuture && date.getTime() > Date.now()) {
    return { severity: "error", code: "INVALID_DATE", message: `${label} ne peut pas être dans le futur.`, field };
  }
  if (options?.notBefore) {
    const floor = new Date(options.notBefore);
    if (!Number.isNaN(floor.getTime()) && date.getTime() < floor.getTime()) {
      return {
        severity: "warning",
        code: "DATE_BEFORE_LOT_START",
        message: `${label} est antérieure au démarrage du lot.`,
        field,
      };
    }
  }
  return null;
}

export function checkValidUnit(unit: string, allowedUnits: readonly string[], field = "unit"): QualityIssue | null {
  if (!allowedUnits.includes(unit)) {
    return {
      severity: "error",
      code: "INVALID_UNIT",
      message: `Unité "${unit}" non reconnue (attendu : ${allowedUnits.join(", ")}).`,
      field,
    };
  }
  return null;
}

export function checkValidDataStatus(status: string, allowed: readonly string[], field = "dataStatus"): QualityIssue | null {
  if (!allowed.includes(status)) {
    return { severity: "error", code: "INVALID_STATUS", message: `Statut de données "${status}" invalide.`, field };
  }
  return null;
}

/** REEL/VALIDE data claiming to be real or confirmed should be traceable to *something*. Simulated data is exempt. */
export function checkProvenance(fields: Pick<ProvenanceFields, "sourceId" | "documentId" | "measurementMethod"> & {
  dataStatus: DataStatus;
}): QualityIssue | null {
  const expectsProvenance = fields.dataStatus === "REEL" || fields.dataStatus === "VALIDE";
  if (expectsProvenance && !fields.sourceId && !fields.documentId && !fields.measurementMethod) {
    return {
      severity: "warning",
      code: "MISSING_PROVENANCE",
      message: "Source non précisée pour une donnée réelle ou validée.",
      field: "sourceId",
    };
  }
  return null;
}

export function checkLotBuildingRelationship(lotBuildingId: string, recordBuildingId: string | null): QualityIssue | null {
  if (recordBuildingId && recordBuildingId !== lotBuildingId) {
    return {
      severity: "error",
      code: "INVALID_LOT_BUILDING_RELATIONSHIP",
      message: "Le bâtiment indiqué ne correspond pas au bâtiment du lot.",
      field: "buildingId",
    };
  }
  return null;
}

/** Reusable duplicate detector — used by create-services, which have the existing records on hand. */
export function findDuplicateAt<T extends { occurredAt: string }>(existing: T[], occurredAt: string): QualityIssue | null {
  if (existing.some((r) => r.occurredAt === occurredAt)) {
    return {
      severity: "warning",
      code: "POSSIBLE_DUPLICATE",
      message: "Un autre enregistrement existe déjà exactement à cet horodatage.",
      field: "occurredAt",
    };
  }
  return null;
}

export function collectIssues(...issues: (QualityIssue | null)[]): QualityCheckResult {
  const filtered = issues.filter((issue): issue is QualityIssue => issue !== null);
  return { ok: !filtered.some((issue) => issue.severity === "error"), issues: filtered };
}
