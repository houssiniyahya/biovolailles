import { describe, expect, it } from "vitest";
import { applyMortality, validateInitialPopulation } from "./population";

describe("applyMortality", () => {
  it("decreases the population by the declared quantity", () => {
    const result = applyMortality(1000, 40);
    expect(result).toEqual({ ok: true, value: 960 });
  });

  it("rejects a quantity greater than the current population", () => {
    const result = applyMortality(100, 150);
    expect(result.ok).toBe(false);
  });

  it("rejects a zero or negative quantity", () => {
    expect(applyMortality(100, 0).ok).toBe(false);
    expect(applyMortality(100, -5).ok).toBe(false);
  });

  it("rejects a non-integer quantity", () => {
    expect(applyMortality(100, 1.5).ok).toBe(false);
  });

  it("allows mortality equal to the entire current population", () => {
    const result = applyMortality(50, 50);
    expect(result).toEqual({ ok: true, value: 0 });
  });
});

describe("validateInitialPopulation", () => {
  it("accepts a positive integer", () => {
    expect(validateInitialPopulation(5000)).toEqual({ ok: true, value: 5000 });
  });

  it("rejects zero, negative, and non-integer values", () => {
    expect(validateInitialPopulation(0).ok).toBe(false);
    expect(validateInitialPopulation(-10).ok).toBe(false);
    expect(validateInitialPopulation(10.5).ok).toBe(false);
  });
});
