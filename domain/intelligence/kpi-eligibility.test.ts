import { describe, expect, it } from "vitest";
import { evaluateKpiEligibility } from "./kpi-eligibility";

describe("evaluateKpiEligibility", () => {
  it("is AVAILABLE when every record is validated/simulated data", () => {
    const result = evaluateKpiEligibility(["SIMULATION", "SIMULATION", "REEL"]);
    expect(result.eligibility).toBe("AVAILABLE");
    expect(result.reason).toBeNull();
  });

  it("is INSUFFICIENT when there is no usable record at all", () => {
    expect(evaluateKpiEligibility([]).eligibility).toBe("INSUFFICIENT");
    expect(evaluateKpiEligibility(["MANQUANT", "MANQUANT"]).eligibility).toBe("INSUFFICIENT");
  });

  it("is LIMITED (not INSUFFICIENT) when some records are usable but others are missing", () => {
    const result = evaluateKpiEligibility(["SIMULATION", "MANQUANT"]);
    expect(result.eligibility).toBe("LIMITED");
    expect(result.reason).toContain("manquant");
  });

  it("is LIMITED when a record is marked A_CONFIRMER", () => {
    const result = evaluateKpiEligibility(["SIMULATION", "A_CONFIRMER"]);
    expect(result.eligibility).toBe("LIMITED");
    expect(result.reason).toContain("confirmer");
  });

  it("reports both missing and unconfirmed records together", () => {
    const result = evaluateKpiEligibility(["SIMULATION", "MANQUANT", "A_CONFIRMER"]);
    expect(result.eligibility).toBe("LIMITED");
    expect(result.reason).toContain("manquant");
    expect(result.reason).toContain("confirmer");
  });
});
