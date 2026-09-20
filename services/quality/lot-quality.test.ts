import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { createLot } from "../production/lot";
import { createTestSession } from "../production/test-support";
import { computeLotDataQuality } from "./lot-quality";

async function seedLot(suffix: string, initialPopulation = 1000) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, suffix);
  const lot = await createLot(
    { code: `LOT-${suffix}`, buildingId: building.id, species: "Poulet", breed: "Ross", initialPopulation, dataStatus: "SIMULATION" },
    admin
  );
  return { lot, building, admin };
}

describe("computeLotDataQuality", () => {
  it("reports a clean, consistent lot with no structured records as a 100% score with no issues", async () => {
    const { lot } = await seedLot("LQ1");
    const summary = await computeLotDataQuality(lot.id);
    expect(summary.totalRecords).toBe(0);
    expect(summary.errorCount).toBe(0);
    expect(summary.scorePercent).toBe(100);
    expect(summary.populationReconciliation.consistent).toBe(true);
  });

  it("tallies records by data status", async () => {
    const { lot } = await seedLot("LQ2");
    await repositories.weightMeasurements.create({
      lotId: lot.id,
      occurredAt: "2026-01-05T00:00:00.000Z",
      averageWeight: 1.2,
      unit: "KG",
      sampleCount: 20,
      sourceType: "MANUEL",
      sourceId: null,
      actorId: null,
      dataStatus: "VALIDE",
      measurementMethod: "Pesée manuelle",
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
    await repositories.weightMeasurements.create({
      lotId: lot.id,
      occurredAt: "2026-01-06T00:00:00.000Z",
      averageWeight: 1.3,
      unit: "KG",
      sampleCount: 20,
      sourceType: "SIMULATEUR",
      sourceId: null,
      actorId: null,
      dataStatus: "SIMULATION",
      measurementMethod: null,
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });

    const summary = await computeLotDataQuality(lot.id);
    expect(summary.totalRecords).toBe(2);
    expect(summary.byDataStatus.VALIDE).toBe(1);
    expect(summary.byDataStatus.SIMULATION).toBe(1);
  });

  it("detects a population inconsistency between mortality_records and the lot's currentPopulation", async () => {
    const { lot, admin } = await seedLot("LQ3", 1000);
    // Record 10 dead birds in the structured table, but move the lot's population as if 20 had died.
    await repositories.mortalityRecords.create({
      lotId: lot.id,
      occurredAt: "2026-01-05T00:00:00.000Z",
      count: 10,
      suspectedCause: "Test",
      causeValidated: false,
      sourceType: "MANUEL",
      sourceId: null,
      actorId: admin.userId,
      dataStatus: "SIMULATION",
      measurementMethod: null,
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
    await repositories.lots.updatePopulation(lot.id, 980);

    const summary = await computeLotDataQuality(lot.id);
    expect(summary.populationReconciliation.consistent).toBe(false);
    expect(summary.populationReconciliation.expectedPopulation).toBe(990);
    expect(summary.errorCount).toBeGreaterThan(0);
    expect(summary.issues.some((entry) => entry.issue.code === "POPULATION_INCONSISTENCY")).toBe(true);
  });

  it("surfaces a MISSING_PROVENANCE warning without failing the record", async () => {
    const { lot } = await seedLot("LQ4");
    await repositories.waterUsage.create({
      buildingId: lot.buildingId,
      lotId: lot.id,
      occurredAt: "2026-01-05T00:00:00.000Z",
      quantity: 200,
      unit: "L",
      source: null,
      sourceType: "MANUEL",
      sourceId: null,
      actorId: null,
      dataStatus: "REEL",
      measurementMethod: null,
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });

    const summary = await computeLotDataQuality(lot.id);
    expect(summary.warningCount).toBeGreaterThan(0);
    expect(summary.issues.some((entry) => entry.issue.code === "MISSING_PROVENANCE")).toBe(true);
  });
});
