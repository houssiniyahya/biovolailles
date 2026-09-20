import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { transitionLotStatus } from "../production/lot-lifecycle";
import { createTestSession } from "../production/test-support";
import { buildLotTraceabilityChain } from "./chain";
import { createCollection } from "./collection";
import { createDestination } from "./destination";
import { createProduct } from "./product";
import { createSlaughterBatch } from "./slaughter";
import { checkTraceabilityIntegrity } from "./integrity";
import { createTransformationBatch } from "./transformation";

async function seedFullChain(suffix: string, options: { lotStatus?: "ACTIF" | "ABATTU" | "TRANSFORME" | "CLOTURE" } = {}) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const lot = await repositories.lots.create({
    buildingId: building.id, code: `LOT-${suffix}`, species: "Poulet", breed: "Ross", status: options.lotStatus ?? "CLOTURE",
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
  const destination = await createDestination({ code: `DEST-${suffix}`, name: "Marché Test", type: "MARCHE", city: "Kénitra" }, admin);
  const product = await createProduct(
    { code: `PROD-${suffix}`, name: "Poulet découpé", category: "Volaille", transformationBatchId: transformation.id, packagingDate: "2026-08-04T00:00:00.000Z", destinationId: destination.id, dataStatus: "SIMULATION", sourceType: "MANUEL" },
    admin
  );
  return { lot, farm, collection, slaughter, transformation, destination, product, admin };
}

describe("checkTraceabilityIntegrity", () => {
  it("reports zero issues for a fully coherent chain", async () => {
    const { lot, admin } = await seedFullChain("INT1");
    const chain = await buildLotTraceabilityChain(lot.id, admin);
    const issues = await checkTraceabilityIntegrity(chain, lot);
    expect(issues).toEqual([]);
  });

  it("flags a blocked/suspended source lot that already has downstream products", async () => {
    const { lot, admin } = await seedFullChain("INT2", { lotStatus: "ACTIF" });
    await transitionLotStatus(lot.id, "BLOQUE", admin);
    const blockedLot = await repositories.lots.findById(lot.id);
    const chain = await buildLotTraceabilityChain(lot.id, admin);
    const issues = await checkTraceabilityIntegrity(chain, blockedLot!);
    expect(issues.some((i) => i.code === "BLOCKED_SOURCE_DOWNSTREAM")).toBe(true);
  });

  it("flags a quantity mismatch when a stage's persisted math no longer balances", async () => {
    const { lot, admin, slaughter } = await seedFullChain("INT3");
    // Directly corrupt the persisted record — simulates data drift the creation-time check can no longer see.
    await repositories.slaughterBatches.create({
      code: "AB-INT3-corrupt",
      sourceLotId: lot.id,
      quantityIn: 500,
      quantityOut: 100,
      losses: 100, // 100 + 100 != 500
      slaughteredAt: "2026-08-02T00:00:00.000Z",
      sourceType: "MANUEL",
      sourceId: null,
      actorId: null,
      dataStatus: "SIMULATION",
      measurementMethod: null,
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
    await repositories.relations.create({
      fromType: "SLAUGHTER_BATCH",
      fromId: (await repositories.slaughterBatches.findByCode("AB-INT3-corrupt"))!.id,
      relationType: "ABATTU_DEPUIS",
      toType: "LOT",
      toId: lot.id,
      metadata: {},
    });

    const chain = await buildLotTraceabilityChain(lot.id, admin);
    const issues = await checkTraceabilityIntegrity(chain, lot);
    expect(issues.some((i) => i.code === "QUANTITY_MISMATCH")).toBe(true);
    void slaughter;
  });

  it("flags an implausible chronology when a downstream stage predates its source", async () => {
    const { lot, admin, collection } = await seedFullChain("INT4");
    // A slaughter batch dated before the collection it claims to come from.
    const earlyBatch = await repositories.slaughterBatches.create({
      code: "AB-INT4-early",
      sourceLotId: lot.id,
      quantityIn: 100,
      quantityOut: 70,
      losses: 30,
      slaughteredAt: "2026-07-15T00:00:00.000Z", // before the 2026-08-01 collection
      sourceType: "MANUEL",
      sourceId: null,
      actorId: null,
      dataStatus: "SIMULATION",
      measurementMethod: null,
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
    await repositories.relations.create({
      fromType: "SLAUGHTER_BATCH",
      fromId: earlyBatch.id,
      relationType: "ABATTU_DEPUIS",
      toType: "COLLECTION",
      toId: collection.id,
      metadata: {},
    });

    const chain = await buildLotTraceabilityChain(lot.id, admin);
    const issues = await checkTraceabilityIntegrity(chain, lot);
    expect(issues.some((i) => i.code === "INVALID_CHRONOLOGY")).toBe(true);
  });

  it("flags missing provenance on a REEL-status record with no source/document/method", async () => {
    const { lot, admin } = await seedFullChain("INT5");
    const badCollection = await repositories.collections.create({
      code: "COL-INT5-noprov",
      lotId: lot.id,
      quantity: 10,
      unit: "KG",
      destinationId: null,
      collectedAt: "2026-08-01T00:00:00.000Z",
      sourceType: "MANUEL",
      sourceId: null,
      actorId: null,
      dataStatus: "REEL",
      measurementMethod: null,
      deviceId: null,
      documentId: null,
      validationStatus: null,
    });
    await repositories.relations.create({ fromType: "COLLECTION", fromId: badCollection.id, relationType: "COLLECTE_DE", toType: "LOT", toId: lot.id, metadata: {} });

    const chain = await buildLotTraceabilityChain(lot.id, admin);
    const issues = await checkTraceabilityIntegrity(chain, lot);
    expect(issues.some((i) => i.code === "MISSING_PROVENANCE")).toBe(true);
  });
});
