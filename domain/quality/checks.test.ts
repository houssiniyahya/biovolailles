import { describe, expect, it } from "vitest";
import {
  checkLotBuildingRelationship,
  checkNonNegative,
  checkPositive,
  checkProvenance,
  checkRequired,
  checkValidDataStatus,
  checkValidDate,
  checkValidUnit,
  collectIssues,
  findDuplicateAt,
} from "./checks";

describe("checkRequired", () => {
  it("flags null, undefined, and empty string", () => {
    expect(checkRequired(null, "f", "Field")?.code).toBe("MISSING_REQUIRED_FIELD");
    expect(checkRequired(undefined, "f", "Field")?.code).toBe("MISSING_REQUIRED_FIELD");
    expect(checkRequired("", "f", "Field")?.code).toBe("MISSING_REQUIRED_FIELD");
  });

  it("passes a present value", () => {
    expect(checkRequired("value", "f", "Field")).toBeNull();
    expect(checkRequired(0, "f", "Field")).toBeNull();
  });
});

describe("checkPositive / checkNonNegative", () => {
  it("rejects zero and negative for checkPositive", () => {
    expect(checkPositive(0, "f", "Field")?.code).toBe("INVALID_QUANTITY");
    expect(checkPositive(-5, "f", "Field")?.code).toBe("INVALID_QUANTITY");
  });

  it("accepts positive for checkPositive", () => {
    expect(checkPositive(1, "f", "Field")).toBeNull();
  });

  it("checkNonNegative rejects negative only", () => {
    expect(checkNonNegative(-1, "f", "Field")?.code).toBe("NEGATIVE_QUANTITY");
    expect(checkNonNegative(0, "f", "Field")).toBeNull();
  });
});

describe("checkValidDate", () => {
  it("rejects an unparsable date", () => {
    expect(checkValidDate("not-a-date", "f", "Date")?.code).toBe("INVALID_DATE");
  });

  it("rejects a future date when notFuture is set", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(checkValidDate(future, "f", "Date", { notFuture: true })?.code).toBe("INVALID_DATE");
  });

  it("warns (not errors) when a date precedes the lot start", () => {
    const issue = checkValidDate("2026-01-01T00:00:00.000Z", "f", "Date", { notBefore: "2026-02-01T00:00:00.000Z" });
    expect(issue?.severity).toBe("warning");
    expect(issue?.code).toBe("DATE_BEFORE_LOT_START");
  });

  it("passes a valid, in-range date", () => {
    expect(checkValidDate("2026-01-15T00:00:00.000Z", "f", "Date", { notBefore: "2026-01-01T00:00:00.000Z" })).toBeNull();
  });
});

describe("checkValidUnit", () => {
  it("rejects a unit outside the allowed list", () => {
    expect(checkValidUnit("LB", ["KG", "G"])?.code).toBe("INVALID_UNIT");
  });

  it("accepts an allowed unit", () => {
    expect(checkValidUnit("KG", ["KG", "G"])).toBeNull();
  });
});

describe("checkValidDataStatus", () => {
  it("rejects a status outside the allowed set", () => {
    expect(checkValidDataStatus("BOGUS", ["REEL", "SIMULATION"])?.code).toBe("INVALID_STATUS");
  });
});

describe("checkProvenance", () => {
  it("warns when REEL/VALIDE data has no source, document, or method", () => {
    const issue = checkProvenance({ sourceId: null, documentId: null, measurementMethod: null, dataStatus: "REEL" });
    expect(issue?.code).toBe("MISSING_PROVENANCE");
    expect(issue?.severity).toBe("warning");
  });

  it("does not require provenance for SIMULATION data", () => {
    expect(checkProvenance({ sourceId: null, documentId: null, measurementMethod: null, dataStatus: "SIMULATION" })).toBeNull();
  });

  it("passes REEL data that has at least one provenance pointer", () => {
    expect(checkProvenance({ sourceId: "src-1", documentId: null, measurementMethod: null, dataStatus: "REEL" })).toBeNull();
  });
});

describe("checkLotBuildingRelationship", () => {
  it("flags a record's building that doesn't match the lot's building", () => {
    expect(checkLotBuildingRelationship("building-A", "building-B")?.code).toBe("INVALID_LOT_BUILDING_RELATIONSHIP");
  });

  it("passes a matching building, or no building specified", () => {
    expect(checkLotBuildingRelationship("building-A", "building-A")).toBeNull();
    expect(checkLotBuildingRelationship("building-A", null)).toBeNull();
  });
});

describe("findDuplicateAt", () => {
  it("flags an existing record at the exact same timestamp", () => {
    const existing = [{ occurredAt: "2026-01-01T00:00:00.000Z" }];
    expect(findDuplicateAt(existing, "2026-01-01T00:00:00.000Z")?.code).toBe("POSSIBLE_DUPLICATE");
  });

  it("passes a distinct timestamp", () => {
    const existing = [{ occurredAt: "2026-01-01T00:00:00.000Z" }];
    expect(findDuplicateAt(existing, "2026-01-02T00:00:00.000Z")).toBeNull();
  });
});

describe("collectIssues", () => {
  it("ok is false when any issue is severity=error", () => {
    const result = collectIssues(null, { severity: "error", code: "X", message: "m" });
    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(1);
  });

  it("ok is true when only warnings are present", () => {
    const result = collectIssues({ severity: "warning", code: "X", message: "m" });
    expect(result.ok).toBe(true);
  });

  it("ok is true with no issues at all", () => {
    expect(collectIssues(null, null)).toEqual({ ok: true, issues: [] });
  });
});
