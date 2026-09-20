import { describe, expect, it } from "vitest";
import { AuthorizationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { recordAudit } from "./record";
import { searchAuditLog } from "./queries";

describe("searchAuditLog", () => {
  it("SUPER_ADMIN and AUDITOR (global scope) can search", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "AQ1");
    await recordAudit({
      actorId: admin.userId,
      entityType: "lot",
      entityId: "lot-aq1",
      field: "status",
      oldValue: "CREE",
      newValue: "ACTIF",
      reason: null,
      relatedLotId: null,
      relatedEventId: null,
    });

    const results = await searchAuditLog({ entityType: "lot", entityId: "lot-aq1" }, admin);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "AQ2");
    const asAuditor = await searchAuditLog({ entityType: "lot", entityId: "lot-aq1" }, auditor);
    expect(asAuditor.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a role with no AUDIT permission", async () => {
    const technician = await createTestSession("TECHNICIAN", "FARM", "some-farm", "AQ3");
    await expect(searchAuditLog({}, technician)).rejects.toThrow(AuthorizationError);

    const coopManager = await createTestSession("COOP_MANAGER", "GLOBAL", null, "AQ4");
    await expect(searchAuditLog({}, coopManager)).rejects.toThrow(AuthorizationError);
  });

  it("filters by free-text query across field/reason/values", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "AQ5");
    await recordAudit({
      actorId: admin.userId,
      entityType: "user",
      entityId: "user-aq5",
      field: "role",
      oldValue: "TECHNICIAN",
      newValue: "FARM_MANAGER",
      reason: "Promotion exceptionnelle",
      relatedLotId: null,
      relatedEventId: null,
    });

    const found = await searchAuditLog({ q: "exceptionnelle" }, admin);
    expect(found.some((e) => e.entityId === "user-aq5")).toBe(true);

    const notFound = await searchAuditLog({ q: "no-such-text-anywhere-xyz" }, admin);
    expect(notFound.some((e) => e.entityId === "user-aq5")).toBe(false);
  });
});
