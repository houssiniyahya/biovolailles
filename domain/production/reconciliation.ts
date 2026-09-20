/**
 * Population reconciliation (phase-3 brief §14) — distinct from population.ts's
 * applyMortality (which computes the *next* population when an event is recorded).
 * This instead re-derives the *expected* population from the full historical record
 * and compares it against what's actually stored on the lot, to catch drift instead
 * of silently trusting the incrementally-maintained `currentPopulation` column.
 */
export interface PopulationReconciliation {
  initialPopulation: number;
  totalMortality: number;
  totalExits: number;
  totalEntries: number;
  expectedPopulation: number;
  recordedPopulation: number;
  consistent: boolean;
  /** recordedPopulation - expectedPopulation. Positive means more birds recorded than the history explains. */
  difference: number;
}

export function reconcilePopulation(input: {
  initialPopulation: number;
  totalMortality: number;
  totalExits: number;
  totalEntries: number;
  recordedPopulation: number;
}): PopulationReconciliation {
  const expectedPopulation = input.initialPopulation - input.totalMortality - input.totalExits + input.totalEntries;
  return {
    initialPopulation: input.initialPopulation,
    totalMortality: input.totalMortality,
    totalExits: input.totalExits,
    totalEntries: input.totalEntries,
    expectedPopulation,
    recordedPopulation: input.recordedPopulation,
    consistent: expectedPopulation === input.recordedPopulation,
    difference: input.recordedPopulation - expectedPopulation,
  };
}
