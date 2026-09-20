import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { createCollection } from "./collection";

async function seedLot(suffix: string, currentPopulation = 1000) {
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
    initialPopulation: 1000,
    currentPopulation,
    plannedStartAt: null,
    startedAt: "2026-07-01T00:00:00.000Z",
    endedAt: null,
    dataStatus: "SIMULATION",
  });
  return { lot, farm };
}

describe("createCollection", () => {
  it("creates a valid collection counted in birds", async () => {
    const { lot } = await seedLot("COL1");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "COL1admin");
    const collection = await createCollection(
      { code: "COL-T1", lotId: lot.id, quantity: 500, unit: "sujets", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    expect(collection.quantity).toBe(500);
  });

  it("rejects a bird-count collection exceeding the lot's population", async () => {
    const { lot } = await seedLot("COL2", 500);
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "COL2admin");
    await expect(
      createCollection(
        { code: "COL-T2", lotId: lot.id, quantity: 600, unit: "sujets", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("converts population to a weight ceiling for a mass-denominated collection, using the lot's latest weight", async () => {
    const { lot } = await seedLot("COL3", 1000);
    await repositories.weightMeasurements.create({
      lotId: lot.id, occurredAt: "2026-08-01T00:00:00.000Z", averageWeight: 2, unit: "KG", sampleCount: 50,
      sourceType: "SIMULATEUR", dataStatus: "SIMULATION", sourceId: null, actorId: null, measurementMethod: null, deviceId: null, documentId: null, validationStatus: null,
    });
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "COL3admin");
    // ceiling = 1000 * 2kg = 2000kg
    const collection = await createCollection(
      { code: "COL-T3", lotId: lot.id, quantity: 2000, unit: "KG", collectedAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    expect(collection.quantity).toBe(2000);

    await expect(
      createCollection(
        { code: "COL-T3b", lotId: lot.id, quantity: 1, unit: "KG", collectedAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError); // already fully collected
  });

  it("rejects a mass-denominated collection when the lot has no weight measurement to convert against", async () => {
    const { lot } = await seedLot("COL4");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "COL4admin");
    await expect(
      createCollection(
        { code: "COL-T4", lotId: lot.id, quantity: 100, unit: "KG", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an unknown lot", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "COL5admin");
    await expect(
      createCollection(
        { code: "COL-T5", lotId: "no-such-lot", quantity: 1, unit: "sujets", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a duplicate collection code", async () => {
    const { lot } = await seedLot("COL6");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "COL6admin");
    await createCollection(
      { code: "COL-DUP", lotId: lot.id, quantity: 100, unit: "sujets", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    await expect(
      createCollection(
        { code: "COL-DUP", lotId: lot.id, quantity: 50, unit: "sujets", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ConflictError);
  });

  it("rejects an unauthorized role (AUDITOR is read-only)", async () => {
    const { lot } = await seedLot("COL7");
    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "COL7aud");
    await expect(
      createCollection(
        { code: "COL-T7", lotId: lot.id, quantity: 100, unit: "sujets", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        auditor
      )
    ).rejects.toThrow(AuthorizationError);
  });

  it("rejects a caller outside the lot's scope", async () => {
    const { lot } = await seedLot("COL8");
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "some-other-farm-id", "COL8fm");
    await expect(
      createCollection(
        { code: "COL-T8", lotId: lot.id, quantity: 100, unit: "sujets", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        outsider
      )
    ).rejects.toThrow(AuthorizationError);
  });
});
