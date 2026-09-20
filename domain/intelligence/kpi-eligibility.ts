import type { DataStatus } from "../shared/enums";

export type KpiEligibility = "AVAILABLE" | "LIMITED" | "INSUFFICIENT";

export interface KpiEligibilityResult {
  eligibility: KpiEligibility;
  reason: string | null;
}

/**
 * A KPI must know whether its source data is usable (phase-6 brief §3) — a computed value
 * must never silently read as fully validated when it isn't. SIMULATION is treated as
 * usable (it's this whole demo environment's normal state, always visibly tagged elsewhere —
 * ARCHITECTURE.md §7); MANQUANT/A_CONFIRMER genuinely degrade trust in the value.
 */
export function evaluateKpiEligibility(dataStatuses: DataStatus[]): KpiEligibilityResult {
  const usable = dataStatuses.filter((status) => status !== "MANQUANT");
  if (usable.length === 0) {
    return { eligibility: "INSUFFICIENT", reason: "Aucune donnée exploitable pour cette période." };
  }

  const missingCount = dataStatuses.length - usable.length;
  const unconfirmedCount = usable.filter((status) => status === "A_CONFIRMER").length;

  if (missingCount > 0 && unconfirmedCount > 0) {
    return {
      eligibility: "LIMITED",
      reason: `${missingCount} enregistrement(s) manquant(s) et ${unconfirmedCount} à confirmer sur la période.`,
    };
  }
  if (missingCount > 0) {
    return { eligibility: "LIMITED", reason: `${missingCount} enregistrement(s) manquant(s) sur la période.` };
  }
  if (unconfirmedCount > 0) {
    return { eligibility: "LIMITED", reason: `${unconfirmedCount} enregistrement(s) à confirmer sur la période.` };
  }
  return { eligibility: "AVAILABLE", reason: null };
}
