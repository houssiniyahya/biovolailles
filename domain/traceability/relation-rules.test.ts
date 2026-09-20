import { describe, expect, it } from "vitest";
import { isRelationAllowed } from "./relation-rules";

describe("isRelationAllowed", () => {
  it("allows the documented pairs for each relation type", () => {
    expect(isRelationAllowed("COLLECTE_DE", "COLLECTION", "LOT")).toBe(true);
    expect(isRelationAllowed("ABATTU_DEPUIS", "SLAUGHTER_BATCH", "COLLECTION")).toBe(true);
    expect(isRelationAllowed("ABATTU_DEPUIS", "SLAUGHTER_BATCH", "LOT")).toBe(true);
    expect(isRelationAllowed("TRANSFORME_DEPUIS", "TRANSFORMATION_BATCH", "SLAUGHTER_BATCH")).toBe(true);
    expect(isRelationAllowed("TRANSFORME_DEPUIS", "TRANSFORMATION_BATCH", "TRANSFORMATION_BATCH")).toBe(true);
    expect(isRelationAllowed("CONDITIONNE_DEPUIS", "PRODUCT", "TRANSFORMATION_BATCH")).toBe(true);
    expect(isRelationAllowed("DESTINE_A", "PRODUCT", "DESTINATION")).toBe(true);
  });

  it("rejects a pair swapped in the wrong direction", () => {
    expect(isRelationAllowed("COLLECTE_DE", "LOT", "COLLECTION")).toBe(false);
  });

  it("rejects a pair that doesn't match the relation's semantics", () => {
    expect(isRelationAllowed("COLLECTE_DE", "PRODUCT", "DESTINATION")).toBe(false);
    expect(isRelationAllowed("DESTINE_A", "COLLECTION", "LOT")).toBe(false);
  });

  it("rejects a relation type this phase doesn't implement yet (not silently permissive)", () => {
    expect(isRelationAllowed("PROVIENT_DE", "LOT", "COLLECTION")).toBe(false);
    expect(isRelationAllowed("CERTIFIE_PAR", "PRODUCT", "DESTINATION")).toBe(false);
  });
});
