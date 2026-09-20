import { describe, expect, it } from "vitest";
import {
  ageAdjustedReference,
  calculateFcr,
  calculateGrowthRatePerDay,
  calculateMortalityRate,
  filterByPeriod,
  latestWeight,
  sumQuantity,
} from "./kpi-calculations";

describe("filterByPeriod", () => {
  it("keeps only records within [from, to] inclusive", () => {
    const records = [
      { occurredAt: "2026-08-01T00:00:00.000Z" },
      { occurredAt: "2026-08-05T00:00:00.000Z" },
      { occurredAt: "2026-08-10T00:00:00.000Z" },
    ];
    const result = filterByPeriod(records, new Date("2026-08-02T00:00:00.000Z"), new Date("2026-08-09T00:00:00.000Z"));
    expect(result).toHaveLength(1);
    expect(result[0].occurredAt).toBe("2026-08-05T00:00:00.000Z");
  });
});

describe("sumQuantity", () => {
  it("sums and rounds to one decimal", () => {
    expect(sumQuantity([{ occurredAt: "x", quantity: 1.05 }, { occurredAt: "y", quantity: 2.02 }])).toBe(3.1);
  });

  it("returns 0 for an empty list", () => {
    expect(sumQuantity([])).toBe(0);
  });
});

describe("calculateMortalityRate", () => {
  it("matches the brief's own worked example: 2/200 = 1%", () => {
    expect(calculateMortalityRate(2, 200)).toBe(1);
  });

  it("returns null when the reference population is not positive", () => {
    expect(calculateMortalityRate(2, 0)).toBeNull();
    expect(calculateMortalityRate(2, -5)).toBeNull();
  });
});

describe("latestWeight", () => {
  it("returns the most recent record by occurredAt", () => {
    const records = [
      { occurredAt: "2026-08-01T00:00:00.000Z", averageWeight: 1.0 },
      { occurredAt: "2026-08-10T00:00:00.000Z", averageWeight: 1.5 },
      { occurredAt: "2026-08-05T00:00:00.000Z", averageWeight: 1.2 },
    ];
    expect(latestWeight(records)?.averageWeight).toBe(1.5);
  });

  it("returns null for an empty list", () => {
    expect(latestWeight([])).toBeNull();
  });
});

describe("calculateGrowthRatePerDay", () => {
  it("computes kg gained per day between two measurements", () => {
    const current = { occurredAt: "2026-08-08T00:00:00.000Z", averageWeight: 1.5 };
    const previous = { occurredAt: "2026-08-01T00:00:00.000Z", averageWeight: 1.0 };
    expect(calculateGrowthRatePerDay(current, previous)).toBeCloseTo(0.0714, 3); // 0.5kg / 7 days
  });

  it("returns null when the interval is not positive (same or reversed timestamps)", () => {
    const a = { occurredAt: "2026-08-01T00:00:00.000Z", averageWeight: 1.0 };
    expect(calculateGrowthRatePerDay(a, a)).toBeNull();
  });
});

describe("calculateFcr", () => {
  it("computes feed / weight gain", () => {
    expect(calculateFcr(3000, 1500)).toBe(2);
  });

  it("returns null when there is no positive weight gain (never divides by zero or a loss)", () => {
    expect(calculateFcr(3000, 0)).toBeNull();
    expect(calculateFcr(3000, -100)).toBeNull();
    expect(calculateFcr(0, 1500)).toBeNull();
  });
});

describe("ageAdjustedReference", () => {
  it("scales the previous value by the age ratio between the two periods", () => {
    // A lot twice as old now as during the reference period should have roughly double the reference feed.
    expect(ageAdjustedReference(1000, 20, 10)).toBe(2000);
  });

  it("returns null when the lot has no history yet (previousMidAgeDays <= 0)", () => {
    expect(ageAdjustedReference(1000, 10, 0)).toBeNull();
    expect(ageAdjustedReference(1000, 10, -5)).toBeNull();
  });

  it("returns null for a non-positive previous value", () => {
    expect(ageAdjustedReference(0, 20, 10)).toBeNull();
  });
});
