import { beforeAll, describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { DEMO_ACCOUNT_EMAIL } from "../../data/seed/generators/hierarchy";
import { seedDatabase } from "../../data/seed/seed-database";
import { AuthorizationError } from "../../domain/shared/errors";
import type { Session } from "../auth/session";
import { createTestSession } from "../production/test-support";
import { runDemoHealthChecks } from "./health";

function check(report: Awaited<ReturnType<typeof runDemoHealthChecks>>, key: string) {
  const found = report.checks.find((c) => c.key === key);
  if (!found) throw new Error(`Missing health check "${key}"`);
  return found;
}

describe("runDemoHealthChecks — access control", () => {
  it("is refused to every role except SUPER_ADMIN (SETTINGS is admin-only)", async () => {
    for (const role of ["COOP_MANAGER", "PRODUCER", "FARM_MANAGER", "TECHNICIAN", "AUDITOR"] as const) {
      const session = await createTestSession(role, "GLOBAL", null, `HC-${role}`);
      await expect(runDemoHealthChecks(session)).rejects.toThrow(AuthorizationError);
    }
  });
});

describe("runDemoHealthChecks — on an unseeded database", () => {
  it("reports real failures rather than a hardcoded OK", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "HC-EMPTY");
    const report = await runDemoHealthChecks(admin);

    expect(check(report, "database").status).toBe("OK"); // the connection genuinely works
    expect(check(report, "seed").status).toBe("FAIL");
    expect(check(report, "hero-lot").status).toBe("FAIL");
    expect(report.failCount).toBeGreaterThan(0);
    expect(report.heroLotId).toBeNull();
  });
});

describe("runDemoHealthChecks — on the seeded hero scenario", () => {
  let admin: Session;

  beforeAll(async () => {
    await seedDatabase();
    const user = await repositories.users.findByEmail(DEMO_ACCOUNT_EMAIL.SUPER_ADMIN);
    admin = { userId: user!.id, role: "SUPER_ADMIN", scopeType: "GLOBAL", scopeId: null, isDemoSwitch: false };
  }, 120_000);

  it("passes every stage of the end-to-end chain", async () => {
    const report = await runDemoHealthChecks(admin);

    for (const key of ["database", "seed", "hero-lot", "iot", "kpi", "anomaly", "alert", "action", "traceability", "qr", "rbac", "audit"]) {
      const result = check(report, key);
      expect.soft(result.status, `${key}: ${result.detail}`).toBe("OK");
    }
    expect(report.failCount).toBe(0);
    expect(report.heroLotId).not.toBeNull();
  }, 120_000);

  it("reports integrity from the real engine, with zero CRITICAL issues", async () => {
    const report = await runDemoHealthChecks(admin);
    const integrity = check(report, "integrity");

    // The release-candidate bar (phase-13 brief §4): any CRITICAL anywhere fails this check.
    // The seed's deliberate quality defects are WARNING-level, so OK is the steady state and
    // a regression to WARN/FAIL means real corruption entered the dataset.
    expect(integrity.status, integrity.detail).toBe("OK");
    expect(integrity.detail).toContain("aucun problème critique");
    // ...but the engine must still be finding the deliberate defects, not reporting a
    // suspiciously flawless dataset.
    expect(integrity.detail).toMatch(/avertissement/);
  }, 120_000);

  it("states measured facts in every detail line, never a bare label", async () => {
    const report = await runDemoHealthChecks(admin);
    for (const c of report.checks) {
      expect(c.detail.length).toBeGreaterThan(10);
      expect(c.detail).not.toBe(c.label);
    }
  }, 120_000);
});
