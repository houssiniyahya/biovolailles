import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from "../../domain/shared/errors";
import { createLot, updateLot } from "./lot";
import { createTestSession } from "./test-support";

async function seedBuilding(suffix: string) {
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
  return { org, coop, producer, farm, building };
}

const validInput = (buildingId: string, code: string) => ({
  code,
  buildingId,
  species: "Poulet de chair",
  breed: "Ross 308",
  initialPopulation: 5000,
  plannedStartAt: "2026-09-01",
  dataStatus: "SIMULATION" as const,
});

describe("createLot", () => {
  it("creates a lot with status PLANIFIE and a CREATION_LOT event", async () => {
    const { building } = await seedBuilding("G");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "G");
    const lot = await createLot(validInput(building.id, "LOT-G-001"), admin);

    expect(lot.status).toBe("PLANIFIE");
    expect(lot.currentPopulation).toBe(lot.initialPopulation);

    const events = await repositories.lotEvents.listByLot(lot.id);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("CREATION_LOT");
  });

  it("rejects a duplicate business id (lot code)", async () => {
    const { building } = await seedBuilding("H");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "H");
    await createLot(validInput(building.id, "LOT-H-DUP"), admin);

    await expect(createLot(validInput(building.id, "LOT-H-DUP"), admin)).rejects.toThrow(ConflictError);
  });

  it("rejects a non-positive initial population", async () => {
    const { building } = await seedBuilding("I");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "I");
    await expect(
      createLot({ ...validInput(building.id, "LOT-I-001"), initialPopulation: 0 }, admin)
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an unknown building", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "J");
    await expect(createLot(validInput("no-such-building", "LOT-J-001"), admin)).rejects.toThrow(NotFoundError);
  });

  it("rejects creation when the caller's scope doesn't cover the building's farm", async () => {
    const { building } = await seedBuilding("K");
    const otherFarmerSession = await createTestSession("FARM_MANAGER", "FARM", "some-other-farm-id", "K");

    await expect(createLot(validInput(building.id, "LOT-K-001"), otherFarmerSession)).rejects.toThrow(
      AuthorizationError
    );
  });

  it("rejects creation for a role without CREATE rights on LOTS (AUDITOR is read-only)", async () => {
    const { building } = await seedBuilding("L");
    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "L");

    await expect(createLot(validInput(building.id, "LOT-L-001"), auditor)).rejects.toThrow(AuthorizationError);
  });

  it("a FARM_MANAGER scoped to the exact farm can create a lot in one of its buildings", async () => {
    const { building, farm } = await seedBuilding("M");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "M");

    const lot = await createLot(validInput(building.id, "LOT-M-001"), farmManager);
    expect(lot.code).toBe("LOT-M-001");
  });
});

describe("updateLot", () => {
  it("updates mutable fields and leaves population/status untouched", async () => {
    const { building } = await seedBuilding("N");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "N");
    const lot = await createLot(validInput(building.id, "LOT-N-001"), admin);

    const updated = await updateLot(lot.id, { species: "Dinde", breed: "BUT 6" }, admin);
    expect(updated.species).toBe("Dinde");
    expect(updated.breed).toBe("BUT 6");
    expect(updated.currentPopulation).toBe(lot.currentPopulation);
    expect(updated.status).toBe(lot.status);
  });

  it("denies editing a lot outside the caller's scope — unauthorized, not silently ignored", async () => {
    const { building } = await seedBuilding("O");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "O");
    const lot = await createLot(validInput(building.id, "LOT-O-001"), admin);
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "unrelated-farm", "O2");

    await expect(updateLot(lot.id, { species: "Dinde" }, outsider)).rejects.toThrow(AuthorizationError);
  });

  it("returns NotFoundError for a lot id that doesn't exist", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "P");
    await expect(updateLot("no-such-lot", { species: "Dinde" }, admin)).rejects.toThrow(NotFoundError);
  });
});
