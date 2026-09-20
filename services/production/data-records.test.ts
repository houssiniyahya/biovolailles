import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, ValidationError } from "../../domain/shared/errors";
import { createLot } from "./lot";
import { createTestSession } from "./test-support";
import {
  createEnvironmentMeasurementRecord,
  createFeedUsageRecord,
  createMortalityRecord,
  createWaterUsageRecord,
  createWeightMeasurementRecord,
} from "./data-records";

async function seedLotAndBuilding(suffix: string, initialPopulation = 1000) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({
    cooperativeId: coop.id,
    name: `Producer ${suffix}`,
    contactPhone: null,
    contactEmail: null,
  });
  const farm = await repositories.farms.create({
    producerId: producer.id,
    name: `Farm ${suffix}`,
    city: "City",
    region: "R",
    geoLat: null,
    geoLng: null,
  });
  const building = await repositories.buildings.create({
    farmId: farm.id,
    code: `BAT-${suffix}`,
    name: "Building",
    capacity: 5000,
    zoneType: "ELEVAGE",
  });
  const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, suffix);
  const lot = await createLot(
    {
      code: `LOT-${suffix}`,
      buildingId: building.id,
      species: "Poulet de chair",
      breed: "Ross 308",
      initialPopulation,
      dataStatus: "SIMULATION",
    },
    admin
  );
  return { lot, building, admin };
}

const provenance = { sourceType: "MANUEL" as const, dataStatus: "SIMULATION" as const };

describe("createFeedUsageRecord", () => {
  it("creates a feed record and links a matching lot_events ALIMENTATION entry", async () => {
    const { lot, admin } = await seedLotAndBuilding("FE1");
    const { record, quality } = await createFeedUsageRecord(
      lot.id,
      { occurredAt: "2026-01-05T00:00:00.000Z", quantity: 200, unit: "KG", feedType: "Croissance", ...provenance },
      admin
    );
    expect(quality.ok).toBe(true);
    const events = await repositories.lotEvents.listByLot(lot.id);
    expect(events.some((e) => e.eventType === "ALIMENTATION" && e.sourceId === record.id)).toBe(true);
  });

  it("rejects a negative quantity", async () => {
    const { lot, admin } = await seedLotAndBuilding("FE2");
    await expect(
      createFeedUsageRecord(lot.id, { occurredAt: "2026-01-05T00:00:00.000Z", quantity: -5, unit: "KG", feedType: "X", ...provenance }, admin)
    ).rejects.toThrow(ValidationError);
  });

  it("denies creation outside the caller's scope", async () => {
    const { lot } = await seedLotAndBuilding("FE3");
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "unrelated-farm", "FE3b");
    await expect(
      createFeedUsageRecord(lot.id, { occurredAt: "2026-01-05T00:00:00.000Z", quantity: 100, unit: "KG", feedType: "X", ...provenance }, outsider)
    ).rejects.toThrow(AuthorizationError);
  });
});

describe("createWaterUsageRecord", () => {
  it("creates a water record scoped to a building", async () => {
    const { lot, building, admin } = await seedLotAndBuilding("WA1");
    const { record } = await createWaterUsageRecord(
      { buildingId: building.id, lotId: lot.id, occurredAt: "2026-01-05T00:00:00.000Z", quantity: 300, unit: "L", ...provenance },
      admin
    );
    expect(record.buildingId).toBe(building.id);
  });

  it("rejects a lot that doesn't belong to the given building", async () => {
    const { building, admin } = await seedLotAndBuilding("WA2");
    const { lot: otherLot } = await seedLotAndBuilding("WA2b");
    await expect(
      createWaterUsageRecord(
        { buildingId: building.id, lotId: otherLot.id, occurredAt: "2026-01-05T00:00:00.000Z", quantity: 100, unit: "L", ...provenance },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an invalid unit", async () => {
    const { building, admin } = await seedLotAndBuilding("WA3");
    await expect(
      createWaterUsageRecord(
        { buildingId: building.id, occurredAt: "2026-01-05T00:00:00.000Z", quantity: 100, unit: "GAL", ...provenance },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });
});

describe("createWeightMeasurementRecord", () => {
  it("creates a weight record and a matching lot_events PESEE entry", async () => {
    const { lot, admin } = await seedLotAndBuilding("WE1");
    const { record } = await createWeightMeasurementRecord(
      lot.id,
      { occurredAt: "2026-01-05T00:00:00.000Z", averageWeight: 1.5, unit: "KG", sampleCount: 30, ...provenance },
      admin
    );
    const events = await repositories.lotEvents.listByLot(lot.id);
    expect(events.some((e) => e.eventType === "PESEE" && e.sourceId === record.id)).toBe(true);
  });

  it("rejects a non-positive weight", async () => {
    const { lot, admin } = await seedLotAndBuilding("WE2");
    await expect(
      createWeightMeasurementRecord(lot.id, { occurredAt: "2026-01-05T00:00:00.000Z", averageWeight: 0, unit: "KG", ...provenance }, admin)
    ).rejects.toThrow(ValidationError);
  });
});

describe("createMortalityRecord", () => {
  it("creates a mortality record, updates the lot population, and links a lot_events MORTALITE entry", async () => {
    const { lot, admin } = await seedLotAndBuilding("MO1", 1000);
    const { record } = await createMortalityRecord(
      lot.id,
      { occurredAt: "2026-01-05T00:00:00.000Z", count: 15, suspectedCause: "Chaleur", ...provenance },
      admin
    );
    const updated = await repositories.lots.findById(lot.id);
    expect(updated?.currentPopulation).toBe(985);

    const events = await repositories.lotEvents.listByLot(lot.id);
    expect(events.some((e) => e.eventType === "MORTALITE" && e.sourceId === record.id)).toBe(true);
  });

  it("rejects mortality exceeding the current population — no silent inconsistency", async () => {
    const { lot, admin } = await seedLotAndBuilding("MO2", 10);
    await expect(
      createMortalityRecord(lot.id, { occurredAt: "2026-01-05T00:00:00.000Z", count: 500, ...provenance }, admin)
    ).rejects.toThrow(ValidationError);
    const unchanged = await repositories.lots.findById(lot.id);
    expect(unchanged?.currentPopulation).toBe(10);
  });

  it("keeps a suspected cause unvalidated by default — never presented as fact", async () => {
    const { lot, admin } = await seedLotAndBuilding("MO3", 1000);
    const { record } = await createMortalityRecord(
      lot.id,
      { occurredAt: "2026-01-05T00:00:00.000Z", count: 5, suspectedCause: "Suspicion de maladie", ...provenance },
      admin
    );
    expect(record.causeValidated).toBe(false);
  });
});

describe("createEnvironmentMeasurementRecord", () => {
  it("creates an environment record for a building", async () => {
    const { building, admin } = await seedLotAndBuilding("EN1");
    const { record } = await createEnvironmentMeasurementRecord(
      { buildingId: building.id, measurementType: "TEMPERATURE", value: 28, unit: "C", occurredAt: "2026-01-05T00:00:00.000Z", ...provenance },
      admin
    );
    expect(record.measurementType).toBe("TEMPERATURE");
  });

  it("rejects a unit that doesn't match the measurement type", async () => {
    const { building, admin } = await seedLotAndBuilding("EN2");
    await expect(
      createEnvironmentMeasurementRecord(
        { buildingId: building.id, measurementType: "TEMPERATURE", value: 28, unit: "%", occurredAt: "2026-01-05T00:00:00.000Z", ...provenance },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });
});
