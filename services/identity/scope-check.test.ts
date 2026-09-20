import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import {
  isWithinScope,
  resolveBuildingHierarchy,
  resolveCooperativeHierarchy,
  resolveFarmHierarchy,
  resolveLotHierarchy,
  resolveProducerHierarchy,
} from "./scope-check";

async function seedOneChain(suffix: string) {
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
    capacity: 1000,
    zoneType: "ELEVAGE",
  });
  const lot = await repositories.lots.create({
    buildingId: building.id,
    code: `LOT-${suffix}`,
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
  return { org, coop, producer, farm, building, lot };
}

describe("hierarchy resolution", () => {
  it("resolves the full ancestor chain for a lot", async () => {
    const chain = await seedOneChain("A");
    const path = await resolveLotHierarchy(chain.lot.id);
    expect(path).toEqual({
      organizationId: chain.org.id,
      cooperativeId: chain.coop.id,
      producerId: chain.producer.id,
      farmId: chain.farm.id,
      buildingId: chain.building.id,
    });
  });

  it("resolves the ancestor chain at every intermediate level", async () => {
    const chain = await seedOneChain("B");
    expect((await resolveCooperativeHierarchy(chain.coop.id)).organizationId).toBe(chain.org.id);
    expect((await resolveProducerHierarchy(chain.producer.id)).cooperativeId).toBe(chain.coop.id);
    expect((await resolveFarmHierarchy(chain.farm.id)).producerId).toBe(chain.producer.id);
    expect((await resolveBuildingHierarchy(chain.building.id)).farmId).toBe(chain.farm.id);
  });

  it("throws for an id that doesn't exist", async () => {
    await expect(resolveLotHierarchy("does-not-exist")).rejects.toThrow();
  });
});

describe("isWithinScope", () => {
  it("GLOBAL scope sees everything", () => {
    expect(isWithinScope({ scopeType: "GLOBAL", scopeId: null }, { farmId: "any-farm" })).toBe(true);
  });

  it("FARM scope only matches its own farm", async () => {
    const chain = await seedOneChain("C");
    const otherChain = await seedOneChain("D");
    const path = await resolveLotHierarchy(chain.lot.id);
    const scope = { scopeType: "FARM" as const, scopeId: chain.farm.id };

    expect(isWithinScope(scope, path)).toBe(true);

    const otherPath = await resolveLotHierarchy(otherChain.lot.id);
    expect(isWithinScope(scope, otherPath)).toBe(false);
  });

  it("COOPERATIVE scope covers every producer/farm/building underneath it, but not siblings", async () => {
    const chain = await seedOneChain("E");
    const sibling = await repositories.producers.create({
      cooperativeId: chain.coop.id,
      name: "Sibling producer",
      contactPhone: null,
      contactEmail: null,
    });
    const outsider = await seedOneChain("F");

    const scope = { scopeType: "COOPERATIVE" as const, scopeId: chain.coop.id };
    expect(isWithinScope(scope, { cooperativeId: chain.coop.id })).toBe(true);
    expect(isWithinScope(scope, { cooperativeId: chain.coop.id, producerId: sibling.id })).toBe(true);
    expect(isWithinScope(scope, await resolveLotHierarchy(outsider.lot.id))).toBe(false);
  });
});
