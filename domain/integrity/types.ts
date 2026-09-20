import type { AlertSeverity } from "../shared/enums";

/**
 * Fixed catalog of check codes the Integrity Center runs (phase-8 brief §11, §17). Numbering
 * follows the brief's own required test IDs (T01, T02, T04...) — gaps (T03, T14, T16, T20,
 * T22, T23) are deliberately absent: they correspond to features this MVP doesn't build
 * (certification/document management, QR passport) rather than an oversight.
 */
export const INTEGRITY_CHECK_CODE = [
  "T01_ORPHAN_LOT",
  "T02_ORPHAN_BUILDING",
  "T04_INVALID_RELATIONSHIP",
  "T05_MISSING_SOURCE",
  "T06_QUANTITY_MISMATCH",
  "T07_BLOCKED_SOURCE_DOWNSTREAM",
  "T08_MISSING_PROVENANCE",
  "T09_REAL_SIMULATION_MISMATCH",
  "T10_MUTATION_WITHOUT_AUDIT",
  "T13_INVALID_ACTOR",
  "T15_INVALID_CHRONOLOGY",
  "T17_POPULATION_RECONCILIATION",
  "T18_DATA_QUALITY",
  "T19_ANOMALY_WITHOUT_ALERT",
  "T21_DEVICE_STALE_OFFLINE",
  "T24_DUPLICATE_CODE",
  "T25_USER_SCOPE_INVALID",
  "T26_USER_ROLE_SCOPE_STRUCTURE",
  "T27_ALERT_LIFECYCLE_AUDIT",
] as const;
export type IntegrityCheckCode = (typeof INTEGRITY_CHECK_CODE)[number];

/**
 * One finding. `status` reflects whether an authorized user has already reviewed this exact
 * issue (via acknowledgeIntegrityIssue) — it does NOT remove the issue from the list. An
 * issue only stops appearing once the underlying data condition is actually fixed and the
 * next computation naturally omits it (phase-8 brief §12: "should represent the state of the
 * data, not a manual score").
 */
export interface IntegrityIssue {
  code: IntegrityCheckCode;
  severity: AlertSeverity;
  entityType: string;
  entityId: string;
  description: string;
  reason: string;
  status: "OPEN" | "ACKNOWLEDGED";
  detectedAt: string;
}

export interface IntegrityReport {
  issues: IntegrityIssue[];
  checksRun: number;
  checksPassed: number;
  criticalCount: number;
  warningCount: number;
  /** checksPassed / checksRun, 0-100. 100 when checksRun is 0 (nothing to check yet). */
  statusPercent: number;
  generatedAt: string;
}

/** Stable key an acknowledgement audit_log entry is filed under — see services/integrity/acknowledge.ts. */
export function integrityIssueKey(issue: Pick<IntegrityIssue, "code" | "entityType" | "entityId">): string {
  return `${issue.code}:${issue.entityType}:${issue.entityId}`;
}
