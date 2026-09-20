import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError } from "../../domain/shared/errors";
import { createFeedUsageRecord } from "../production/data-records";
import { createLot } from "../production/lot";
import { createTestSession } from "../production/test-support";
import { acknowledgeIntegrityIssue } from "./acknowledge";
import { runIntegrityChecks } from "./checks";

async function seedLotWithMismatch(suffix: string, admin: Awaited<ReturnType<typeof createTestSession>>) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const lot = await createLot(
    { code: `LOT-${suffix}`, buildingId: building.id, species: "Poulet", breed: "Ross", initialPopulation: 5000, plannedStartAt: null, dataStatus: "SIMULATION" },
    admin
  );
  await createFeedUsageRecord(
    lot.id,
    { occurredAt: "2026-08-01T00:00:00.000Z", quantity: 50, unit: "KG", feedType: "Démarrage", dataStatus: "REEL", sourceType: "SIMULATEUR" },
    admin
  );
  return lot;
}

describe("acknowledgeIntegrityIssue", () => {
  it("SUPER_ADMIN can acknowledge — writes exactly one audit entry, doesn't remove the issue from the next report", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "AK1");
    await seedLotWithMismatch("AK1", admin);

    const before = await runIntegrityChecks(admin);
    const issue = before.issues.find((i) => i.code === "T09_REAL_SIMULATION_MISMATCH");
    expect(issue).toBeDefined();
    expect(issue!.status).toBe("OPEN");

    await acknowledgeIntegrityIssue(issue!, admin, "Vu, correction prévue");

    const auditEntries = await repositories.auditLog.search({ entityType: "integrity_issue", entityId: `${issue!.code}:${issue!.entityType}:${issue!.entityId}` });
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].reason).toBe("Vu, correction prévue");

    // Acknowledging does NOT fix or hide the underlying condition — it still appears, now flagged ACKNOWLEDGED.
    const after = await runIntegrityChecks(admin);
    const stillThere = after.issues.find((i) => i.code === "T09_REAL_SIMULATION_MISMATCH" && i.entityId === issue!.entityId);
    expect(stillThere).toBeDefined();
    expect(stillThere!.status).toBe("ACKNOWLEDGED");
  });

  it("AUDITOR (read-only on INTEGRITY) cannot acknowledge", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "AK2");
    const lot = await seedLotWithMismatch("AK2", admin);
    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "AK2b");

    await expect(
      acknowledgeIntegrityIssue(
        { code: "T09_REAL_SIMULATION_MISMATCH", entityType: "LOT", entityId: lot.id, description: "x" },
        auditor
      )
    ).rejects.toThrow(AuthorizationError);
  });
});
