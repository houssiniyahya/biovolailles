import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { NotFoundError, ValidationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { createCollection } from "./collection";
import { createSlaughterBatch } from "./slaughter";

async function seedLotWithCollection(suffix: string, collectionQuantity = 1000) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const lot = await repositories.lots.create({
    buildingId: building.id, code: `LOT-${suffix}`, species: "Poulet", breed: "Ross", status: "ACTIF",
    initialPopulation: 2000, currentPopulation: 2000, plannedStartAt: null, startedAt: "2026-07-01T00:00:00.000Z", endedAt: null, dataStatus: "SIMULATION",
  });
  await repositories.weightMeasurements.create({
    lotId: lot.id, occurredAt: "2026-07-25T00:00:00.000Z", averageWeight: 2, unit: "KG", sampleCount: 50,
    sourceType: "SIMULATEUR", dataStatus: "SIMULATION", sourceId: null, actorId: null, measurementMethod: null, deviceId: null, documentId: null, validationStatus: null,
  });
  const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, `${suffix}admin`);
  const collection = await createCollection(
    { code: `COL-${suffix}`, lotId: lot.id, quantity: collectionQuantity, unit: "KG", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
    admin
  );
  return { lot, farm, collection, admin };
}

describe("createSlaughterBatch", () => {
  it("creates a valid batch and records the ABATTU_DEPUIS relation to the collection", async () => {
    const { lot, collection, admin } = await seedLotWithCollection("SL1");
    const batch = await createSlaughterBatch(
      { code: "AB-T1", sourceLotId: lot.id, sourceCollectionId: collection.id, quantityIn: 1000, quantityOut: 700, losses: 300, slaughteredAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    expect(batch.quantityOut).toBe(700);
    const relations = await repositories.relations.listFrom("SLAUGHTER_BATCH", batch.id);
    expect(relations).toHaveLength(1);
    expect(relations[0].relationType).toBe("ABATTU_DEPUIS");
    expect(relations[0].toId).toBe(collection.id);
  });

  it("rejects a yield that doesn't balance (quantityOut + losses != quantityIn)", async () => {
    const { lot, collection, admin } = await seedLotWithCollection("SL2");
    await expect(
      createSlaughterBatch(
        { code: "AB-T2", sourceLotId: lot.id, sourceCollectionId: collection.id, quantityIn: 1000, quantityOut: 700, losses: 250, slaughteredAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("rejects quantityIn exceeding what the source collection delivered", async () => {
    const { lot, collection, admin } = await seedLotWithCollection("SL3", 500);
    await expect(
      createSlaughterBatch(
        { code: "AB-T3", sourceLotId: lot.id, sourceCollectionId: collection.id, quantityIn: 600, quantityOut: 400, losses: 200, slaughteredAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a collection that doesn't belong to the given lot", async () => {
    const { lot, admin } = await seedLotWithCollection("SL4");
    const { collection: otherCollection } = await seedLotWithCollection("SL4b");
    await expect(
      createSlaughterBatch(
        { code: "AB-T4", sourceLotId: lot.id, sourceCollectionId: otherCollection.id, quantityIn: 100, quantityOut: 70, losses: 30, slaughteredAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an unknown source lot", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "SL5admin");
    await expect(
      createSlaughterBatch(
        { code: "AB-T5", sourceLotId: "no-such-lot", quantityIn: 100, quantityOut: 70, losses: 30, slaughteredAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(NotFoundError);
  });
});
