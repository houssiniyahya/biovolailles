import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { NotFoundError, ValidationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { createCollection } from "./collection";
import { createSlaughterBatch } from "./slaughter";
import { createTransformationBatch } from "./transformation";

async function seedSlaughterBatch(suffix: string, quantityOut = 700) {
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
    { code: `COL-${suffix}`, lotId: lot.id, quantity: 1000, unit: "KG", collectedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
    admin
  );
  const batch = await createSlaughterBatch(
    { code: `AB-${suffix}`, sourceLotId: lot.id, sourceCollectionId: collection.id, quantityIn: 1000, quantityOut, losses: 1000 - quantityOut, slaughteredAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
    admin
  );
  return { lot, batch, admin };
}

describe("createTransformationBatch", () => {
  it("creates a valid batch and records the TRANSFORME_DEPUIS relation", async () => {
    const { batch, admin } = await seedSlaughterBatch("TR1");
    const transformation = await createTransformationBatch(
      { code: "TR-T1", upstreamType: "SLAUGHTER_BATCH", upstreamId: batch.id, processType: "Découpe", inputQuantity: 700, outputQuantity: 600, losses: 0, rejects: 100, occurredAt: "2026-08-03T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    expect(transformation.outputQuantity).toBe(600);
    const relations = await repositories.relations.listFrom("TRANSFORMATION_BATCH", transformation.id);
    expect(relations[0].relationType).toBe("TRANSFORME_DEPUIS");
    expect(relations[0].toId).toBe(batch.id);
  });

  it("rejects input = output + losses + rejects mismatch", async () => {
    const { batch, admin } = await seedSlaughterBatch("TR2");
    await expect(
      createTransformationBatch(
        { code: "TR-T2", upstreamType: "SLAUGHTER_BATCH", upstreamId: batch.id, processType: "Découpe", inputQuantity: 700, outputQuantity: 600, losses: 0, rejects: 50, occurredAt: "2026-08-03T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("rejects inputQuantity exceeding the upstream slaughter batch's own output", async () => {
    const { batch, admin } = await seedSlaughterBatch("TR3", 700);
    await expect(
      createTransformationBatch(
        { code: "TR-T3", upstreamType: "SLAUGHTER_BATCH", upstreamId: batch.id, processType: "Découpe", inputQuantity: 800, outputQuantity: 800, losses: 0, rejects: 0, occurredAt: "2026-08-03T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("chains a second transformation batch off a first one (TRANSFORMATION_BATCH → TRANSFORMATION_BATCH)", async () => {
    const { batch, admin } = await seedSlaughterBatch("TR4");
    const first = await createTransformationBatch(
      { code: "TR-T4a", upstreamType: "SLAUGHTER_BATCH", upstreamId: batch.id, processType: "Découpe", inputQuantity: 700, outputQuantity: 700, losses: 0, rejects: 0, occurredAt: "2026-08-03T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    const second = await createTransformationBatch(
      { code: "TR-T4b", upstreamType: "TRANSFORMATION_BATCH", upstreamId: first.id, processType: "Conditionnement", inputQuantity: 700, outputQuantity: 650, losses: 50, rejects: 0, occurredAt: "2026-08-04T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    expect(second.upstreamType).toBe("TRANSFORMATION_BATCH");
    expect(second.upstreamId).toBe(first.id);
  });

  it("rejects an unknown upstream slaughter batch", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "TR5admin");
    await expect(
      createTransformationBatch(
        { code: "TR-T5", upstreamType: "SLAUGHTER_BATCH", upstreamId: "no-such-batch", processType: "Découpe", inputQuantity: 100, outputQuantity: 100, losses: 0, rejects: 0, occurredAt: "2026-08-03T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(NotFoundError);
  });
});
