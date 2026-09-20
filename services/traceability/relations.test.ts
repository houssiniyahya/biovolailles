import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { NotFoundError, ValidationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { createRelation } from "./relations";

async function seedLot(suffix: string) {
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
    currentPopulation: 1000,
    plannedStartAt: null,
    startedAt: "2026-07-01T00:00:00.000Z",
    endedAt: null,
    dataStatus: "SIMULATION",
  });
  return lot;
}

const PROVENANCE = { sourceType: "MANUEL" as const, sourceId: null, actorId: null, measurementMethod: null, deviceId: null, documentId: null, validationStatus: null };

async function seedCollection(lotId: string, suffix: string) {
  return repositories.collections.create({
    code: `COL-${suffix}`,
    lotId,
    quantity: 100,
    unit: "KG",
    destinationId: null,
    collectedAt: "2026-08-01T00:00:00.000Z",
    ...PROVENANCE,
    dataStatus: "SIMULATION",
  });
}

describe("createRelation", () => {
  it("creates a valid, allowed relation", async () => {
    const lot = await seedLot("REL1");
    const collection = await seedCollection(lot.id, "REL1");
    const relation = await createRelation({ fromType: "COLLECTION", fromId: collection.id, relationType: "COLLECTE_DE", toType: "LOT", toId: lot.id });
    expect(relation.fromId).toBe(collection.id);
    expect(relation.toId).toBe(lot.id);
  });

  it("rejects a relation type not allowed between the given entity types", async () => {
    const lot = await seedLot("REL2");
    const collection = await seedCollection(lot.id, "REL2");
    await expect(
      createRelation({ fromType: "COLLECTION", fromId: collection.id, relationType: "DESTINE_A", toType: "LOT", toId: lot.id })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a relation whose source entity doesn't exist", async () => {
    const lot = await seedLot("REL3");
    await expect(
      createRelation({ fromType: "COLLECTION", fromId: "no-such-collection", relationType: "COLLECTE_DE", toType: "LOT", toId: lot.id })
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a relation whose target entity doesn't exist", async () => {
    const lot = await seedLot("REL4");
    const collection = await seedCollection(lot.id, "REL4");
    await expect(
      createRelation({ fromType: "COLLECTION", fromId: collection.id, relationType: "COLLECTE_DE", toType: "LOT", toId: "no-such-lot" })
    ).rejects.toThrow(NotFoundError);
  });

  it("handles a duplicate relation idempotently — returns the existing edge instead of creating a second one", async () => {
    const lot = await seedLot("REL5");
    const collection = await seedCollection(lot.id, "REL5");
    const first = await createRelation({ fromType: "COLLECTION", fromId: collection.id, relationType: "COLLECTE_DE", toType: "LOT", toId: lot.id });
    const second = await createRelation({ fromType: "COLLECTION", fromId: collection.id, relationType: "COLLECTE_DE", toType: "LOT", toId: lot.id });
    expect(second.id).toBe(first.id);

    const all = await repositories.relations.listFrom("COLLECTION", collection.id);
    expect(all).toHaveLength(1);
  });

  it("records an audit entry (entityType 'relation') attributed to the given actor, but only once per edge", async () => {
    const lot = await seedLot("REL6");
    const collection = await seedCollection(lot.id, "REL6");
    const actor = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "REL6");

    const relation = await createRelation({
      fromType: "COLLECTION",
      fromId: collection.id,
      relationType: "COLLECTE_DE",
      toType: "LOT",
      toId: lot.id,
      actorId: actor.userId,
    });

    const audit = await repositories.auditLog.listByEntity("relation", relation.id);
    expect(audit).toHaveLength(1);
    expect(audit[0].actorId).toBe(actor.userId);
    expect(audit[0].relatedLotId).toBe(lot.id);

    // De-duplicated call must not write a second audit entry for the same edge.
    await createRelation({
      fromType: "COLLECTION",
      fromId: collection.id,
      relationType: "COLLECTE_DE",
      toType: "LOT",
      toId: lot.id,
      actorId: actor.userId,
    });
    const auditAfter = await repositories.auditLog.listByEntity("relation", relation.id);
    expect(auditAfter).toHaveLength(1);
  });
});
