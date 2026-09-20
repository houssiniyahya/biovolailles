import { repositories } from "../../repositories";

/**
 * Adds two real, additional records for the hero lot BU-2026-001 — a feed record above its
 * normal recent pattern, and a weight measurement showing a slower gain than the previous
 * interval — deliberately, but as genuine persisted structured data, not an inserted
 * "anomaly detected" row (phase-6 brief §10).
 *
 * The weight is calibrated against the Ross 308 curve in generators/production-data.ts: day 21
 * lands on the breed standard 0.943 kg, and this day-25 reading of 1.12 kg is a gain of
 * ~44 g/day against ~68 g/day over the preceding week — a growth deviation past -20%, which is
 * what makes rule-engine.ts escalate PERFORMANCE_DECLINE from WARNING to CRITICAL. A flock
 * eating 25% above pattern while its growth halves is the whole point of the hero scenario;
 * the severity is earned by the numbers, not asserted. The rule engine (services/intelligence/detection.ts)
 * derives the FEED_DEVIATION_ABOVE_REFERENCE and PERFORMANCE_DECLINE anomalies from these on
 * its own when it runs — this file only adds the underlying measurements.
 *
 * Kept as a separate, additive seed step (not a change to the generic
 * generators/production-data.ts curve every lot uses) — same pattern as phase-4's
 * services/iot/hero-scenario.ts being a standalone addendum rather than a modification to
 * the shared simulator.
 */
export async function seedHeroPerformanceAnomaly(heroLotId: string): Promise<void> {
  await repositories.feedUsage.create({
    lotId: heroLotId,
    occurredAt: "2026-08-15T00:00:00.000Z",
    quantity: 3900,
    unit: "KG",
    feedType: "Croissance",
    feedSource: "Lot aliment F-2026",
    sourceType: "SIMULATEUR",
    dataStatus: "SIMULATION",
    sourceId: null,
    actorId: null,
    measurementMethod: null,
    deviceId: null,
    documentId: null,
    validationStatus: null,
  });

  await repositories.weightMeasurements.create({
    lotId: heroLotId,
    occurredAt: "2026-08-15T06:00:00.000Z",
    averageWeight: 1.12,
    unit: "KG",
    sampleCount: 50,
    sourceType: "SIMULATEUR",
    dataStatus: "SIMULATION",
    sourceId: null,
    actorId: null,
    measurementMethod: "Pesée manuelle — échantillon de 50 sujets",
    deviceId: null,
    documentId: null,
    validationStatus: null,
  });
}
