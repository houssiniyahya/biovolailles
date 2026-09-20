import { describe, expect, it } from "vitest";
import { DATA_STATUS, LOT_STATUS, RELATION_TYPE, ROLE } from "./enums";

describe("shared enums", () => {
  it("DATA_STATUS contains exactly the values required to distinguish simulated from validated data", () => {
    expect(DATA_STATUS).toEqual([
      "REEL",
      "TEST",
      "SIMULATION",
      "CALCULE",
      "ESTIME",
      "A_CONFIRMER",
      "VALIDE",
      "MANQUANT",
    ]);
  });

  it("LOT_STATUS contains exactly the specified lifecycle states, in order", () => {
    expect(LOT_STATUS).toEqual([
      "PLANIFIE",
      "CREE",
      "ACTIF",
      "EN_TRANSFERT",
      "SUSPENDU",
      "BLOQUE",
      "LIBERE",
      "ABATTU",
      "TRANSFORME",
      "CLOTURE",
      "ARCHIVE",
    ]);
  });

  it("RELATION_TYPE has no duplicate edge types", () => {
    expect(new Set(RELATION_TYPE).size).toBe(RELATION_TYPE.length);
  });

  it("ROLE does not include PUBLIC — it is the absence of a session, not a role value", () => {
    expect(ROLE).not.toContain("PUBLIC");
  });
});
