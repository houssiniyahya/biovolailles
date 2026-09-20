import { describe, expect, it } from "vitest";
import {
  checkDeviceOnline,
  checkMeasurementQuality,
  checkMeasurementUnitMatchesSensor,
  checkMissingReading,
  checkStaleReading,
} from "./iot-data-quality";

const baseRecord = {
  sensorId: "sensor-1",
  deviceId: "device-1",
  buildingId: "building-1",
  lotId: null,
  value: 27.4,
  unit: "C",
  capturedAt: "2026-08-16T08:00:00.000Z",
  sourceType: "SIMULATEUR" as const,
  sourceId: null,
  actorId: null,
  dataStatus: "SIMULATION" as const,
  measurementMethod: null,
  documentId: null,
  validationStatus: null,
};

describe("checkMeasurementQuality", () => {
  it("accepts a well-formed simulated measurement", () => {
    expect(checkMeasurementQuality(baseRecord).ok).toBe(true);
  });

  it("rejects a non-finite value (invalid reading)", () => {
    const result = checkMeasurementQuality({ ...baseRecord, value: Number.NaN });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_VALUE")).toBe(true);
  });

  it("rejects a future capturedAt", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(checkMeasurementQuality({ ...baseRecord, capturedAt: future }).ok).toBe(false);
  });

  it("flags a building mismatch against the lot's own building", () => {
    const result = checkMeasurementQuality(baseRecord, "some-other-building");
    expect(result.issues.some((i) => i.code === "INVALID_LOT_BUILDING_RELATIONSHIP")).toBe(true);
  });

  it("warns (not errors) when REEL data has no provenance pointer", () => {
    const result = checkMeasurementQuality({ ...baseRecord, dataStatus: "REEL", measurementMethod: null, sourceId: null, documentId: null });
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.code === "MISSING_PROVENANCE")).toBe(true);
  });
});

describe("checkMeasurementUnitMatchesSensor", () => {
  it("passes a matching unit", () => {
    expect(checkMeasurementUnitMatchesSensor("C", "C")).toBeNull();
  });

  it("rejects a measurement unit that doesn't match the sensor's configured unit", () => {
    const issue = checkMeasurementUnitMatchesSensor("F", "C");
    expect(issue?.code).toBe("INVALID_UNIT");
    expect(issue?.severity).toBe("error");
  });
});

describe("checkStaleReading", () => {
  it("passes a recent reading", () => {
    const now = new Date("2026-08-16T09:00:00.000Z");
    expect(checkStaleReading("2026-08-16T08:50:00.000Z", now, 60)).toBeNull();
  });

  it("flags a reading older than the freshness threshold", () => {
    const now = new Date("2026-08-16T10:30:00.000Z");
    const issue = checkStaleReading("2026-08-16T08:00:00.000Z", now, 60);
    expect(issue?.code).toBe("STALE_READING");
    expect(issue?.severity).toBe("warning");
  });
});

describe("checkDeviceOnline", () => {
  it("passes ONLINE", () => {
    expect(checkDeviceOnline("ONLINE")).toBeNull();
  });

  it("warns for OFFLINE", () => {
    const issue = checkDeviceOnline("OFFLINE");
    expect(issue?.code).toBe("DEVICE_OFFLINE");
    expect(issue?.severity).toBe("warning");
  });

  it("errors for FAULT", () => {
    const issue = checkDeviceOnline("FAULT");
    expect(issue?.code).toBe("DEVICE_FAULT");
    expect(issue?.severity).toBe("error");
  });
});

describe("checkMissingReading", () => {
  it("warns when there is no measurement at all", () => {
    expect(checkMissingReading(false)?.code).toBe("MISSING_READING");
  });

  it("passes when at least one measurement exists", () => {
    expect(checkMissingReading(true)).toBeNull();
  });
});
