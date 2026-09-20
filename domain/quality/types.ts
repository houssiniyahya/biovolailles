export type QualitySeverity = "error" | "warning";

export interface QualityIssue {
  severity: QualitySeverity;
  code: string;
  message: string;
  field?: string;
}

/** Never just a boolean (phase-3 brief §13) — always the list of issues that produced the verdict. */
export interface QualityCheckResult {
  ok: boolean;
  issues: QualityIssue[];
}
