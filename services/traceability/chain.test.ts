import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { buildLotTraceabilityChain } from "./chain";
import { createCollection } from "./collection";
import { createDestination } from "./destination";
import { createProduct } from "./product";
import { createSlaughterBatch } from "./slaughter";
import { createTransformationBatch } from "./transformation";

async function seedFullChain(suffix: string) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const lot = await repositories.lots.create({
    buildingId: building.id, code: `LOT-${suffix}`, species: "Poulet", breed: "Ross", status: "CLOTURE",
    initialPopulation: 2000, currentPopulation: 2000, plannedStartAt: null, startedAt: "2026-07-01T00:00:00.000Z", endedAt: "2026-08-05T00:00:00.000Z", dataStatus: "SIMULATION",
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
  return { lot, farm, producer, building, collection, slaughter, transformation, destination, product, admin };
}

describe("buildLotTraceabilityChain", () => {
  it("discovers the whole downstream chain from a lot (Lot → Collection → Slaughter → Transformation → Product → Destination)", async () => {
    const seeded = await seedFullChain("CH1");
    const chain = await buildLotTraceabilityChain(seeded.lot.id, seeded.admin);

    const types = chain.nodes.map((n) => n.type).sort();
    expect(types).toEqual(["COLLECTION", "DESTINATION", "LOT", "PRODUCT", "SLAUGHTER_BATCH", "TRANSFORMATION_BATCH"].sort());
    expect(chain.nodes.find((n) => n.type === "PRODUCT")?.code).toBe(seeded.product.code);
  });

  it("reports the real structural upstream (Producer → Farm → Building), never a fabricated one", async () => {
    const seeded = await seedFullChain("CH2");
    const chain = await buildLotTraceabilityChain(seeded.lot.id, seeded.admin);
    const labels = chain.upstream.map((u) => u.label);
    expect(labels).toEqual(["Producteur", "Ferme", "Bâtiment"]);
    expect(chain.upstream.find((u) => u.label === "Ferme")?.name).toBe(seeded.farm.name);
  });

  it("builds a chronological timeline merging lot events and downstream stages", async () => {
    const seeded = await seedFullChain("CH3");
    const chain = await buildLotTraceabilityChain(seeded.lot.id, seeded.admin);
    const timestamps = chain.timeline.map((t) => new Date(t.timestamp).getTime());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
    expect(chain.timeline.some((t) => t.nodeType === "PRODUCT")).toBe(true);
  });

  it("returns just the Lot node for a lot with no downstream chain yet — not an error", async () => {
    const org = await repositories.organizations.create({ name: "Org CH4", type: "COOPERATIVE" });
    const coop = await repositories.cooperatives.create({ organizationId: org.id, name: "Coop CH4", region: "R" });
    const producer = await repositories.producers.create({ cooperativeId: coop.id, name: "Producer CH4", contactPhone: null, contactEmail: null });
    const farm = await repositories.farms.create({ producerId: producer.id, name: "Farm CH4", city: "City", region: "R", geoLat: null, geoLng: null });
    const building = await repositories.buildings.create({ farmId: farm.id, code: "BAT-CH4", name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
    const lot = await repositories.lots.create({
      buildingId: building.id, code: "LOT-CH4", species: "Poulet", breed: "Ross", status: "ACTIF",
      initialPopulation: 1000, currentPopulation: 1000, plannedStartAt: null, startedAt: "2026-07-01T00:00:00.000Z", endedAt: null, dataStatus: "SIMULATION",
    });
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "CH4admin");
    const chain = await buildLotTraceabilityChain(lot.id, admin);
    expect(chain.nodes).toHaveLength(1);
    expect(chain.nodes[0].type).toBe("LOT");
  });

  it("denies a caller outside the lot's scope", async () => {
    const seeded = await seedFullChain("CH5");
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "some-other-farm-id", "CH5fm");
    await expect(buildLotTraceabilityChain(seeded.lot.id, outsider)).rejects.toThrow(AuthorizationError);
  });
});
