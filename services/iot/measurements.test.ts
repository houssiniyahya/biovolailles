import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, NotFoundError, ValidationError } from "../../domain/shared/errors";
import { createLot } from "../production/lot";
import { createTestSession } from "../production/test-support";
import { recordMeasurement } from "./measurements";

async function seedBuildingWithDevice(suffix: string) {
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
    lastCommunicationAt: "2026-08-16T00:00:00.000Z",
    batteryLevel: 90,
    signalQuality: 95,
  });
  const sensor = await repositories.sensors.create({
    deviceId: device.id,
    sensorType: "TEMPERATURE",
    unit: "C",
    status: "ONLINE",
    configuration: null,
  });

  const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, suffix);
  const lot = await createLot(
    { code: `LOT-${suffix}`, buildingId: building.id, species: "Poulet", breed: "Ross", initialPopulation: 1000, dataStatus: "SIMULATION" },
    admin
  );

  return { building, device, sensor, admin, farm, lot };
}

describe("device creation and sensor/device relationship", () => {
  it("creates a device and a sensor belonging to it", async () => {
    const { device, sensor } = await seedBuildingWithDevice("IOT1");
    expect(device.status).toBe("ONLINE");

    const found = await repositories.sensors.findById(sensor.id);
    expect(found?.deviceId).toBe(device.id);

    const listed = await repositories.sensors.listByDevice(device.id);
    expect(listed.map((s) => s.id)).toContain(sensor.id);
  });

  it("rejects a duplicate device business code", async () => {
    const { building } = await seedBuildingWithDevice("IOT2");
    await repositories.devices.create({
      buildingId: building.id,
      code: "DEV-DUP",
      type: "CAPTEUR_MULTI",
      status: "ONLINE",
      installedAt: "2026-07-01T00:00:00.000Z",
      lastCommunicationAt: null,
      batteryLevel: null,
      signalQuality: null,
    });
    await expect(
      repositories.devices.create({
        buildingId: building.id,
        code: "DEV-DUP",
        type: "CAPTEUR_MULTI",
        status: "ONLINE",
        installedAt: "2026-07-01T00:00:00.000Z",
        lastCommunicationAt: null,
        batteryLevel: null,
        signalQuality: null,
      })
    ).rejects.toThrow();
  });
});

describe("recordMeasurement", () => {
  it("records a measurement with full provenance and links it to the building", async () => {
    const { sensor, admin, building } = await seedBuildingWithDevice("IOT3");
    const { record, quality } = await recordMeasurement(
      { sensorId: sensor.id, value: 27.4, capturedAt: "2026-08-16T08:42:12.000Z", sourceType: "MANUEL", dataStatus: "SIMULATION" },
      admin
    );
    expect(quality.ok).toBe(true);
    expect(record.buildingId).toBe(building.id);
    expect(record.unit).toBe(sensor.unit);
    expect(record.actorId).toBe(admin.userId);
  });

  it("links a measurement to a lot in the same building", async () => {
    const { sensor, admin, lot } = await seedBuildingWithDevice("IOT4");
    const { record } = await recordMeasurement(
      { sensorId: sensor.id, value: 28, capturedAt: "2026-08-16T08:00:00.000Z", lotId: lot.id, sourceType: "MANUEL", dataStatus: "SIMULATION" },
      admin
    );
    expect(record.lotId).toBe(lot.id);
  });

  it("rejects a lot that doesn't belong to the sensor's building", async () => {
    const { sensor, admin } = await seedBuildingWithDevice("IOT5");
    const { lot: otherLot } = await seedBuildingWithDevice("IOT5b");
    await expect(
      recordMeasurement(
        { sensorId: sensor.id, value: 28, capturedAt: "2026-08-16T08:00:00.000Z", lotId: otherLot.id, sourceType: "MANUEL", dataStatus: "SIMULATION" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an unknown sensor id", async () => {
    const { admin } = await seedBuildingWithDevice("IOT6");
    await expect(
      recordMeasurement(
        { sensorId: "no-such-sensor", value: 28, capturedAt: "2026-08-16T08:00:00.000Z", sourceType: "MANUEL", dataStatus: "SIMULATION" },
        admin
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an invalid (non-finite) value", async () => {
    const { sensor, admin } = await seedBuildingWithDevice("IOT7");
    await expect(
      recordMeasurement(
        { sensorId: sensor.id, value: Number.NaN, capturedAt: "2026-08-16T08:00:00.000Z", sourceType: "MANUEL", dataStatus: "SIMULATION" },
        admin
      )
    ).rejects.toThrow(ValidationError);
  });

  it("denies recording outside the caller's scope", async () => {
    const { sensor } = await seedBuildingWithDevice("IOT8");
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "unrelated-farm", "IOT8b");
    await expect(
      recordMeasurement(
        { sensorId: sensor.id, value: 28, capturedAt: "2026-08-16T08:00:00.000Z", sourceType: "MANUEL", dataStatus: "SIMULATION" },
        outsider
      )
    ).rejects.toThrow(AuthorizationError);
  });

  it("denies recording for a role without EDIT rights on IOT (AUDITOR is read-only)", async () => {
    const { sensor } = await seedBuildingWithDevice("IOT9");
    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "IOT9b");
    await expect(
      recordMeasurement(
        { sensorId: sensor.id, value: 28, capturedAt: "2026-08-16T08:00:00.000Z", sourceType: "MANUEL", dataStatus: "SIMULATION" },
        auditor
      )
    ).rejects.toThrow(AuthorizationError);
  });

  it("a FARM_MANAGER scoped to the exact farm can record a measurement", async () => {
    const { sensor, farm } = await seedBuildingWithDevice("IOT10");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "IOT10b");
    const { record } = await recordMeasurement(
      { sensorId: sensor.id, value: 26.5, capturedAt: "2026-08-16T08:00:00.000Z", sourceType: "MANUEL", dataStatus: "SIMULATION" },
      farmManager
    );
    expect(record.value).toBe(26.5);
  });
});
