/**
 * Pure per-KPI formulas (phase-6 brief §4) — each takes already-fetched, already-scoped
 * records and returns a plain number (or null when the calculation isn't mathematically
 * valid, e.g. FCR without two weight measurements bracketing the period). No I/O, no
 * knowledge of "now" — the caller (services/intelligence/kpi-service.ts) decides the period
 * and fetches the records; that's what makes these directly unit-testable.
 */

export interface DatedQuantity {
  occurredAt: string;
  quantity: number;
}

export interface DatedWeight {
  occurredAt: string;
  averageWeight: number;
}

export function filterByPeriod<T extends { occurredAt: string }>(records: T[], from: Date, to: Date): T[] {
  return records.filter((r) => {
    const t = new Date(r.occurredAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

export function sumQuantity(records: DatedQuantity[]): number {
  return Math.round(records.reduce((sum, r) => sum + r.quantity, 0) * 10) / 10;
}

/** (mortality in period / population at the start of the period) × 100 — brief's own worked example: 2/200 = 1%. */
export function calculateMortalityRate(mortalityInPeriod: number, populationAtPeriodStart: number): number | null {
  if (populationAtPeriodStart <= 0) return null;
  return Math.round((mortalityInPeriod / populationAtPeriodStart) * 1000) / 10;
}

/** Most recent weight measurement in the period — "average weight" is a point-in-time reading, not a sum. */
export function latestWeight(records: DatedWeight[]): DatedWeight | null {
  if (records.length === 0) return null;
  return records.reduce((latest, r) => (new Date(r.occurredAt) > new Date(latest.occurredAt) ? r : latest));
}

/** kg gained per day between two weight measurements — the basis for both FCR and the performance-decline rule. */
export function calculateGrowthRatePerDay(current: DatedWeight, previous: DatedWeight): number | null {
  const days = (new Date(current.occurredAt).getTime() - new Date(previous.occurredAt).getTime()) / 86_400_000;
  if (days <= 0) return null;
  return Math.round(((current.averageWeight - previous.averageWeight) / days) * 1000) / 1000;
}

/**
 * FCR = flock feed consumed / flock weight gained, both over the same bracketing interval —
 * the caller is responsible for scaling a per-bird average-weight gain up to flock level
 * (× population) before calling this. Returns null (never a fabricated ratio) when there's
 * no positive weight gain to divide by — "FCR only if the underlying data supports a
 * mathematically valid calculation" (brief §4).
 */
export function calculateFcr(feedKg: number, flockWeightGainKg: number): number | null {
  if (feedKg <= 0 || flockWeightGainKg <= 0) return null;
  return Math.round((feedKg / flockWeightGainKg) * 100) / 100;
}

/**
 * A raw period-over-period feed comparison is systematically biased for a growing flock —
 * a broiler's daily intake genuinely ramps up ~30-50% across a couple of weeks early in the
 * cycle, so "last week vs this week" alone would flag every healthy, on-curve lot as a
 * "deviation" every week. Scaling the reference by the ratio of the lot's average age across
 * the two periods removes that expected age-driven growth, so only a genuine deviation from
 * the lot's own trend stands out — "define the reference clearly" (phase-6 brief §6), not an
 * arbitrary raw comparison. Returns null when the lot doesn't have two full periods of
 * history yet (previousMidAgeDays <= 0).
 */
export function ageAdjustedReference(previousValue: number, currentMidAgeDays: number, previousMidAgeDays: number): number | null {
  if (previousValue <= 0 || previousMidAgeDays <= 0 || currentMidAgeDays <= 0) return null;
  return Math.round(previousValue * (currentMidAgeDays / previousMidAgeDays) * 10) / 10;
}
