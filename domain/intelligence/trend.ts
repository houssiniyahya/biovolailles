/**
 * Simple, transparent trend engine (phase-6 brief §7). A trend compares a "current" value to
 * a clearly-defined "previous" reference (services/intelligence/performance-service.ts owns
 * what those periods mean — e.g. last 7 days vs the 7 days before that). This module only
 * does the comparison, and refuses to call anything a trend without enough observations.
 */

export const TREND_DIRECTION = ["INCREASING", "DECREASING", "STABLE", "INSUFFICIENT_DATA"] as const;
export type TrendDirection = (typeof TREND_DIRECTION)[number];

export interface TrendResult {
  direction: TrendDirection;
  currentValue: number | null;
  previousValue: number | null;
  /** (current - previous) / |previous| × 100. Null whenever direction is INSUFFICIENT_DATA. */
  deviationPercent: number | null;
}

/** A move smaller than this band is reported STABLE rather than a manufactured up/down blip. */
const STABLE_BAND_PERCENT = 3;

/** A trend needs at least this many underlying raw observations across both periods combined. */
export const MIN_TREND_OBSERVATIONS = 2;

export function computeTrend(
  currentValue: number | null,
  previousValue: number | null,
  observationCount: number
): TrendResult {
  if (currentValue === null || previousValue === null || previousValue === 0 || observationCount < MIN_TREND_OBSERVATIONS) {
    return { direction: "INSUFFICIENT_DATA", currentValue, previousValue, deviationPercent: null };
  }

  const deviationPercent = Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 1000) / 10;
  const direction: TrendDirection =
    Math.abs(deviationPercent) < STABLE_BAND_PERCENT ? "STABLE" : deviationPercent > 0 ? "INCREASING" : "DECREASING";

  return { direction, currentValue, previousValue, deviationPercent };
}
