import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { listDevicesInScope } from "./queries";

async function seedBuilding(suffix: string) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const device = await repositories.devices.create({
    buildingId: building.id,
    code: `DEV-${suffix}`,
    type: "CAPTEUR_MULTI",
    status: "ONLINE",
    installedAt: "2026-07-01T00:00:00.000Z",
    lastCommunicationAt: null,
    batteryLevel: null,
    signalQuality: null,
  });
  return { building, device, farm };
}

describe("listDevicesInScope", () => {
  it("GLOBAL scope sees every device", async () => {
    await seedBuilding("DQ1");
    await seedBuilding("DQ2");
    const devices = await listDevicesInScope({ scopeType: "GLOBAL", scopeId: null });
    expect(devices.length).toBeGreaterThanOrEqual(2);
  });

  it("FARM scope only sees devices in that farm's buildings — not a sibling farm's devices", async () => {
    const own = await seedBuilding("DQ3");
    const other = await seedBuilding("DQ4");

    const devices = await listDevicesInScope({ scopeType: "FARM", scopeId: own.farm.id });
    const ids = devices.map((d) => d.id);
    expect(ids).toContain(own.device.id);
    expect(ids).not.toContain(other.device.id);
  });
});
