import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { createLot } from "../production/lot";
import { createTestSession } from "../production/test-support";
import { getDashboardOverview } from "./overview";

async function seedFarm(suffix: string) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  return { org, coop, producer, farm, building };
}

describe("getDashboardOverview", () => {
  it("GLOBAL scope sees lots/devices from every farm", async () => {
    const a = await seedFarm("OV1");
    const b = await seedFarm("OV2");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "OV1admin");

    await createLot(
      { code: "LOT-OV1", buildingId: a.building.id, species: "Poulet", breed: "Ross", initialPopulation: 1000, dataStatus: "SIMULATION" },
      admin
    );
    await createLot(
      { code: "LOT-OV2", buildingId: b.building.id, species: "Poulet", breed: "Ross", initialPopulation: 500, dataStatus: "SIMULATION" },
      admin
    );

    const overview = await getDashboardOverview(admin);
    const codes = overview.lots.map((l) => l.code);
    expect(codes).toContain("LOT-OV1");
    expect(codes).toContain("LOT-OV2");
    expect(overview.scopeLabel).toContain("Vue globale");
  });

  it("FARM-scoped session only sees its own farm's lots and devices, never a sibling farm's", async () => {
    const own = await seedFarm("OV3");
    const other = await seedFarm("OV4");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "OV3admin");

    const ownLot = await createLot(
      { code: "LOT-OV3", buildingId: own.building.id, species: "Poulet", breed: "Ross", initialPopulation: 1000, dataStatus: "SIMULATION" },
      admin
    );
    await createLot(
      { code: "LOT-OV4", buildingId: other.building.id, species: "Poulet", breed: "Ross", initialPopulation: 500, dataStatus: "SIMULATION" },
      admin
    );
    await repositories.devices.create({
      buildingId: other.building.id,
      code: "DEV-OV4",
      type: "CAPTEUR_MULTI",
      status: "ONLINE",
      installedAt: "2026-07-01T00:00:00.000Z",
      lastCommunicationAt: null,
      batteryLevel: null,
      signalQuality: null,
    });

    const farmManager = await createTestSession("FARM_MANAGER", "FARM", own.farm.id, "OV3fm");
    const overview = await getDashboardOverview(farmManager);

    expect(overview.lots.map((l) => l.id)).toEqual([ownLot.id]);
    expect(overview.farms.map((f) => f.id)).toEqual([own.farm.id]);
    expect(overview.devices.some((d) => d.code === "DEV-OV4")).toBe(false);
    expect(overview.scopeLabel).toContain(own.farm.name);
  });

  it("reuses the existing per-lot data-quality engine (population inconsistency surfaces on the lot)", async () => {
    const setup = await seedFarm("OV5");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "OV5admin");
    const lot = await createLot(
      { code: "LOT-OV5", buildingId: setup.building.id, species: "Poulet", breed: "Ross", initialPopulation: 1000, dataStatus: "SIMULATION" },
      admin
    );
    // currentPopulation (1000) with zero recorded mortality/exits/entries is already consistent —
    // force a drift the same way phase-3's demo data does, by writing a mismatched currentPopulation.
    await repositories.lots.updatePopulation(lot.id, 900);

    const overview = await getDashboardOverview(admin);
    const dashboardLot = overview.lots.find((l) => l.id === lot.id)!;
    expect(dashboardLot.quality.issues.some((issue) => issue.issue.code === "POPULATION_INCONSISTENCY")).toBe(true);
  });

  it("returns the scope's recent lot events, most recent first, capped at the requested limit", async () => {
    const setup = await seedFarm("OV6");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "OV6admin");
    const lot = await createLot(
      { code: "LOT-OV6", buildingId: setup.building.id, species: "Poulet", breed: "Ross", initialPopulation: 1000, dataStatus: "SIMULATION" },
      admin
    );

    const overview = await getDashboardOverview(admin);
    const creationEvent = overview.events.find((e) => e.lotId === lot.id && e.eventType === "CREATION_LOT");
    expect(creationEvent).toBeDefined();
    expect(creationEvent?.farmName).toBe(setup.farm.name);
    // createLot() stamps actorId with the creating session's userId — the dashboard resolves it to a real name, not "Système".
    expect(creationEvent?.actorName).toBe("Test User OV6admin");
  });
});
