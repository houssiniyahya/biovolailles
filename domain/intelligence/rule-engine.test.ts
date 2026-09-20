import { describe, expect, it } from "vitest";
import {
  confidenceFromDataStatus,
  evaluateFeedDeviation,
  evaluatePerformanceDecline,
  evaluatePopulationInconsistency,
  evaluateStaleSensor,
  evaluateTemperatureRange,
  type BuildingContext,
  type LotContext,
} from "./rule-engine";

const lotContext: LotContext = { lotCode: "BU-2026-001", farmName: "Ferme Al Baraka", buildingCode: "BAT-01" };
const buildingContext: BuildingContext = { farmName: "Ferme Al Baraka", buildingCode: "BAT-01" };
const RANGE = { min: 18, max: 33 };

describe("confidenceFromDataStatus", () => {
  it("maps validated/real data to HIGH", () => {
    expect(confidenceFromDataStatus("REEL")).toBe("HIGH");
    expect(confidenceFromDataStatus("VALIDE")).toBe("HIGH");
  });
  it("maps simulated/derived data to MEDIUM", () => {
    expect(confidenceFromDataStatus("SIMULATION")).toBe("MEDIUM");
    expect(confidenceFromDataStatus("CALCULE")).toBe("MEDIUM");
  });
  it("maps unconfirmed/missing data to LOW", () => {
    expect(confidenceFromDataStatus("A_CONFIRMER")).toBe("LOW");
    expect(confidenceFromDataStatus("MANQUANT")).toBe("LOW");
  });
});

