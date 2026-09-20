import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { describeProvenance } from "./provenance-service";

describe("describeProvenance", () => {
  it("resolves actor name, lot code, and building code from ids", async () => {
    const org = await repositories.organizations.create({ name: "Org PS1", type: "COOPERATIVE" });
    const coop = await repositories.cooperatives.create({ organizationId: org.id, name: "Coop PS1", region: "R" });
    const producer = await repositories.producers.create({ cooperativeId: coop.id, name: "Producer PS1", contactPhone: null, contactEmail: null });
    const farm = await repositories.farms.create({ producerId: producer.id, name: "Farm PS1", city: "City", region: "R", geoLat: null, geoLng: null });
    const building = await repositories.buildings.create({ farmId: farm.id, code: "BAT-PS1", name: "Building", capacity: 1000, zoneType: "ELEVAGE" });
    const lot = await repositories.lots.create({
      buildingId: building.id,
      code: "LOT-PS1",
      species: "Poulet",
      breed: "Ross",
      status: "PLANIFIE",
      initialPopulation: 100,
      currentPopulation: 100,
      plannedStartAt: null,
      startedAt: null,
      endedAt: null,
      dataStatus: "TEST",
    });
    const user = await repositories.users.create({
      email: "provenance-test@test.local",
      passwordHash: "x",
      fullName: "Farm Manager Test",
      role: "FARM_MANAGER",
      scopeType: "FARM",
      scopeId: farm.id,
      active: true,
    });

    const summary = await describeProvenance(
      {
        sourceType: "MANUEL",
        sourceId: null,
        actorId: user.id,
        dataStatus: "SIMULATION",
        measurementMethod: "Pesée manuelle",
        deviceId: null,
        documentId: null,
        validationStatus: null,
      },
      { occurredAt: "2026-08-16T08:30:00.000Z", lotId: lot.id, buildingId: building.id }
    );

    expect(summary.actorName).toBe("Farm Manager Test");
    expect(summary.lotCode).toBe("LOT-PS1");
    expect(summary.buildingCode).toBe("BAT-PS1");
    expect(summary.status).toBe("SIMULATION");
    expect(summary.source).toBe("MANUEL");
    expect(summary.measurementMethod).toBe("Pesée manuelle");
  });

  it("returns nulls for absent actor/lot/building without throwing", async () => {
    const summary = await describeProvenance(
      {
        sourceType: "SIMULATEUR",
        sourceId: null,
        actorId: null,
        dataStatus: "SIMULATION",
        measurementMethod: null,
        deviceId: null,
        documentId: null,
        validationStatus: null,
      },
      { occurredAt: "2026-08-16T08:30:00.000Z" }
    );
    expect(summary.actorName).toBeNull();
    expect(summary.lotCode).toBeNull();
    expect(summary.buildingCode).toBeNull();
  });
});
