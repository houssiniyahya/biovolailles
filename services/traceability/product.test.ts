import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { ConflictError, NotFoundError, ValidationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { createCollection } from "./collection";
import { createDestination } from "./destination";
import { createProduct } from "./product";
import { createSlaughterBatch } from "./slaughter";
import { createTransformationBatch } from "./transformation";

async function seedTransformationBatch(suffix: string) {
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
  const slaughter = await createSlaughterBatch(
    { code: `AB-${suffix}`, sourceLotId: lot.id, sourceCollectionId: collection.id, quantityIn: 1000, quantityOut: 700, losses: 300, slaughteredAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
    admin
  );
  const transformation = await createTransformationBatch(
    { code: `TR-${suffix}`, upstreamType: "SLAUGHTER_BATCH", upstreamId: slaughter.id, processType: "Découpe", inputQuantity: 700, outputQuantity: 700, losses: 0, rejects: 0, occurredAt: "2026-08-03T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
    admin
  );
  return { lot, transformation, admin };
}

describe("createProduct", () => {
  it("creates a valid product with a source transformation batch", async () => {
    const { transformation, admin } = await seedTransformationBatch("PR1");
    const product = await createProduct(
      { code: "PROD-T1", name: "Poulet découpé", category: "Volaille", transformationBatchId: transformation.id, packagingDate: "2026-08-04T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    expect(product.transformationBatchId).toBe(transformation.id);
    const relations = await repositories.relations.listFrom("PRODUCT", product.id);
    expect(relations.some((r) => r.relationType === "CONDITIONNE_DEPUIS" && r.toId === transformation.id)).toBe(true);
  });

  it("links a destination via DESTINE_A when provided", async () => {
    const { transformation, admin } = await seedTransformationBatch("PR2");
    const destination = await createDestination({ code: "DEST-T2", name: "Marché Test", type: "MARCHE", city: "Kénitra" }, admin);
    const product = await createProduct(
      { code: "PROD-T2", name: "Poulet découpé", category: "Volaille", transformationBatchId: transformation.id, packagingDate: "2026-08-04T00:00:00.000Z", destinationId: destination.id, dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    const relations = await repositories.relations.listFrom("PRODUCT", product.id);
    expect(relations.some((r) => r.relationType === "DESTINE_A" && r.toId === destination.id)).toBe(true);
  });

  it("rejects a product without a valid transformation source", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "PR3admin");
    await expect(
      createProduct(
        { code: "PROD-T3", name: "Poulet découpé", category: "Volaille", transformationBatchId: "no-such-batch", packagingDate: "2026-08-04T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an empty transformationBatchId outright (schema-level: a product without source must be rejected)", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "PR4admin");
    await expect(
      createProduct(
        { code: "PROD-T4", name: "Poulet découpé", category: "Volaille", transformationBatchId: "", packagingDate: "2026-08-04T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a duplicate product code", async () => {
    const { transformation, admin } = await seedTransformationBatch("PR5");
    await createProduct(
      { code: "PROD-DUP", name: "Poulet découpé", category: "Volaille", transformationBatchId: transformation.id, packagingDate: "2026-08-04T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
      admin
    );
    await expect(
      createProduct(
        { code: "PROD-DUP", name: "Poulet découpé", category: "Volaille", transformationBatchId: transformation.id, packagingDate: "2026-08-04T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL" },
        admin
      )
    ).rejects.toThrow(ConflictError);
  });
});
