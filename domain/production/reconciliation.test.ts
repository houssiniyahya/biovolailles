import { describe, expect, it } from "vitest";
import { reconcilePopulation } from "./reconciliation";

describe("reconcilePopulation", () => {
  it("is consistent when recorded population matches the derived history", () => {
    const result = reconcilePopulation({
      initialPopulation: 1000,
      totalMortality: 40,
      totalExits: 0,
      totalEntries: 0,
      recordedPopulation: 960,
    });
    expect(result.consistent).toBe(true);
    expect(result.expectedPopulation).toBe(960);
    expect(result.difference).toBe(0);
  });

  it("detects an inconsistency without silently correcting it — phase-3 brief §14 example", () => {
    const result = reconcilePopulation({
      initialPopulation: 200,
      totalMortality: 6,
      totalExits: 0,
      totalEntries: 0,
      recordedPopulation: 197,
    });
    expect(result.expectedPopulation).toBe(194);
    expect(result.recordedPopulation).toBe(197);
    expect(result.consistent).toBe(false);
    expect(result.difference).toBe(3);
  });

  it("accounts for exits and entries in the formula", () => {
    const result = reconcilePopulation({
      initialPopulation: 1000,
      totalMortality: 20,
      totalExits: 50,
      totalEntries: 10,
      recordedPopulation: 940,
    });
    expect(result.expectedPopulation).toBe(940);
    expect(result.consistent).toBe(true);
  });
});
