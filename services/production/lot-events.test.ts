import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, ValidationError } from "../../domain/shared/errors";
import { createLotEvent } from "./lot-events";
import { createLot } from "./lot";
import { createTestSession } from "./test-support";

async function seedLot(suffix: string, initialPopulation = 1000) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({
    cooperativeId: coop.id,
    name: `Producer ${suffix}`,
    contactPhone: null,
    contactEmail: null,
  });
  const farm = await repositories.farms.create({
    producerId: producer.id,
    name: `Farm ${suffix}`,
    city: "City",
    region: "R",
    geoLat: null,
    geoLng: null,
  });
  const building = await repositories.buildings.create({
    farmId: farm.id,
    code: `BAT-${suffix}`,
    name: "Building",
    capacity: 5000,
    zoneType: "ELEVAGE",
  });
  const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, suffix);
  const lot = await createLot(
    {
      code: `LOT-${suffix}`,
      buildingId: building.id,
      species: "Poulet de chair",
      breed: "Ross 308",
      initialPopulation,
      dataStatus: "SIMULATION",
    },
    admin
  );
  return { lot, admin };
}

describe("createLotEvent — population integrity", () => {
  it("MORTALITE decreases currentPopulation by the declared quantity", async () => {
    const { lot, admin } = await seedLot("V", 1000);
    const event = await createLotEvent(lot.id, "MORTALITE", { quantity: 30 }, admin);
    expect(event.eventType).toBe("MORTALITE");

    const updated = await repositories.lots.findById(lot.id);
    expect(updated?.currentPopulation).toBe(970);
  });

  it("rejects a MORTALITE quantity greater than the current population — no silent inconsistency", async () => {
    const { lot, admin } = await seedLot("W", 100);
    await expect(createLotEvent(lot.id, "MORTALITE", { quantity: 500 }, admin)).rejects.toThrow(ValidationError);

    const unchanged = await repositories.lots.findById(lot.id);
    expect(unchanged?.currentPopulation).toBe(100);
  });

  it("accumulates population correctly across multiple MORTALITE events", async () => {
    const { lot, admin } = await seedLot("X", 1000);
    await createLotEvent(lot.id, "MORTALITE", { quantity: 20 }, admin);
    await createLotEvent(lot.id, "MORTALITE", { quantity: 15 }, admin);

    const updated = await repositories.lots.findById(lot.id);
    expect(updated?.currentPopulation).toBe(965);

    const events = await repositories.lotEvents.listByLot(lot.id);
    // CREATION_LOT + 2 MORTALITE
    expect(events).toHaveLength(3);
  });

  it("non-population events (PESEE) do not change currentPopulation", async () => {
    const { lot, admin } = await seedLot("Y", 1000);
    await createLotEvent(lot.id, "PESEE", { averageWeightKg: 1.4, sampleSize: 20 }, admin);

    const updated = await repositories.lots.findById(lot.id);
    expect(updated?.currentPopulation).toBe(1000);
  });

  it("rejects a malformed payload for the given event type", async () => {
    const { lot, admin } = await seedLot("Z", 1000);
    await expect(createLotEvent(lot.id, "MORTALITE", { quantity: "not-a-number" }, admin)).rejects.toThrow(
      ValidationError
    );
  });

  it("denies event creation from outside the lot's scope", async () => {
    const { lot } = await seedLot("AA", 1000);
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "unrelated-farm", "AA2");
    await expect(createLotEvent(lot.id, "MORTALITE", { quantity: 5 }, outsider)).rejects.toThrow(AuthorizationError);
  });
});
