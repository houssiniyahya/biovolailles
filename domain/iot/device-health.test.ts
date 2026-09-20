import { describe, expect, it } from "vitest";
import { summarizeDeviceHealth } from "./device-health";
import type { Device } from "./types";

function device(overrides: Partial<Device>): Device {
  return {
    id: "d1",
    buildingId: "b1",
    code: "DEV-1",
    type: "CAPTEUR_MULTI",
    status: "ONLINE",
    installedAt: "2026-01-01T00:00:00.000Z",
    lastCommunicationAt: null,
    batteryLevel: null,
    signalQuality: null,
    ...overrides,
  };
}

describe("summarizeDeviceHealth", () => {
  it("tallies devices by status", () => {
    const devices = [
      device({ id: "1", status: "ONLINE" }),
      device({ id: "2", status: "ONLINE" }),
      device({ id: "3", status: "OFFLINE" }),
      device({ id: "4", status: "FAULT" }),
    ];
    expect(summarizeDeviceHealth(devices)).toEqual({ total: 4, online: 2, offline: 1, fault: 1 });
  });

  it("handles an empty list", () => {
    expect(summarizeDeviceHealth([])).toEqual({ total: 0, online: 0, offline: 0, fault: 0 });
  });
});
