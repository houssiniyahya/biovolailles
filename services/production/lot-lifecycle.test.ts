import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, ConflictError } from "../../domain/shared/errors";
import { createLot } from "./lot";
import { transitionLotStatus } from "./lot-lifecycle";
import { createTestSession } from "./test-support";

async function seedLotForTransitions(suffix: string) {
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
      initialPopulation: 1000,
      dataStatus: "SIMULATION",
    },
    admin
  );
  return { lot, admin, farm };
}

describe("transitionLotStatus", () => {
  it("accepts a valid transition (PLANIFIE -> CREE) and records it", async () => {
    const { lot, admin } = await seedLotForTransitions("P");
    const updated = await transitionLotStatus(lot.id, "CREE", admin);
    expect(updated.status).toBe("CREE");
  });

  it("rejects an invalid transition (PLANIFIE -> ACTIF, skipping CREE)", async () => {
    const { lot, admin } = await seedLotForTransitions("Q");
    await expect(transitionLotStatus(lot.id, "ACTIF", admin)).rejects.toThrow(ConflictError);
  });

  it("sets startedAt when transitioning into ACTIF", async () => {
    const { lot, admin } = await seedLotForTransitions("R");
    await transitionLotStatus(lot.id, "CREE", admin);
    const active = await transitionLotStatus(lot.id, "ACTIF", admin);
    expect(active.startedAt).toBeTruthy();
  });

  it("denies a status change from a role without EDIT rights on LOTS", async () => {
    const { lot } = await seedLotForTransitions("S");
    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "S2");
    await expect(transitionLotStatus(lot.id, "CREE", auditor)).rejects.toThrow(AuthorizationError);
  });

  it("denies a status change from outside the lot's scope", async () => {
    const { lot } = await seedLotForTransitions("T");
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "unrelated-farm", "T2");
    await expect(transitionLotStatus(lot.id, "CREE", outsider)).rejects.toThrow(AuthorizationError);
  });

  it("writes an audit entry on a successful transition", async () => {
    const { lot, admin } = await seedLotForTransitions("U");
    await transitionLotStatus(lot.id, "CREE", admin, "Confirmation de préparation");
    const entries = await repositories.auditLog.listByEntity("lot", lot.id);
    expect(entries.some((e) => e.field === "status" && e.newValue === "CREE")).toBe(true);
  });
});
