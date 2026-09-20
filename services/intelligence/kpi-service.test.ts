import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { computeKpi, findOrCreateKpiDefinition, persistKpiEvidence, rollingPeriod } from "./kpi-service";

async function seedLot(suffix: string, overrides: { initialPopulation?: number; currentPopulation?: number } = {}) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const lot = await repositories.lots.create({
    buildingId: building.id,
    code: `LOT-${suffix}`,
    species: "Poulet",
    breed: "Ross",
    status: "ACTIF",
    initialPopulation: overrides.initialPopulation ?? 1000,
    currentPopulation: overrides.currentPopulation ?? 950,
    plannedStartAt: null,
    startedAt: "2026-07-01T06:00:00.000Z",
    endedAt: null,
    dataStatus: "SIMULATION",
  });
  return { lot, building, farm };
}

const PROVENANCE = { sourceType: "SIMULATEUR" as const, sourceId: null, actorId: null, measurementMethod: null, deviceId: null, documentId: null, validationStatus: null };

describe("computeKpi — CURRENT_POPULATION", () => {
  it("is AVAILABLE and matches the lot's currentPopulation when reconciliation is consistent", async () => {
    const { lot } = await seedLot("KPI1", { initialPopulation: 1000, currentPopulation: 1000 });
    const result = await computeKpi(lot.id, "CURRENT_POPULATION");
    expect(result.value).toBe(1000);
    expect(result.eligibility).toBe("AVAILABLE");
    expect(result.dataStatus).toBe("CALCULE");
  });

  it("is LIMITED when the recorded population doesn't match the reconciled history", async () => {
    const { lot } = await seedLot("KPI2", { initialPopulation: 1000, currentPopulation: 950 });
    await repositories.mortalityRecords.create({ lotId: lot.id, occurredAt: "2026-07-05T00:00:00.000Z", count: 10, suspectedCause: null, causeValidated: false, ...PROVENANCE, dataStatus: "SIMULATION" });
    const result = await computeKpi(lot.id, "CURRENT_POPULATION");
    // expected = 1000 - 10 = 990, recorded = 950 -> inconsistent
    expect(result.eligibility).toBe("LIMITED");
    expect(result.populationReconciliation?.consistent).toBe(false);
  });
});

describe("computeKpi — MORTALITY_RATE", () => {
  it("matches the brief's worked example (2/200 = 1%) when scaled proportionally", async () => {
    const { lot } = await seedLot("KPI3", { currentPopulation: 198 });
    const now = new Date("2026-08-16T00:00:00.000Z");
    await repositories.mortalityRecords.create({ lotId: lot.id, occurredAt: "2026-08-14T00:00:00.000Z", count: 2, suspectedCause: null, causeValidated: false, ...PROVENANCE, dataStatus: "SIMULATION" });
    const result = await computeKpi(lot.id, "MORTALITY_RATE", now, 7);
    expect(result.value).toBe(1);
    expect(result.eligibility).toBe("AVAILABLE");
  });

  it("is AVAILABLE with a 0% value when there is simply no mortality in the period (not insufficient data)", async () => {
    const { lot } = await seedLot("KPI4");
    const result = await computeKpi(lot.id, "MORTALITY_RATE", new Date("2026-08-16T00:00:00.000Z"), 7);
    expect(result.value).toBe(0);
    expect(result.eligibility).toBe("AVAILABLE");
  });

  it("is LIMITED when a mortality record in the period is marked A_CONFIRMER", async () => {
    const { lot } = await seedLot("KPI5");
    const now = new Date("2026-08-16T00:00:00.000Z");
    await repositories.mortalityRecords.create({ lotId: lot.id, occurredAt: "2026-08-14T00:00:00.000Z", count: 2, suspectedCause: null, causeValidated: false, ...PROVENANCE, dataStatus: "A_CONFIRMER" });
    const result = await computeKpi(lot.id, "MORTALITY_RATE", now, 7);
    expect(result.eligibility).toBe("LIMITED");
  });
});

