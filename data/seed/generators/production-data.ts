import type { DataStatus, MeasurementSourceType } from "../../../domain/shared/enums";
import type { Lot } from "../../../domain/production/types";
import { repositories } from "../../repositories";

interface MortalityEventSeed {
  count: number;
  occurredAt: string;
  cause: string;
}

interface QualityOverride {
  /** Force one weight measurement to A_CONFIRMER, to demonstrate the quality view (phase-3 brief §18). */
  weightNeedsConfirmation?: boolean;
  /** Force one water reading to have no source/method while claiming REEL, to demonstrate MISSING_PROVENANCE. */
  waterMissingSource?: boolean;
  /**
   * Deliberately under-record one mortality event in mortality_records relative to what
   * lot_events/currentPopulation reflect, to demonstrate population-inconsistency detection.
   * `shortBy` birds are "missing" from the structured record on purpose.
   */
  mortalityUnderReported?: { eventIndex: number; shortBy: number };
}

const DEFAULT_PROVENANCE: { sourceType: MeasurementSourceType; dataStatus: DataStatus } = {
  sourceType: "SIMULATEUR",
  dataStatus: "SIMULATION",
};

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

function daysBetween(startIso: string, endIso: string): number {
  return Math.max(1, Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000));
}

/**
 * Ross 308 as-hatched target body weight (g), the published breed standard, interpolated
 * linearly between weekly anchor points.
 *
 * This replaced a straight line (`0.045 + 0.062 * age`). The line was calibrated at its two
 * ends — 45 g on day 0 and ~2.2 kg on day 35 — but broiler growth is sigmoid, not linear, so
 * it overshot the middle of the cycle badly: 1.35 kg on day 21 against a breed standard of
 * 0.94 kg, i.e. +43%. Because the feed curve below IS correct, that inflated weight inflated
 * the weight *gain* and so collapsed the implied feed conversion ratio to 1.06 on the 21-day
 * lots — below the physical floor for a broiler (~1.2; commercial flocks run 1.5-1.8). Any
 * poultry engineer reading the demo data would have caught it.
 */
const ROSS_308_WEIGHT_G: [day: number, grams: number][] = [
  [0, 42],
  [7, 185],
  [14, 465],
  [21, 943],
  [28, 1576],
  [35, 2283],
  [42, 2977],
];

function expectedWeightKg(ageDays: number): number {
  const points = ROSS_308_WEIGHT_G;
  const clamped = Math.max(0, ageDays);

  let grams: number;
  if (clamped >= points[points.length - 1][0]) {
    // Past the table, continue at the final weekly slope rather than flat-lining.
    const [d1, g1] = points[points.length - 2];
    const [d2, g2] = points[points.length - 1];
    grams = g2 + ((g2 - g1) / (d2 - d1)) * (clamped - d2);
  } else {
    let i = 0;
    while (points[i + 1][0] < clamped) i++;
    const [d1, g1] = points[i];
    const [d2, g2] = points[i + 1];
    grams = g1 + ((g2 - g1) / (d2 - d1)) * (clamped - d1);
  }

  return Math.round((grams / 1000) * 100) / 100;
}

/** Feed consumption grows with age; scaled by flock size. Roughly matches standard broiler feed curves. */
function expectedDailyFeedKg(ageDays: number, population: number): number {
  const perBirdKg = 0.015 + 0.0045 * ageDays;
  return Math.round(perBirdKg * population * 10) / 10;
}

function expectedDailyWaterLiters(ageDays: number, population: number): number {
  return Math.round(expectedDailyFeedKg(ageDays, population) * 1.8 * 10) / 10;
}

/**
 * Generates a coherent, deterministic set of structured records (feed/water/weight/
 * environment/mortality) for one lot, spanning from its start date to "now" (or its end
 * date for closed lots). Mortality mirrors the lot_events history exactly so population
 * reconciliation checks out — except where `overrides` deliberately breaks that, for the
 * demo's intentional quality issues (phase-3 brief §18).
 */