describe("evaluateTemperatureRange", () => {
  it("does not trigger for a reading inside the configured range", () => {
    expect(evaluateTemperatureRange({ value: 27, capturedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION" }, buildingContext, RANGE)).toBeNull();
  });

  it("triggers WARNING for a small breach above the max", () => {
    const trigger = evaluateTemperatureRange({ value: 35, capturedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION" }, buildingContext, RANGE);
    expect(trigger?.ruleCode).toBe("TEMPERATURE_OUT_OF_RANGE");
    expect(trigger?.severity).toBe("WARNING");
    expect(trigger?.observedValue).toBe(35);
    expect(trigger?.explanation.what).toContain("Température");
  });

  it("triggers CRITICAL for a large breach, and correctly identifies a below-minimum breach", () => {
    const trigger = evaluateTemperatureRange({ value: 12, capturedAt: "2026-08-01T00:00:00.000Z", dataStatus: "SIMULATION" }, buildingContext, RANGE);
    expect(trigger?.severity).toBe("CRITICAL");
    expect(trigger?.referenceValue).toBe(18);
    expect(trigger?.explanation.whatChanged).toContain("minimale");
  });
});

describe("evaluateFeedDeviation", () => {
  it("does not trigger when current feed is at or below the threshold above reference", () => {
    expect(evaluateFeedDeviation(1100, 1000, lotContext, "7 derniers jours", "SIMULATION", 15)).toBeNull(); // +10%
  });

  it("triggers WARNING when the deviation clears the threshold", () => {
    const trigger = evaluateFeedDeviation(1200, 1000, lotContext, "7 derniers jours", "SIMULATION", 15); // +20%
    expect(trigger?.ruleCode).toBe("FEED_DEVIATION_ABOVE_REFERENCE");
    expect(trigger?.severity).toBe("WARNING");
    expect(trigger?.deviationPercent).toBe(20);
    expect(trigger?.explanation.byHowMuch).toContain("+20%");
  });

  it("triggers CRITICAL for a very large deviation", () => {
    const trigger = evaluateFeedDeviation(3500, 1000, lotContext, "7 derniers jours", "SIMULATION", 15); // +250%
    expect(trigger?.severity).toBe("CRITICAL");
  });

  it("never triggers on a non-positive reference (insufficient data, not a fabricated deviation)", () => {
    expect(evaluateFeedDeviation(1200, 0, lotContext, "7 derniers jours", "SIMULATION", 15)).toBeNull();
  });
});

describe("evaluatePerformanceDecline", () => {
  const config = { feedThresholdPercent: 10, growthDeclineThresholdPercent: 10 };

  it("requires BOTH conditions — feed up alone does not trigger", () => {
    expect(evaluatePerformanceDecline(25, -2, lotContext, "7 derniers jours", "SIMULATION", config)).toBeNull();
  });

  it("requires BOTH conditions — growth decline alone does not trigger", () => {
    expect(evaluatePerformanceDecline(2, -25, lotContext, "7 derniers jours", "SIMULATION", config)).toBeNull();
  });

  it("triggers when feed is up AND growth is down together (the hero scenario shape)", () => {
    const trigger = evaluatePerformanceDecline(22.1, -30.2, lotContext, "7 derniers jours", "SIMULATION", config);
    expect(trigger?.ruleCode).toBe("PERFORMANCE_DECLINE");
    expect(trigger?.explanation.whatChanged).toContain("ralentissait");
    expect(trigger?.explanation.byHowMuch).toContain("+22.1%");
  });

  it("escalates to CRITICAL for a severe growth decline", () => {
    const trigger = evaluatePerformanceDecline(22.1, -30.2, lotContext, "7 derniers jours", "SIMULATION", config);
    expect(trigger?.severity).toBe("CRITICAL"); // -30.2 < -20 (2x threshold)
  });

  it("stays WARNING for a mild-but-qualifying growth decline", () => {
    const trigger = evaluatePerformanceDecline(15, -12, lotContext, "7 derniers jours", "SIMULATION", config);
    expect(trigger?.severity).toBe("WARNING");
  });
});

describe("evaluatePopulationInconsistency", () => {
  const baseReconciliation = {
    initialPopulation: 15000,
    totalMortality: 100,
    totalExits: 0,
    totalEntries: 0,
    expectedPopulation: 14900,
    recordedPopulation: 14890,
    consistent: false,
    difference: -10,
  };

  it("does not trigger when the reconciliation is consistent", () => {
    expect(evaluatePopulationInconsistency({ ...baseReconciliation, consistent: true, difference: 0 }, lotContext, "SIMULATION", "2026-08-16T00:00:00.000Z")).toBeNull();
  });

  it("triggers WARNING for a small discrepancy", () => {
    const trigger = evaluatePopulationInconsistency(baseReconciliation, lotContext, "SIMULATION", "2026-08-16T00:00:00.000Z");
    expect(trigger?.ruleCode).toBe("POPULATION_INCONSISTENCY");
    expect(trigger?.severity).toBe("WARNING");
    expect(trigger?.explanation.byHowMuch).toContain("-10");
  });

  it("triggers CRITICAL for a discrepancy exceeding 1% of the initial population", () => {
    const large = { ...baseReconciliation, expectedPopulation: 15000, recordedPopulation: 14700, difference: -300 };
    const trigger = evaluatePopulationInconsistency(large, lotContext, "SIMULATION", "2026-08-16T00:00:00.000Z");
    expect(trigger?.severity).toBe("CRITICAL");
  });
});

describe("evaluateStaleSensor", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("does not trigger for a reading within the freshness threshold", () => {
    expect(evaluateStaleSensor({ capturedAt: "2026-08-16T11:30:00.000Z", dataStatus: "SIMULATION" }, buildingContext, now, 60)).toBeNull();
  });

  it("triggers WARNING for a reading older than the threshold, reusing the phase-4 quality check", () => {
    const trigger = evaluateStaleSensor({ capturedAt: "2026-08-16T08:00:00.000Z", dataStatus: "SIMULATION" }, buildingContext, now, 60);
    expect(trigger?.ruleCode).toBe("STALE_SENSOR_DATA");
    expect(trigger?.severity).toBe("WARNING");
    expect(trigger?.observedValue).toBe(240); // 4 hours = 240 minutes
  });
});
