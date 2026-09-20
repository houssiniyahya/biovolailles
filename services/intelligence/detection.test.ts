import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { runBuildingDetection, runLotDetection } from "./detection";

const PROVENANCE = { sourceType: "SIMULATEUR" as const, sourceId: null, actorId: null, measurementMethod: null, deviceId: null, documentId: null, validationStatus: null };

async function seedLot(suffix: string, startedAt = "2026-07-01T00:00:00.000Z") {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const lot = await repositories.lots.create({
    buildingId: building.id,
    code: `LOT-${suffix}`,
    species: "Poulet",
    breed: "Ross",
    status: "ACTIF",
    initialPopulation: 1000,
    currentPopulation: 1000,
    plannedStartAt: null,
    startedAt,
    endedAt: null,
    dataStatus: "SIMULATION",
  });
  return { lot, building, farm };
}

describe("runLotDetection — normal scenarios", () => {
  it("raises POPULATION_INCONSISTENCY (and a matching alert) when the recorded population drifts from the reconciled history", async () => {
    const { lot } = await seedLot("DET1");
    await repositories.mortalityRecords.create({ lotId: lot.id, occurredAt: "2026-07-10T00:00:00.000Z", count: 50, suspectedCause: null, causeValidated: false, ...PROVENANCE, dataStatus: "SIMULATION" });
    // currentPopulation stays 1000 while 50 mortality is recorded -> expected 950, recorded 1000 -> inconsistent
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "DET1admin");

    const { created, evaluated } = await runLotDetection(lot.id, admin, new Date("2026-08-16T00:00:00.000Z"));
    expect(evaluated).toContain("POPULATION_INCONSISTENCY");
    const populationAnomaly = created.find((a) => a.observedValue === 1000 && a.referenceValue === 950);
    expect(populationAnomaly).toBeDefined();
    expect(populationAnomaly?.status).toBe("OPEN");

    const alert = await repositories.alerts.findByAnomalyId(populationAnomaly!.id);
    expect(alert?.status).toBe("OPEN");
  });

  it("raises FEED_DEVIATION_ABOVE_REFERENCE and the compound PERFORMANCE_DECLINE anomaly from real feed/weight records (the hero scenario shape)", async () => {
    const { lot } = await seedLot("DET2", "2026-07-01T00:00:00.000Z");
    // Reference (previous 8d window) feed
    await repositories.feedUsage.create({ lotId: lot.id, occurredAt: "2026-08-03T00:00:00.000Z", quantity: 1000, unit: "KG", feedType: "x", feedSource: null, ...PROVENANCE, dataStatus: "SIMULATION" });
    // Current (last 8d window) feed — deliberately elevated
    await repositories.feedUsage.create({ lotId: lot.id, occurredAt: "2026-08-12T00:00:00.000Z", quantity: 1500, unit: "KG", feedType: "x", feedSource: null, ...PROVENANCE, dataStatus: "SIMULATION" });
    // Three weigh-ins: healthy growth, then a slowdown
    await repositories.weightMeasurements.create({ lotId: lot.id, occurredAt: "2026-07-15T00:00:00.000Z", averageWeight: 1.0, unit: "KG", sampleCount: 50, ...PROVENANCE, dataStatus: "SIMULATION" });
    await repositories.weightMeasurements.create({ lotId: lot.id, occurredAt: "2026-08-01T00:00:00.000Z", averageWeight: 1.5, unit: "KG", sampleCount: 50, ...PROVENANCE, dataStatus: "SIMULATION" });
    await repositories.weightMeasurements.create({ lotId: lot.id, occurredAt: "2026-08-12T00:00:00.000Z", averageWeight: 1.6, unit: "KG", sampleCount: 50, ...PROVENANCE, dataStatus: "SIMULATION" });

    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "DET2admin");
    const { created, evaluated } = await runLotDetection(lot.id, admin, new Date("2026-08-16T00:00:00.000Z"));

    expect(evaluated).toEqual(expect.arrayContaining(["FEED_DEVIATION_ABOVE_REFERENCE", "PERFORMANCE_DECLINE"]));
    const feedAnomaly = created.find((a) => a.lotId === lot.id && a.unit === "kg");
    expect(feedAnomaly).toBeDefined();
    expect(feedAnomaly!.deviationPercent!).toBeGreaterThan(15);
    // The feed anomaly is evidenced by a persisted, CALCULE kpi_values row (phase-6 brief §5).
    expect(feedAnomaly!.kpiValueId).not.toBeNull();
    const evidence = await repositories.kpiValues.listByLot(lot.id);
    expect(evidence.some((v) => v.id === feedAnomaly!.kpiValueId)).toBe(true);

    const declineAnomaly = created.find((a) => a.unit === "%");
    expect(declineAnomaly).toBeDefined();
    expect(declineAnomaly!.explanation.whatChanged).toContain("ralentissait");
  });

  it("is idempotent — re-running detection does not duplicate an already-OPEN anomaly", async () => {
    const { lot } = await seedLot("DET3");
    await repositories.mortalityRecords.create({ lotId: lot.id, occurredAt: "2026-07-10T00:00:00.000Z", count: 50, suspectedCause: null, causeValidated: false, ...PROVENANCE, dataStatus: "SIMULATION" });
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "DET3admin");
    const now = new Date("2026-08-16T00:00:00.000Z");

    const first = await runLotDetection(lot.id, admin, now);
    expect(first.created.length).toBeGreaterThan(0);
    const second = await runLotDetection(lot.id, admin, now);
    expect(second.created).toHaveLength(0);

    const all = await repositories.anomalies.listByLot(lot.id);
    expect(all).toHaveLength(first.created.length);
  });
});

