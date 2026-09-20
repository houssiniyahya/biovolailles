import { describe, expect, it } from "vitest";
import type { Device, Sensor } from "../../domain/iot/types";
import { DeterministicSensorSimulator } from "./simulator";

const device: Device = {
  id: "device-1",
  buildingId: "building-1",
  code: "DEV-TEST",
  type: "CAPTEUR_MULTI",
  status: "ONLINE",
  installedAt: "2026-07-01T00:00:00.000Z",
  lastCommunicationAt: null,
  batteryLevel: null,
  signalQuality: null,
};

function sensor(sensorType: Sensor["sensorType"], unit: string): Sensor {
  return { id: `sensor-${sensorType}`, deviceId: device.id, sensorType, unit, status: "ONLINE", configuration: null };
}

const simulator = new DeterministicSensorSimulator();

describe("DeterministicSensorSimulator", () => {
  it("produces the exact same values for the same sensor and time range (deterministic, not random)", () => {
    const context = { lotId: "lot-1", lotStartedAt: "2026-07-21T00:00:00.000Z" };
    const range = { from: new Date("2026-08-01T00:00:00.000Z"), to: new Date("2026-08-02T00:00:00.000Z") };
    const first = simulator.generate(sensor("TEMPERATURE", "C"), device, context, range, 360);
    const second = simulator.generate(sensor("TEMPERATURE", "C"), device, context, range, 360);
    expect(first).toEqual(second);
  });

  it("marks every generated reading as SIMULATION / SIMULATEUR", () => {
    const context = { lotId: null, lotStartedAt: null };
    const readings = simulator.generate(sensor("TEMPERATURE", "C"), device, context, {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-01T00:00:00.000Z"),
    }, 60);
    expect(readings[0].dataStatus).toBe("SIMULATION");
    expect(readings[0].sourceType).toBe("SIMULATEUR");
  });

  it("attaches sensor/device/building context to every reading", () => {
    const context = { lotId: "lot-1", lotStartedAt: null };
    const [reading] = simulator.generate(sensor("CO2", "PPM"), device, context, {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-01T00:00:00.000Z"),
    }, 60);
    expect(reading.sensorId).toBe("sensor-CO2");
    expect(reading.deviceId).toBe(device.id);
    expect(reading.buildingId).toBe(device.buildingId);
    expect(reading.lotId).toBe("lot-1");
    expect(reading.unit).toBe("PPM");
  });

  it("temperature shows day/night variation across a 24h span", () => {
    const context = { lotId: null, lotStartedAt: "2026-07-21T00:00:00.000Z" };
    const readings = simulator.generate(sensor("TEMPERATURE", "C"), device, context, {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-01T23:00:00.000Z"),
    }, 180);
    const values = readings.map((r) => r.value);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(1);
  });

  it("weight progresses smoothly with age rather than jumping randomly", () => {
    const context = { lotId: null, lotStartedAt: "2026-07-21T00:00:00.000Z" };
    const readings = simulator.generate(sensor("POIDS", "KG"), device, context, {
      from: new Date("2026-07-21T00:00:00.000Z"),
      to: new Date("2026-08-16T00:00:00.000Z"),
    }, 1440); // daily

    // Overall trend must be upward (bird grows), and no single day-to-day jump should be wild.
    expect(readings.at(-1)!.value).toBeGreaterThan(readings[0].value);
    for (let i = 1; i < readings.length; i++) {
      const delta = Math.abs(readings[i].value - readings[i - 1].value);
      expect(delta).toBeLessThan(0.3); // smooth daily increments, not jumps
    }
  });

  it("applies a gradual ramp (not an instant jump) during an anomaly window", () => {
    const window = { start: new Date("2026-08-01T00:00:00.000Z"), end: new Date("2026-08-04T00:00:00.000Z"), peakOffset: 5 };
    const context = { lotId: null, lotStartedAt: "2026-07-21T00:00:00.000Z", anomalyWindow: window };
    const readings = simulator.generate(sensor("TEMPERATURE", "C"), device, context, {
      from: new Date("2026-07-31T00:00:00.000Z"),
      to: new Date("2026-08-05T00:00:00.000Z"),
    }, 360);

    const byTime = new Map(readings.map((r) => [r.capturedAt, r.value]));
    const beforeWindow = byTime.get("2026-07-31T00:00:00.000Z")!;
    const atMidpoint = byTime.get("2026-08-02T12:00:00.000Z") ?? byTime.get("2026-08-02T18:00:00.000Z")!;
    const afterWindow = byTime.get("2026-08-05T00:00:00.000Z")!;

    // The midpoint of the window must read meaningfully higher than well outside the window on either side.
    expect(atMidpoint - beforeWindow).toBeGreaterThan(1.5);
    expect(atMidpoint - afterWindow).toBeGreaterThan(1.5);
  });

  it("generates a reading for every supported sensor type", () => {
    const types: Sensor["sensorType"][] = ["TEMPERATURE", "HUMIDITE", "CO2", "LUMIERE", "POIDS", "EAU", "ALIMENT"];
    for (const type of types) {
      const readings = simulator.generate(sensor(type, "x"), device, { lotId: null, lotStartedAt: "2026-07-21T00:00:00.000Z" }, {
        from: new Date("2026-08-01T00:00:00.000Z"),
        to: new Date("2026-08-01T00:00:00.000Z"),
      }, 60);
      expect(readings).toHaveLength(1);
    }
  });
});
