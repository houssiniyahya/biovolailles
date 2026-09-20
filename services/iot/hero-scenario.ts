import type { SimulationAnomalyWindow } from "./sensor-data-source";

/**
 * The one controlled abnormal window for the hero lot (phase-4 brief §6) — a single,
 * shared definition so the seed script and any future live/analysis code never disagree
 * about when it happened. A gradual +4°C rise and fall over 3 days, well within the
 * historical range (the hero lot started 2026-07-21) — not overlapping "now", so live
 * readings stay normal and this shows up purely as a historical event for the future
 * intelligence phase to find.
 */
export const HERO_BUILDING_CODE = "BAT-01";
export const HERO_FARM_NAME = "Ferme Al Baraka";

export const HERO_ANOMALY_WINDOW: SimulationAnomalyWindow = {
  start: new Date("2026-07-31T00:00:00.000Z"),
  end: new Date("2026-08-03T00:00:00.000Z"),
  peakOffset: 4,
};