describe("runLotDetection — negative scenarios", () => {
  it("fails safe (no anomaly) when there isn't enough feed/weight history yet — never fabricates a deviation", async () => {
    const { lot } = await seedLot("DET4");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "DET4admin");
    const { created } = await runLotDetection(lot.id, admin, new Date("2026-08-16T00:00:00.000Z"));
    expect(created).toHaveLength(0);
  });

  it("denies a role without ANOMALIES:VALIDATE (FARM_MANAGER only has read access)", async () => {
    const { lot, farm } = await seedLot("DET5");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "DET5fm");
    await expect(runLotDetection(lot.id, farmManager, new Date("2026-08-16T00:00:00.000Z"))).rejects.toThrow(AuthorizationError);
  });

  it("denies a TECHNICIAN scoped to a different farm (scope enforcement, not just permission)", async () => {
    const { lot } = await seedLot("DET6");
    const outsider = await createTestSession("TECHNICIAN", "FARM", "some-other-farm-id", "DET6tech");
    await expect(runLotDetection(lot.id, outsider, new Date("2026-08-16T00:00:00.000Z"))).rejects.toThrow(AuthorizationError);
  });

  it("allows a TECHNICIAN scoped to the lot's own farm", async () => {
    const { lot, farm } = await seedLot("DET7");
    const technician = await createTestSession("TECHNICIAN", "FARM", farm.id, "DET7tech");
    await expect(runLotDetection(lot.id, technician, new Date("2026-08-16T00:00:00.000Z"))).resolves.toBeDefined();
  });
});

describe("runBuildingDetection", () => {
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
      signalQuality: 90,
    });
    const sensor = await repositories.sensors.create({ deviceId: device.id, sensorType: "TEMPERATURE", unit: "C", status: "ONLINE", configuration: null });
    return { building, device, sensor, farm };
  }

  it("raises TEMPERATURE_OUT_OF_RANGE from a real out-of-range measurement", async () => {
    const { building, sensor } = await seedBuildingWithDevice("DET8");
    await repositories.measurements.create({
      sensorId: sensor.id, buildingId: building.id, lotId: null, value: 40, unit: "C",
      capturedAt: "2026-08-16T11:50:00.000Z", ...PROVENANCE, dataStatus: "SIMULATION", deviceId: sensor.deviceId,
    });
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "DET8admin");
    const { created, evaluated } = await runBuildingDetection(building.id, admin, new Date("2026-08-16T12:00:00.000Z"));
    expect(evaluated).toContain("TEMPERATURE_OUT_OF_RANGE");
    expect(created.some((a) => a.observedValue === 40)).toBe(true);
  });

  it("raises STALE_SENSOR_DATA for an ONLINE device whose last reading is older than the threshold", async () => {
    const { building, sensor } = await seedBuildingWithDevice("DET9");
    await repositories.measurements.create({
      sensorId: sensor.id, buildingId: building.id, lotId: null, value: 25, unit: "C",
      capturedAt: "2026-08-16T08:00:00.000Z", ...PROVENANCE, dataStatus: "SIMULATION", deviceId: sensor.deviceId,
    });
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "DET9admin");
    const { created } = await runBuildingDetection(building.id, admin, new Date("2026-08-16T12:00:00.000Z"));
    expect(created.some((a) => a.unit === "min")).toBe(true);
  });

  it("does not raise stale-sensor for an OFFLINE device (a different, already-visible failure mode)", async () => {
    const { building, device, sensor } = await seedBuildingWithDevice("DET10");
    await repositories.devices.update(device.id, { status: "OFFLINE" });
    await repositories.measurements.create({
      sensorId: sensor.id, buildingId: building.id, lotId: null, value: 25, unit: "C",
      capturedAt: "2026-08-16T00:00:00.000Z", ...PROVENANCE, dataStatus: "SIMULATION", deviceId: sensor.deviceId,
    });
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "DET10admin");
    const { created } = await runBuildingDetection(building.id, admin, new Date("2026-08-16T12:00:00.000Z"));
    expect(created.some((a) => a.unit === "min")).toBe(false);
  });

  it("denies a FARM_MANAGER scoped to a different farm", async () => {
    const { building } = await seedBuildingWithDevice("DET11");
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "some-other-farm-id", "DET11fm");
    await expect(runBuildingDetection(building.id, outsider, new Date("2026-08-16T12:00:00.000Z"))).rejects.toThrow(AuthorizationError);
  });
});
