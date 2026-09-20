import { describe, expect, it } from "vitest";
import { computeTrend, MIN_TREND_OBSERVATIONS } from "./trend";

describe("computeTrend", () => {
  it("reports INCREASING when the deviation exceeds the stable band", () => {
    const result = computeTrend(120, 100, 5);
    expect(result.direction).toBe("INCREASING");
    expect(result.deviationPercent).toBe(20);
  });

  it("reports DECREASING for a clear negative deviation", () => {
    const result = computeTrend(80, 100, 5);
    expect(result.direction).toBe("DECREASING");
    expect(result.deviationPercent).toBe(-20);
  });

  it("reports STABLE for a small move within the band (not manufactured from noise)", () => {
    const result = computeTrend(101, 100, 5);
    expect(result.direction).toBe("STABLE");
  });

  it("refuses to claim a trend without enough observations", () => {
    const result = computeTrend(200, 100, MIN_TREND_OBSERVATIONS - 1);
    expect(result.direction).toBe("INSUFFICIENT_DATA");
    expect(result.deviationPercent).toBeNull();
  });

  it("refuses to claim a trend when either value is missing", () => {
    expect(computeTrend(null, 100, 5).direction).toBe("INSUFFICIENT_DATA");
    expect(computeTrend(100, null, 5).direction).toBe("INSUFFICIENT_DATA");
  });

  it("refuses to divide by a zero reference", () => {
    expect(computeTrend(100, 0, 5).direction).toBe("INSUFFICIENT_DATA");
  });
});
