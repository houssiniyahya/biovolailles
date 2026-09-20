import { describe, expect, it } from "vitest";
import { repositories } from "./index";

/**
 * Integration test: runs against a real (temp, migrated) SQLite file — see vitest.setup.ts.
 * Exercises database initialization from an empty state plus the core repository pattern
 * across the full identity hierarchy, which is the phase-1 foundation this test protects.
 */
describe("repositories (sqlite integration)", () => {
  it("creates and reads back an organization", async () => {
    const org = await repositories.organizations.create({ name: "Test Org", type: "COOPERATIVE" });
    expect(org.id).toBeTruthy();
    expect(org.createdAt).toBeTruthy();

    const found = await repositories.organizations.findById(org.id);
    expect(found?.name).toBe("Test Org");
  });

  it("walks the full identity hierarchy and enforces foreign keys", async () => {
    const org = await repositories.organizations.create({ name: "Hierarchy Org", type: "COOPERATIVE" });
    const coop = await repositories.cooperatives.create({
      organizationId: org.id,
      name: "Hierarchy Coop",
      region: "Test Region",
    });
    const producer = await repositories.producers.create({
      cooperativeId: coop.id,
      name: "Hierarchy Producer",
      contactPhone: null,
      contactEmail: null,
    });
    const farm = await repositories.farms.create({
      producerId: producer.id,
      name: "Hierarchy Farm",
      city: "Test City",
      region: "Test Region",
      geoLat: null,
      geoLng: null,
    });
    const building = await repositories.buildings.create({
      farmId: farm.id,
      code: "BAT-TEST",
      name: "Test Building",
      capacity: 1000,
      zoneType: "ELEVAGE",
    });

    expect((await repositories.cooperatives.listByOrganization(org.id)).map((c) => c.id)).toContain(coop.id);
    expect((await repositories.producers.listByCooperative(coop.id)).map((p) => p.id)).toContain(producer.id);
    expect((await repositories.farms.listByProducer(producer.id)).map((f) => f.id)).toContain(farm.id);
    expect((await repositories.buildings.listByFarm(farm.id)).map((b) => b.id)).toContain(building.id);
  });

  it("scopeCondition-backed list() restricts results to the caller's own scope", async () => {
    const org = await repositories.organizations.create({ name: "Scope Org", type: "COOPERATIVE" });
    const coopA = await repositories.cooperatives.create({ organizationId: org.id, name: "Coop A", region: "R" });
    const otherOrg = await repositories.organizations.create({ name: "Other Org", type: "COOPERATIVE" });
    await repositories.cooperatives.create({ organizationId: otherOrg.id, name: "Coop B", region: "R" });

    const scoped = await repositories.cooperatives.list({ scopeType: "ORGANIZATION", scopeId: org.id });
    expect(scoped.map((c) => c.id)).toEqual([coopA.id]);

    const global = await repositories.cooperatives.list({ scopeType: "GLOBAL", scopeId: null });
    expect(global.length).toBeGreaterThanOrEqual(2);
  });

  it("creates a lot and transitions its status through the repository", async () => {
    const org = await repositories.organizations.create({ name: "Lot Org", type: "COOPERATIVE" });
    const coop = await repositories.cooperatives.create({ organizationId: org.id, name: "Lot Coop", region: "R" });
    const producer = await repositories.producers.create({
      cooperativeId: coop.id,
      name: "Lot Producer",
      contactPhone: null,
      contactEmail: null,
    });
    const farm = await repositories.farms.create({
      producerId: producer.id,
      name: "Lot Farm",
      city: "City",
      region: "R",
      geoLat: null,
      geoLng: null,
    });
    const building = await repositories.buildings.create({
      farmId: farm.id,
      code: "BAT-LOT",
      name: "Building",
      capacity: 5000,
      zoneType: "ELEVAGE",
    });

    const lot = await repositories.lots.create({
      buildingId: building.id,
      code: "LOT-TEST-001",
      species: "Poulet de chair",
      breed: "Ross 308",
      status: "PLANIFIE",
      initialPopulation: 5000,
      currentPopulation: 5000,
      plannedStartAt: null,
      startedAt: null,
      endedAt: null,
      dataStatus: "TEST",
    });

    const updated = await repositories.lots.updateStatus(lot.id, "CREE");
    expect(updated.status).toBe("CREE");
  });

  it("listRecentByLots returns the most recent events across several lots in one call, capped at the limit", async () => {
    const org = await repositories.organizations.create({ name: "Events Org", type: "COOPERATIVE" });
    const coop = await repositories.cooperatives.create({ organizationId: org.id, name: "Events Coop", region: "R" });
    const producer = await repositories.producers.create({ cooperativeId: coop.id, name: "Events Producer", contactPhone: null, contactEmail: null });
    const farm = await repositories.farms.create({ producerId: producer.id, name: "Events Farm", city: "City", region: "R", geoLat: null, geoLng: null });
    const building = await repositories.buildings.create({ farmId: farm.id, code: "BAT-EV", name: "Building", capacity: 5000, zoneType: "ELEVAGE" });

    const lotA = await repositories.lots.create({
      buildingId: building.id,
      code: "LOT-EV-A",
      species: "Poulet",
      breed: "Ross",
      status: "ACTIF",
      initialPopulation: 1000,
      currentPopulation: 1000,
      plannedStartAt: null,
      startedAt: null,
      endedAt: null,
      dataStatus: "TEST",
    });
    const lotB = await repositories.lots.create({
      buildingId: building.id,
      code: "LOT-EV-B",
      species: "Poulet",
      breed: "Ross",
      status: "ACTIF",
      initialPopulation: 1000,
      currentPopulation: 1000,
      plannedStartAt: null,
      startedAt: null,
      endedAt: null,
      dataStatus: "TEST",
    });

    const baseEvent = {
      eventType: "AUTRE" as const,
      payload: { description: "test" },
      actorId: null,
      dataStatus: "TEST" as const,
      sourceType: null,
      sourceId: null,
      deviceId: null,
      measurementMethod: null,
      validationStatus: null,
    };
    await repositories.lotEvents.create({ ...baseEvent, lotId: lotA.id, occurredAt: "2026-08-01T00:00:00.000Z" });
    await repositories.lotEvents.create({ ...baseEvent, lotId: lotB.id, occurredAt: "2026-08-03T00:00:00.000Z" });
    const mostRecent = await repositories.lotEvents.create({ ...baseEvent, lotId: lotA.id, occurredAt: "2026-08-05T00:00:00.000Z" });

    const result = await repositories.lotEvents.listRecentByLots([lotA.id, lotB.id], 2);
    expect(result.map((e) => e.id)).toEqual([mostRecent.id, expect.any(String)]);
    expect(result).toHaveLength(2);
    expect(result[0].occurredAt >= result[1].occurredAt).toBe(true);

    expect(await repositories.lotEvents.listRecentByLots([], 10)).toEqual([]);
  });

  it("records an audit log entry", async () => {
    const entry = await repositories.auditLog.record({
      actorId: null,
      entityType: "test",
      entityId: "test-1",
      field: null,
      oldValue: null,
      newValue: null,
      reason: "integration test",
      relatedLotId: null,
      relatedEventId: null,
    });
    expect(entry.id).toBeTruthy();

    const list = await repositories.auditLog.list();
    expect(list.some((e) => e.id === entry.id)).toBe(true);
  });
});
