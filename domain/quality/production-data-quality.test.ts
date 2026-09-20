import { describe, expect, it } from "vitest";
import {
  checkEnvironmentMeasurementQuality,
  checkFeedUsageQuality,
  checkMortalityRecordQuality,
  checkWaterUsageQuality,
  checkWeightMeasurementQuality,
} from "./production-data-quality";

const provenance = {
  sourceType: "SIMULATEUR" as const,
  sourceId: null,
  actorId: null,
  measurementMethod: null,
  deviceId: null,
  documentId: null,
  validationStatus: null,
};

describe("checkFeedUsageQuality", () => {
  const base = {
    lotId: "lot-1",
    occurredAt: "2026-01-10T00:00:00.000Z",
    quantity: 100,
    unit: "KG",
    feedType: "Croissance",
    feedSource: null,
    dataStatus: "SIMULATION" as const,
    ...provenance,
  };

  it("accepts a well-formed record", () => {
    expect(checkFeedUsageQuality(base).ok).toBe(true);
  });

  it("rejects a negative/zero quantity", () => {
    expect(checkFeedUsageQuality({ ...base, quantity: 0 }).ok).toBe(false);
  });

  it("rejects an invalid unit", () => {
    expect(checkFeedUsageQuality({ ...base, unit: "LB" }).ok).toBe(false);
  });

  it("rejects a missing feed type", () => {
    expect(checkFeedUsageQuality({ ...base, feedType: "" }).ok).toBe(false);
  });

  it("rejects an invalid date", () => {
    expect(checkFeedUsageQuality({ ...base, occurredAt: "not-a-date" }).ok).toBe(false);
  });
});

describe("checkWaterUsageQuality", () => {
  const base = {
    buildingId: "building-1",
    lotId: null,
    occurredAt: "2026-01-10T00:00:00.000Z",
    quantity: 500,
    unit: "L",
    source: "Réseau",
    dataStatus: "SIMULATION" as const,
    ...provenance,
  };

  it("accepts a well-formed record", () => {
    expect(checkWaterUsageQuality(base).ok).toBe(true);
  });

  it("rejects a negative quantity", () => {
    expect(checkWaterUsageQuality({ ...base, quantity: -1 }).ok).toBe(false);
  });

  it("flags a building mismatch against the lot's own building", () => {
    const result = checkWaterUsageQuality(base, "building-2");
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_LOT_BUILDING_RELATIONSHIP")).toBe(true);
  });

  it("warns (not errors) when REEL data has no provenance", () => {
    const result = checkWaterUsageQuality({ ...base, dataStatus: "REEL", source: null, measurementMethod: null, sourceId: null, documentId: null });
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.code === "MISSING_PROVENANCE")).toBe(true);
  });
});

describe("checkWeightMeasurementQuality", () => {
  const base = {
    lotId: "lot-1",
    occurredAt: "2026-01-10T00:00:00.000Z",
    averageWeight: 1.4,
    unit: "KG",
    sampleCount: 50,
    dataStatus: "SIMULATION" as const,
    ...provenance,
  };

  it("accepts a well-formed record", () => {
    expect(checkWeightMeasurementQuality(base).ok).toBe(true);
  });

  it("rejects a non-positive weight", () => {
    expect(checkWeightMeasurementQuality({ ...base, averageWeight: 0 }).ok).toBe(false);
  });

  it("rejects an invalid unit", () => {
    expect(checkWeightMeasurementQuality({ ...base, unit: "STONE" }).ok).toBe(false);
  });

  it("rejects a non-positive sample count when provided", () => {
    expect(checkWeightMeasurementQuality({ ...base, sampleCount: 0 }).ok).toBe(false);
  });
});

describe("checkMortalityRecordQuality", () => {
  const base = {
    lotId: "lot-1",
    occurredAt: "2026-01-10T00:00:00.000Z",
    count: 5,
    suspectedCause: "Chaleur",
    causeValidated: false,
    dataStatus: "SIMULATION" as const,
    ...provenance,
  };

  it("accepts a well-formed record", () => {
    expect(checkMortalityRecordQuality(base).ok).toBe(true);
  });

  it("rejects a non-positive count", () => {
    expect(checkMortalityRecordQuality({ ...base, count: 0 }).ok).toBe(false);
  });

  it("rejects a non-integer count", () => {
    expect(checkMortalityRecordQuality({ ...base, count: 2.5 }).ok).toBe(false);
  });

  it("rejects a future date", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(checkMortalityRecordQuality({ ...base, occurredAt: future }).ok).toBe(false);
  });
});

describe("checkEnvironmentMeasurementQuality", () => {
  const base = {
    buildingId: "building-1",
    lotId: null,
    measurementType: "TEMPERATURE" as const,
    value: 28,
    unit: "C",
    occurredAt: "2026-01-10T00:00:00.000Z",
    dataStatus: "SIMULATION" as const,
    ...provenance,
  };

  it("accepts a well-formed record", () => {
    expect(checkEnvironmentMeasurementQuality(base).ok).toBe(true);
  });

  it("rejects an unrecognized measurement type", () => {
    // @ts-expect-error deliberately invalid for the test
    const result = checkEnvironmentMeasurementQuality({ ...base, measurementType: "PRESSURE" });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_MEASUREMENT_TYPE")).toBe(true);
  });

  it("rejects a unit that doesn't match the measurement type", () => {
    expect(checkEnvironmentMeasurementQuality({ ...base, unit: "%" }).ok).toBe(false);
  });

  it("rejects a negative value", () => {
    expect(checkEnvironmentMeasurementQuality({ ...base, value: -5 }).ok).toBe(false);
  });

  it("flags a building mismatch against the lot's own building", () => {
    const result = checkEnvironmentMeasurementQuality(base, "building-2");
    expect(result.issues.some((i) => i.code === "INVALID_LOT_BUILDING_RELATIONSHIP")).toBe(true);
  });
});
