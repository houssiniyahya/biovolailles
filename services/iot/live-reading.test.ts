import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { createLot } from "../production/lot";
import { createTestSession } from "../production/test-support";
import { computeLiveReading } from "./live-reading";

describe("computeLiveReading", () => {
  it("returns null for an unknown sensor rather than throwing", async () => {
    expect(await computeLiveReading("no-such-sensor")).toBeNull();
  });

  it("computes a reading without writing anything to the database", async () => {
    const org = await repositories.organizations.create({ name: "Org LR1", type: "COOPERATIVE" });
    const coop = await repositories.cooperatives.create({ organizationId: org.id, name: "Coop LR1", region: "R" });
    const producer = await repositories.producers.create({ cooperativeId: coop.id, name: "Producer LR1", contactPhone: null, contactEmail: null });
    const farm = await repositories.farms.create({ producerId: producer.id, name: "Farm LR1", city: "City", region: "R", geoLat: null, geoLng: null });
    const building = await repositories.buildings.create({ farmId: farm.id, code: "BAT-LR1", name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
    const device = await repositories.devices.create({
      buildingId: building.id,
      code: "DEV-LR1",
      type: "CAPTEUR_MULTI",
      status: "ONLINE",
      installedAt: "2026-07-01T00:00:00.000Z",
      lastCommunicationAt: null,
      batteryLevel: null,
      signalQuality: null,
    });
    const sensor = await repositories.sensors.create({ deviceId: device.id, sensorType: "TEMPERATURE", unit: "C", status: "ONLINE", configuration: null });

    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "LR1");
    await createLot(
      { code: "LOT-LR1", buildingId: building.id, species: "Poulet", breed: "Ross", initialPopulation: 1000, dataStatus: "SIMULATION" },
      admin
    );

    const before = await repositories.measurements.listBySensor(sensor.id);
    const reading = await computeLiveReading(sensor.id, new Date("2026-08-16T10:00:00.000Z"));
    const after = await repositories.measurements.listBySensor(sensor.id);

    expect(reading).not.toBeNull();
    expect(reading?.unit).toBe("C");
    expect(reading?.dataStatus).toBe("SIMULATION");
    expect(after.length).toBe(before.length); // no row was persisted
  });
});