describe("computeKpi — AVERAGE_WEIGHT / FEED_CONSUMPTION / WATER_CONSUMPTION", () => {
  it("is INSUFFICIENT when there is no record at all in the period (missing data fails safe, not silently zero)", async () => {
    const { lot } = await seedLot("KPI6");
    const now = new Date("2026-08-16T00:00:00.000Z");
    for (const code of ["AVERAGE_WEIGHT", "FEED_CONSUMPTION", "WATER_CONSUMPTION"] as const) {
      const result = await computeKpi(lot.id, code, now, 7);
      expect(result.value).toBeNull();
      expect(result.eligibility).toBe("INSUFFICIENT");
    }
  });

  it("sums feed/water and takes the latest weight within the period", async () => {
    const { lot, building } = await seedLot("KPI7");
    const now = new Date("2026-08-16T00:00:00.000Z");
    await repositories.feedUsage.create({ lotId: lot.id, occurredAt: "2026-08-12T00:00:00.000Z", quantity: 400, unit: "KG", feedType: "Croissance", feedSource: null, ...PROVENANCE, dataStatus: "SIMULATION" });
    await repositories.feedUsage.create({ lotId: lot.id, occurredAt: "2026-08-14T00:00:00.000Z", quantity: 500, unit: "KG", feedType: "Croissance", feedSource: null, ...PROVENANCE, dataStatus: "SIMULATION" });
    await repositories.waterUsage.create({ buildingId: building.id, lotId: lot.id, occurredAt: "2026-08-13T00:00:00.000Z", quantity: 800, unit: "L", source: null, ...PROVENANCE, dataStatus: "SIMULATION" });
    await repositories.weightMeasurements.create({ lotId: lot.id, occurredAt: "2026-08-10T00:00:00.000Z", averageWeight: 1.2, unit: "KG", sampleCount: 50, ...PROVENANCE, dataStatus: "SIMULATION" });
    await repositories.weightMeasurements.create({ lotId: lot.id, occurredAt: "2026-08-15T00:00:00.000Z", averageWeight: 1.6, unit: "KG", sampleCount: 50, ...PROVENANCE, dataStatus: "SIMULATION" });

    const feed = await computeKpi(lot.id, "FEED_CONSUMPTION", now, 7);
    const water = await computeKpi(lot.id, "WATER_CONSUMPTION", now, 7);
    const weight = await computeKpi(lot.id, "AVERAGE_WEIGHT", now, 7);
    expect(feed.value).toBe(900);
    expect(water.value).toBe(800);
    expect(weight.value).toBe(1.6); // the most recent of the two
  });
});

describe("computeKpi — FCR", () => {
  it("is INSUFFICIENT with fewer than two weight measurements (mathematically not computable)", async () => {
    const { lot } = await seedLot("KPI8");
    await repositories.weightMeasurements.create({ lotId: lot.id, occurredAt: "2026-08-10T00:00:00.000Z", averageWeight: 1.2, unit: "KG", sampleCount: 50, ...PROVENANCE, dataStatus: "SIMULATION" });
    const result = await computeKpi(lot.id, "FCR");
    expect(result.value).toBeNull();
    expect(result.eligibility).toBe("INSUFFICIENT");
  });

  it("computes flock-level feed / weight-gain between the two most recent weigh-ins", async () => {
    const { lot } = await seedLot("KPI9", { currentPopulation: 1000 });
    await repositories.weightMeasurements.create({ lotId: lot.id, occurredAt: "2026-08-01T00:00:00.000Z", averageWeight: 1.0, unit: "KG", sampleCount: 50, ...PROVENANCE, dataStatus: "SIMULATION" });
    await repositories.weightMeasurements.create({ lotId: lot.id, occurredAt: "2026-08-08T00:00:00.000Z", averageWeight: 1.5, unit: "KG", sampleCount: 50, ...PROVENANCE, dataStatus: "SIMULATION" });
    // flock weight gain = (1.5-1.0) * 1000 = 500kg
    await repositories.feedUsage.create({ lotId: lot.id, occurredAt: "2026-08-04T00:00:00.000Z", quantity: 1000, unit: "KG", feedType: "Croissance", feedSource: null, ...PROVENANCE, dataStatus: "SIMULATION" });

    const result = await computeKpi(lot.id, "FCR");
    expect(result.value).toBe(2); // 1000kg feed / 500kg gain
    expect(result.eligibility).toBe("AVAILABLE");
  });
});

describe("persistKpiEvidence / findOrCreateKpiDefinition", () => {
  it("idempotently creates the kpi_definitions row and persists a CALCULE evidence row", async () => {
    const { lot } = await seedLot("KPI10");
    const now = new Date("2026-08-16T00:00:00.000Z");
    const period = rollingPeriod(now, 7);

    const evidence = await persistKpiEvidence(lot.id, "FEED_CONSUMPTION", 1234, period, "SIMULATION", now);
    expect(evidence.value).toBe(1234);
    expect(evidence.dataStatus).toBe("CALCULE");

    const definition = await findOrCreateKpiDefinition("FEED_CONSUMPTION");
    expect(evidence.kpiDefinitionId).toBe(definition.id);

    const stored = await repositories.kpiValues.listByLot(lot.id);
    expect(stored.map((v) => v.id)).toContain(evidence.id);
  });
});