export async function seedLotProductionData(
  lot: Lot,
  buildingId: string,
  mortalityEvents: MortalityEventSeed[],
  overrides: QualityOverride = {}
): Promise<void> {
  if (!lot.startedAt) return;

  const referenceEnd = lot.endedAt ?? new Date("2026-08-16T00:00:00.000Z").toISOString();
  const totalDays = Math.min(daysBetween(lot.startedAt, referenceEnd), 40);

  // Weight: sampled roughly weekly.
  const weightDays = [7, 14, 21, 28, 35].filter((d) => d <= totalDays);
  for (const [index, day] of weightDays.entries()) {
    const isConfirmationDemo = overrides.weightNeedsConfirmation && index === weightDays.length - 1;
    await repositories.weightMeasurements.create({
      lotId: lot.id,
      occurredAt: addDays(lot.startedAt, day),
      averageWeight: expectedWeightKg(day),
      unit: "KG",
      sampleCount: 50,
      ...DEFAULT_PROVENANCE,
      dataStatus: isConfirmationDemo ? "A_CONFIRMER" : "SIMULATION",
      sourceId: null,
      actorId: null,
      measurementMethod: "Pesée manuelle — échantillon de 50 sujets",
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
  }

  // Feed and water: every 4 days.
  const usageDays = Array.from({ length: Math.floor(totalDays / 4) }, (_, i) => (i + 1) * 4).filter((d) => d <= totalDays);
  for (const [index, day] of usageDays.entries()) {
    const occurredAt = addDays(lot.startedAt, day);
    await repositories.feedUsage.create({
      lotId: lot.id,
      occurredAt,
      quantity: expectedDailyFeedKg(day, lot.initialPopulation) * 4,
      unit: "KG",
      feedType: day <= 14 ? "Démarrage" : day <= 28 ? "Croissance" : "Finition",
      feedSource: "Lot aliment F-2026",
      ...DEFAULT_PROVENANCE,
      sourceId: null,
      actorId: null,
      measurementMethod: null,
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });

    const isMissingSourceDemo = overrides.waterMissingSource && index === 0;
    await repositories.waterUsage.create({
      buildingId,
      lotId: lot.id,
      occurredAt,
      quantity: expectedDailyWaterLiters(day, lot.initialPopulation) * 4,
      unit: "L",
      source: isMissingSourceDemo ? null : "Réseau agricole",
      sourceType: isMissingSourceDemo ? "MANUEL" : DEFAULT_PROVENANCE.sourceType,
      dataStatus: isMissingSourceDemo ? "REEL" : DEFAULT_PROVENANCE.dataStatus,
      sourceId: null,
      actorId: null,
      measurementMethod: isMissingSourceDemo ? null : "Compteur de bâtiment",
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
  }

  // Environment: temperature (declining as chicks grow) + humidity, every 4 days.
  const envDays = usageDays;
  for (const day of envDays) {
    const occurredAt = addDays(lot.startedAt, day);
    const temperature = Math.max(21, 32 - day * 0.3);
    await repositories.environmentMeasurements.create({
      buildingId,
      lotId: lot.id,
      measurementType: "TEMPERATURE",
      value: Math.round(temperature * 10) / 10,
      unit: "C",
      occurredAt,
      ...DEFAULT_PROVENANCE,
      sourceId: null,
      actorId: null,
      measurementMethod: "Relevé manuel",
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
    await repositories.environmentMeasurements.create({
      buildingId,
      lotId: lot.id,
      measurementType: "HUMIDITE",
      value: 62,
      unit: "%",
      occurredAt,
      ...DEFAULT_PROVENANCE,
      sourceId: null,
      actorId: null,
      measurementMethod: "Relevé manuel",
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
  }

  // Mortality: mirrors the lot_events MORTALITE history so reconciliation is consistent,
  // except for the one deliberately under-reported entry (if this lot is the demo case).
  for (const [index, event] of mortalityEvents.entries()) {
    const shortBy = overrides.mortalityUnderReported?.eventIndex === index ? overrides.mortalityUnderReported.shortBy : 0;
    await repositories.mortalityRecords.create({
      lotId: lot.id,
      occurredAt: event.occurredAt,
      count: event.count - shortBy,
      suspectedCause: event.cause,
      causeValidated: false,
      ...DEFAULT_PROVENANCE,
      sourceId: null,
      actorId: null,
      measurementMethod: "Comptage manuel",
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
  }
}
