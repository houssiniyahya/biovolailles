import { describe, expect, it } from "vitest";
import { canTransition, validateTransition } from "./lot-lifecycle";

describe("lot lifecycle transitions", () => {
  it("allows PLANIFIE -> CREE", () => {
    expect(canTransition("PLANIFIE", "CREE")).toBe(true);
  });

  it("allows ACTIF -> ABATTU", () => {
    expect(canTransition("ACTIF", "ABATTU")).toBe(true);
  });

  it("rejects a lot coming back to life from ARCHIVE", () => {
    expect(canTransition("ARCHIVE", "ACTIF")).toBe(false);
  });

  it("rejects skipping straight from PLANIFIE to ABATTU", () => {
    expect(canTransition("PLANIFIE", "ABATTU")).toBe(false);
  });

  it("validateTransition rejects a same-status transition with an explanatory message", () => {
    const result = validateTransition("ACTIF", "ACTIF");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("déjà");
    }
  });

  it("validateTransition succeeds for a legal transition", () => {
    const result = validateTransition("BLOQUE", "LIBERE");
    expect(result.ok).toBe(true);
  });
});
